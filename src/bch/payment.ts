import {
  decodeCashAddress,
  decodeTransactionBCH,
  hexToBin,
  type Output,
  type Transaction,
} from "@bitauth/libauth";
import { DUST_SATS, FEE_RATE_SAT_PER_BYTE } from "../constants";
import { lockingBytecodeFromAddress, standardFromAddress } from "./address";
import {
  builtFrom,
  encodeTxHex,
  signInputP2pkh,
  unsignedInput,
  type BuiltTx,
} from "./signP2pkh";

export type Utxo = {
  txid: string; // hex, UI/big-endian (explorer) order
  vout: number;
  valueSatoshis: bigint;
  address: string;
  /** WizardConnect HD path, when known. */
  path?: { name: "receive" | "change"; index: number };
};

export function explorerTxidToOutpointHash(txid: string): Uint8Array {
  const bin = hexToBin(txid);
  if (bin.length !== 32) throw new Error("txid must be 32 bytes");
  return bin.slice().reverse();
}

export function estimateSize(inputCount: number, outputCount: number): bigint {
  // P2PKH ~148 bytes per input, ~34 per output, plus ~10 byte overhead.
  return 10n + BigInt(inputCount) * 148n + BigInt(outputCount) * 34n;
}

export function estimateFee(inputCount: number, outputCount: number): bigint {
  const fee = estimateSize(inputCount, outputCount) * FEE_RATE_SAT_PER_BYTE;
  return fee < 200n ? 200n : fee;
}

export function selectUtxos(utxos: Utxo[], amount: bigint): { chosen: Utxo[]; fee: bigint; change: bigint } {
  const sorted = [...utxos].filter((u) => u.valueSatoshis > 0n).sort((a, b) => Number(a.valueSatoshis - b.valueSatoshis));
  const chosen: Utxo[] = [];
  let total = 0n;
  for (const utxo of sorted) {
    chosen.push(utxo);
    total += utxo.valueSatoshis;
    const feeOneOutput = estimateFee(chosen.length, 1);
    if (total === amount + feeOneOutput) {
      return { chosen, fee: feeOneOutput, change: 0n };
    }
    const feeTwo = estimateFee(chosen.length, 2);
    const change = total - amount - feeTwo;
    if (change >= DUST_SATS) return { chosen, fee: feeTwo, change };
    if (change >= 0n && change < DUST_SATS) {
      // fold dust into the fee, single output
      if (total >= amount + feeOneOutput) {
        return { chosen, fee: total - amount, change: 0n };
      }
    }
  }
  throw new Error("not enough funds to cover the payment and the network fee");
}

export function buildPaymentTx(params: {
  utxos: Utxo[];
  toAddress: string;
  amountSatoshis: bigint;
  changeAddress: string;
}): BuiltTx {
  if (params.amountSatoshis < DUST_SATS) {
    throw new Error(`amount is below the dust limit (${DUST_SATS} sats)`);
  }
  const decoded = decodeCashAddress(params.toAddress);
  if (typeof decoded === "string") throw new Error(decoded);
  const { chosen, change } = selectUtxos(params.utxos, params.amountSatoshis);
  const sourceOutputs: Output[] = chosen.map((u) => ({
    valueSatoshis: u.valueSatoshis,
    lockingBytecode: lockingBytecodeFromAddress(u.address),
  }));
  const outputs: Output[] = [
    {
      valueSatoshis: params.amountSatoshis,
      lockingBytecode: lockingBytecodeFromAddress(standardFromAddress(params.toAddress)),
    },
  ];
  if (change > 0n) {
    outputs.push({
      valueSatoshis: change,
      lockingBytecode: lockingBytecodeFromAddress(params.changeAddress),
    });
  }
  const transaction: Transaction = {
    version: 2,
    locktime: 0,
    inputs: chosen.map((u) => unsignedInput(explorerTxidToOutpointHash(u.txid), u.vout)),
    outputs,
  };
  return builtFrom(transaction, sourceOutputs);
}

export function signPaymentTx(
  built: BuiltTx,
  signInput: (inputIndex: number, transaction: Transaction, sourceOutputs: Output[]) => Transaction,
): BuiltTx {
  let tx = built.transaction;
  for (let i = 0; i < built.transaction.inputs.length; i += 1) {
    tx = signInput(i, tx, built.sourceOutputs);
  }
  return builtFrom(tx, built.sourceOutputs);
}

export function signPaymentWithKey(
  built: BuiltTx,
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): BuiltTx {
  return signPaymentTx(built, (index, tx, sources) =>
    signInputP2pkh(tx, sources, index, privateKey, publicKey),
  );
}

export function paymentInputPaths(utxos: Utxo[]): [number, "receive" | "change", number][] {
  return utxos.map((u, i) => [i, u.path?.name ?? "receive", u.path?.index ?? 0]);
}

export function decodeSignedTx(hex: string): Transaction {
  const decoded = decodeTransactionBCH(hexToBin(hex));
  if (typeof decoded === "string") throw new Error(decoded);
  return decoded;
}

export function signedTxHex(built: BuiltTx): string {
  return encodeTxHex(built.transaction);
}
