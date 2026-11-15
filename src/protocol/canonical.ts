import { PROTOCOL_ID } from "../constants";
import { normalizeHandle } from "./handles";

export type BindingFields = {
  bchAddress: string;
  nostrPubkey: string;
  handle: string;
  nonce: string;
  issuedAt: number;
};

/** Deterministic message both keys attest to. Newlines are part of the signed content. */
export function canonicalBindingMessage(fields: BindingFields): string {
  const handle = normalizeHandle(fields.handle);
  const bchAddress = fields.bchAddress.trim().toLowerCase();
  const nostrPubkey = fields.nostrPubkey.trim().toLowerCase();
  const nonce = fields.nonce.trim().toLowerCase();
  return [
    PROTOCOL_ID,
    `bch: ${bchAddress}`,
    `nostr: ${nostrPubkey}`,
    `handle: ${handle}`,
    `nonce: ${nonce}`,
    `issued: ${fields.issuedAt}`,
  ].join("\n");
}

export function randomHex(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}
