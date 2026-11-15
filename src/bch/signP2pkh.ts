import {
  binToHex,
  encodeDataPush,
  encodeTransaction,
  flattenBinArray,
  generateSigningSerializationBCH,
  hash256,
  secp256k1,
  SigningSerializationType,
  type Input,
  type Output,
  type Transaction,
} from "@bitauth/libauth";
import { SIGHASH_ALL_FORKID } from "../constants";

const SIGHASH_TYPE = Uint8Array.of(SigningSerializationType.allOutputs);

export type BuiltTx = {
  transaction: Transaction;
  sourceOutputs: Output[];
  hex: string;
};

export function p2pkhUnlockingBytecode(signatureDer: Uint8Array, publicKey: Uint8Array): Uint8Array {
  const sigWithType = flattenBinArray([signatureDer, Uint8Array.of(SIGHASH_ALL_FORKID)]);
  return flattenBinArray([encodeDataPush(sigWithType), encodeDataPush(publicKey)]);
}

export function sighashForInput(
  transaction: Transaction,
  sourceOutputs: Output[],
  inputIndex: number,
): Uint8Array {
  const coveredBytecode = sourceOutputs[inputIndex]?.lockingBytecode;
  if (!coveredBytecode) throw new Error("missing source output for input");
  const serialization = generateSigningSerializationBCH(
    { transaction, sourceOutputs, inputIndex },
    { coveredBytecode, signingSerializationType: SIGHASH_TYPE },
  );
  return hash256(serialization);
}

export function signInputP2pkh(
  transaction: Transaction,
  sourceOutputs: Output[],
  inputIndex: number,
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): Transaction {
  const digest = sighashForInput(transaction, sourceOutputs, inputIndex);
  const signature = secp256k1.signMessageHashDER(privateKey, digest);
  if (typeof signature === "string") throw new Error(signature);
  const inputs = transaction.inputs.map((input, i) =>
    i === inputIndex
      ? { ...input, unlockingBytecode: p2pkhUnlockingBytecode(signature, publicKey) }
      : input,
  );
  return { ...transaction, inputs };
}

export function verifyInputP2pkhSignature(
  transaction: Transaction,
  sourceOutputs: Output[],
  inputIndex: number,
  publicKey: Uint8Array,
): boolean {
  const unlocking = transaction.inputs[inputIndex]?.unlockingBytecode;
  if (!unlocking || unlocking.length < 2) return false;
  // P2PKH unlock is <sig+type> <pubkey>
  const sigPushLen = unlocking[0];
  if (sigPushLen === undefined || sigPushLen === 0 || sigPushLen >= 0x4c) return false;
  const sigWithType = unlocking.slice(1, 1 + sigPushLen);
  if (sigWithType[sigWithType.length - 1] !== SIGHASH_ALL_FORKID) return false;
  const signature = sigWithType.slice(0, -1);
  const digest = sighashForInput(transaction, sourceOutputs, inputIndex);
  return secp256k1.verifySignatureDERLowS(signature, publicKey, digest);
}

export function encodeTxHex(transaction: Transaction): string {
  return binToHex(encodeTransaction(transaction));
}


export function unsignedInput(outpointTransactionHash: Uint8Array, outpointIndex: number): Input {
  return {
    outpointTransactionHash,
    outpointIndex,
    sequenceNumber: 0xfffffffe,
    unlockingBytecode: new Uint8Array(),
  };
}

export function builtFrom(transaction: Transaction, sourceOutputs: Output[]): BuiltTx {
  return {
    transaction,
    sourceOutputs,
    hex: encodeTxHex(transaction),
  };
}

export function toWcSourceOutputs(transaction: Transaction, sourceOutputs: Output[]) {
  return sourceOutputs.map((output, i) => {
    const input = transaction.inputs[i];
    if (!input) throw new Error("sourceOutputs length must match inputs");
    return {
      ...input,
      ...output,
    };
  });
}

