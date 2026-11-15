import type { BchNetwork } from "./address";
import type { Utxo } from "./payment";

export type AddressQuery = {
  address: string;
  path?: { name: "receive" | "change"; index: number };
};

function sat(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.trunc(v));
  if (typeof v === "string") return BigInt(v);
  throw new Error("bad satoshi value");
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/** Blockchair dashboard, no API key required for light use. Mainnet only. */
async function utxosFromBlockchair(address: string): Promise<Utxo[]> {
  const url = `https://api.blockchair.com/bitcoin-cash/dashboards/address/${address}?limit=100`;
  const body = (await getJson(url)) as {
    data?: Record<string, { utxo?: Array<{ transaction_hash: string; index: number; value: number }> }>;
  };
  const entry = body.data?.[address] ?? body.data?.[Object.keys(body.data ?? {})[0] ?? ""];
  const rows = entry?.utxo ?? [];
  return rows.map((row) => ({
    txid: row.transaction_hash,
    vout: row.index,
    valueSatoshis: sat(row.value),
    address,
  }));
}

async function utxosFromChronik(base: string, address: string): Promise<Utxo[]> {
  const url = `${base.replace(/\/$/, "")}/address/${address}/utxos`;
  const body = (await getJson(url)) as {
    utxos?: Array<{ outpoint?: { txid: string; outIdx: number }; value: string | number }>;
    // some nodes wrap in { outputScripts: [...] }
  };
  const rows = Array.isArray(body)
    ? (body as Array<{ outpoint?: { txid: string; outIdx: number }; value: string | number }>)
    : (body.utxos ?? []);
  return rows
    .map((row) => {
      const txid = row.outpoint?.txid;
      const vout = row.outpoint?.outIdx;
      if (!txid || vout === undefined) return null;
      return {
        txid: txid.length === 64 ? txid : txid,
        vout,
        valueSatoshis: sat(row.value),
        address,
      };
    })
    .filter((u): u is Utxo => u !== null);
}

const CHRONIK_BASES: Record<BchNetwork, string[]> = {
  mainnet: [
    "https://chronik.pay2stay.com/bch",
    "https://bch.paybutton.org",
  ],
  chipnet: [
    "https://chipnet.bch.ninja/chronik",
  ],
};

export async function fetchUtxosForAddress(address: string, network: BchNetwork): Promise<Utxo[]> {
  const errors: string[] = [];
  if (network === "mainnet") {
    try {
      return await utxosFromBlockchair(address);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  for (const base of CHRONIK_BASES[network]) {
    try {
      return await utxosFromChronik(base, address);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(`could not fetch UTXOs: ${errors.join("; ") || "no provider"}`);
}

export async function fetchUtxos(queries: AddressQuery[], network: BchNetwork): Promise<Utxo[]> {
  const out: Utxo[] = [];
  for (const q of queries) {
    try {
      const found = await fetchUtxosForAddress(q.address, network);
      out.push(...found.map((u) => ({ ...u, path: q.path })));
    } catch {
      // keep going; an empty address is normal while scanning a gap
    }
  }
  return out;
}

export function totalSats(utxos: Utxo[]): bigint {
  return utxos.reduce((sum, u) => sum + u.valueSatoshis, 0n);
}

export async function broadcastTransaction(hex: string, network: BchNetwork): Promise<string> {
  if (network === "mainnet") {
    const res = await fetch("https://api.blockchair.com/bitcoin-cash/push/transaction", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: hex }),
    });
    const body = (await res.json()) as { data?: { transaction_hash?: string }; context?: { error?: string } };
    const txid = body.data?.transaction_hash;
    if (txid) return txid;
    throw new Error(body.context?.error || `broadcast failed (${res.status})`);
  }
  throw new Error("chipnet broadcast is not wired to a public endpoint yet; use a wallet broadcast");
}
