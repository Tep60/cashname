import {
  binToHex,
  decodeTransactionBCH,
  encodeDataPush,
  flattenBinArray,
  hexToBin,
  sha256,
  utf8ToBin,
  type Output,
  type Transaction,
} from "@bitauth/libauth";
import { PROTOCOL_ID } from "../constants";
import { lockingBytecodeFromAddress } from "../bch/address";
import {
  builtFrom,
  encodeTxHex,
  signInputP2pkh,
  unsignedInput,
  verifyInputP2pkhSignature,
  type BuiltTx,
} from "../bch/signP2pkh";
import { canonicalBindingMessage, type BindingFields } from "./canonical";

const PROOF_VALUE_SATS = 1000n;

export type ProofPayload = {
  proofTxHex: string;
  sourceOutput: {
    valueSatoshis: string;
    lockingBytecode: string;
  };
};

function opReturnLocking(payload: Uint8Array): Uint8Array {
  return flattenBinArray([Uint8Array.of(0x6a), encodeDataPush(payload)]);
}

export function proofCommitmentHash(message: string): Uint8Array {
  return sha256.hash(utf8ToBin(message));
}

export function fakeOutpointHash(message: string): Uint8Array {
  return sha256.hash(utf8ToBin(`${PROTOCOL_ID}/utxo\n${message}`));
}

export function buildUnsignedProofTx(fields: BindingFields): BuiltTx {
  const message = canonicalBindingMessage(fields);
  const lockingBytecode = lockingBytecodeFromAddress(fields.bchAddress);
  const sourceOutputs: Output[] = [
    { valueSatoshis: PROOF_VALUE_SATS, lockingBytecode },
  ];
  const transaction: Transaction = {
    version: 2,
    locktime: 0,
    inputs: [unsignedInput(fakeOutpointHash(message), 0)],
    outputs: [
      {
        valueSatoshis: 0n,
        lockingBytecode: opReturnLocking(
          flattenBinArray([utf8ToBin(`${PROTOCOL_ID}:`), proofCommitmentHash(message)]),
        ),
      },
    ],
  };
  return builtFrom(transaction, sourceOutputs);
}

export function signProofTx(
  fields: BindingFields,
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): ProofPayload {
  const unsigned = buildUnsignedProofTx(fields);
  const signed = signInputP2pkh(
    unsigned.transaction,
    unsigned.sourceOutputs,
    0,
    privateKey,
    publicKey,
  );
  return serializeProof(signed, unsigned.sourceOutputs);
}

export function serializeProof(transaction: Transaction, sourceOutputs: Output[]): ProofPayload {
  const source = sourceOutputs[0];
  if (!source) throw new Error("missing source output");
  return {
    proofTxHex: encodeTxHex(transaction),
    sourceOutput: {
      valueSatoshis: source.valueSatoshis.toString(),
      lockingBytecode: binToHex(source.lockingBytecode),
    },
  };
}

export function deserializeProof(payload: ProofPayload): { transaction: Transaction; sourceOutputs: Output[] } {
  const decoded = decodeTransactionBCH(hexToBin(payload.proofTxHex));
  if (typeof decoded === "string") throw new Error(decoded);
  const sourceOutputs: Output[] = [
    {
      valueSatoshis: BigInt(payload.sourceOutput.valueSatoshis),
      lockingBytecode: hexToBin(payload.sourceOutput.lockingBytecode),
    },
  ];
  return { transaction: decoded, sourceOutputs };
}

/**
 * A proof transaction is intentionally unbroadcastable: its outpoint is a
 * hash of the binding message, not a real UTXO. Signing it proves control of
 * the BCH key without moving funds. WizardConnect has no signMessage API, so
 * this is the identity proof the wallet can actually produce.
 */
export function verifyProofTx(
  fields: BindingFields,
  payload: ProofPayload,
  publicKey: Uint8Array,
): { ok: true } | { ok: false; error: string } {
  let decoded: { transaction: Transaction; sourceOutputs: Output[] };
  try {
    decoded = deserializeProof(payload);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "invalid proof transaction" };
  }
  const message = canonicalBindingMessage(fields);
  const expectedOutpoint = fakeOutpointHash(message);
  const input = decoded.transaction.inputs[0];
  if (!input) return { ok: false, error: "proof transaction has no inputs" };
  if (binToHex(input.outpointTransactionHash) !== binToHex(expectedOutpoint) || input.outpointIndex !== 0) {
    return { ok: false, error: "proof outpoint does not match the binding message" };
  }
  const expectedLock = lockingBytecodeFromAddress(fields.bchAddress);
  const sourceLock = decoded.sourceOutputs[0]?.lockingBytecode;
  if (!sourceLock || binToHex(sourceLock) !== binToHex(expectedLock)) {
    return { ok: false, error: "proof source output is not the claimed BCH address" };
  }
  const expectedCommitment = binToHex(
    flattenBinArray([utf8ToBin(`${PROTOCOL_ID}:`), proofCommitmentHash(message)]),
  );
  const outputLock = decoded.transaction.outputs[0]?.lockingBytecode;
  if (!outputLock || !binToHex(outputLock).includes(expectedCommitment)) {
    return { ok: false, error: "proof OP_RETURN does not commit to the binding message" };
  }
  if (!verifyInputP2pkhSignature(decoded.transaction, decoded.sourceOutputs, 0, publicKey)) {
    return { ok: false, error: "BCH signature on the proof transaction is invalid" };
  }
  return { ok: true };
}
