import { useState } from "react";
import type { BchNetwork } from "../bch/address";
import { DUST_SATS, RECOMMENDED_DEMO_SATS } from "../constants";
import { buildPaymentTx, paymentInputPaths, signedTxHex } from "../bch/payment";
import { broadcastTransaction, fetchUtxosForAddress, totalSats } from "../bch/utxo";
import { decodeTransactionBCH, hexToBin } from "@bitauth/libauth";
import type { ConnectedWallet } from "../wallet/types";
import { BindingCard, } from "./Lookup";
import { lookupName, type LookupHit } from "./lookupUtil";

export function Send(props: { network: BchNetwork; wallet: ConnectedWallet | null }) {
  const [input, setInput] = useState("");
  const [amount, setAmount] = useState("0.0001");
  const [hits, setHits] = useState<LookupHit[]>([]);
  const [chosen, setChosen] = useState<LookupHit | null>(null);
  const [log, setLog] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolve() {
    setLog("");
    setChosen(null);
    setBusy(true);
    try {
      const result = await lookupName(input);
      setHits(result.hits);
      setChosen(result.hits[0] ?? null);
      if (result.hits.length === 0) setLog(result.errors.join("\n") || "No verified binding found.");
    } catch (err) {
      setLog(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function parseAmountSats(): bigint {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) throw new Error("enter a positive BCH amount");
    return BigInt(Math.round(n * 1e8));
  }

  async function pay() {
    if (!chosen) return setLog("Look up a handle first.");
    if (!props.wallet) return setLog("Connect the wallet you will pay from.");
    setBusy(true);
    setLog("");
    try {
      const sats = parseAmountSats();
      if (sats < DUST_SATS) throw new Error(`minimum is ${DUST_SATS} sats`);
      const utxos = await fetchUtxosForAddress(props.wallet.address, props.network);
      if (utxos.length === 0) {
        throw new Error(
          `No UTXOs on ${props.wallet.address}. For a mainnet demo, send about ${RECOMMENDED_DEMO_SATS} sats (0.0001 BCH) to that address first.`,
        );
      }
      setLog(`Found ${utxos.length} UTXO(s), ${totalSats(utxos)} sats available.`);
      const built = buildPaymentTx({
        utxos,
        toAddress: chosen.binding.bchAddress,
        amountSatoshis: sats,
        changeAddress: props.wallet.address,
      });
      const signed = await props.wallet.signTransaction({
        transaction: built.transaction,
        sourceOutputs: built.sourceOutputs,
        inputPaths: paymentInputPaths(utxos),
        broadcast: props.wallet.kind === "wizard",
        userPrompt: `Send ${amount} BCH to ${chosen.binding.handle}.bch (${chosen.binding.bchAddress})`,
      });
      const decoded = decodeTransactionBCH(hexToBin(signed.signedHex));
      if (typeof decoded === "string") throw new Error(decoded);
      let txid = "";
      if (props.wallet.kind === "local" || props.network === "chipnet") {
        try {
          txid = await broadcastTransaction(signed.signedHex, props.network);
        } catch (err) {
          setLog(
            `Signed, but broadcast failed: ${err instanceof Error ? err.message : String(err)}\n` +
              `Transaction hex:\n${signed.signedHex}`,
          );
          return;
        }
      }
      setLog(
        `Payment signed` +
          (txid ? ` and broadcast as ${txid}` : " (wallet was asked to broadcast)") +
          `.\n${signedTxHex({ ...built, transaction: decoded })}`,
      );
    } catch (err) {
      setLog(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1>Pay a handle</h1>
      <p className="lede">
        Look up a verified CashName, then send BCH. This is the useful mainnet transaction the
        hackathon asks for.
      </p>
      <label>Handle or npub</label>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="alice.bch" />
      <p>
        <button type="button" onClick={() => void resolve()} disabled={busy}>
          Look up
        </button>
      </p>
      {hits.length > 1 && (
        <label>
          Multiple bindings found
          <select
            value={chosen?.event.id ?? ""}
            onChange={(e) => setChosen(hits.find((h) => h.event.id === e.target.value) ?? null)}
          >
            {hits.map((h) => (
              <option key={h.event.id} value={h.event.id}>
                {h.binding.handle} · {h.binding.bchAddress.slice(0, 20)}…
              </option>
            ))}
          </select>
        </label>
      )}
      {chosen && <BindingCard hit={chosen} />}
      <label>Amount (BCH)</label>
      <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <p className="muted">0.0001 BCH is enough for a demo. Dust limit is {DUST_SATS.toString()} sats.</p>
      <p>
        <button className="ember" type="button" disabled={busy} onClick={() => void pay()}>
          {busy ? "Working…" : "Send BCH"}
        </button>
      </p>
      {log && <pre className="output">{log}</pre>}
    </section>
  );
}
