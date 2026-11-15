import {
  cashAddressToLockingBytecode,
  decodeCashAddress,
  encodeCashAddress,
  publicKeyToP2pkhCashAddress,
  secp256k1,
} from "@bitauth/libauth";
import { CashAddressNetworkPrefix } from "@bitauth/libauth";

export type BchNetwork = "mainnet" | "chipnet";

export function prefixFor(network: BchNetwork): CashAddressNetworkPrefix {
  return network === "chipnet" ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet;
}

export function encodeP2pkh(
  publicKey: Uint8Array,
  network: BchNetwork,
  tokenSupport = false,
): string {
  return publicKeyToP2pkhCashAddress({
    publicKey,
    prefix: prefixFor(network),
    tokenSupport,
  }).address;
}

export function lockingBytecodeFromAddress(address: string): Uint8Array {
  const result = cashAddressToLockingBytecode(address);
  if (typeof result === "string") throw new Error(result);
  return result.bytecode;
}

export function pkHashFromAddress(address: string): Uint8Array {
  const decoded = decodeCashAddress(address);
  if (typeof decoded === "string") throw new Error(decoded);
  return decoded.payload;
}

export function tokenAwareFromAddress(address: string): string {
  const decoded = decodeCashAddress(address);
  if (typeof decoded === "string") throw new Error(decoded);
  return encodeCashAddress({
    prefix: decoded.prefix,
    type: "p2pkhWithTokens",
    payload: decoded.payload,
  }).address;
}

export function standardFromAddress(address: string): string {
  const decoded = decodeCashAddress(address);
  if (typeof decoded === "string") throw new Error(decoded);
  return encodeCashAddress({
    prefix: decoded.prefix,
    type: "p2pkh",
    payload: decoded.payload,
  }).address;
}

export function addressesFromPubkey(publicKey: Uint8Array, network: BchNetwork) {
  return {
    p2pkh: encodeP2pkh(publicKey, network, false),
    tokenAware: encodeP2pkh(publicKey, network, true),
  };
}

export function compressedPubkeyFromPrivateKey(privateKey: Uint8Array): Uint8Array {
  const pub = secp256k1.derivePublicKeyCompressed(privateKey);
  if (typeof pub === "string") throw new Error(pub);
  return pub;
}

/** Reject reuse of the same secp256k1 key for BCH and Nostr. */
export function sameSecpKey(bchCompressedPubkey: Uint8Array, nostrPubkeyHex: string): boolean {
  if (bchCompressedPubkey.length !== 33) return false;
  const x = [...bchCompressedPubkey.slice(1)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return x === nostrPubkeyHex.trim().toLowerCase();
}
