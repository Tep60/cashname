import { hexToBin } from "@bitauth/libauth";
import { finalizeEvent, getPublicKey, verifyEvent, type EventTemplate, type Event } from "nostr-tools";
import { KIND_BINDING, PROTOCOL_ID } from "../constants";
import { sameSecpKey, tokenAwareFromAddress } from "../bch/address";
import { canonicalBindingMessage, randomHex, type BindingFields } from "./canonical";
import { isValidHandle, normalizeHandle } from "./handles";
import { type ProofPayload, verifyProofTx } from "./proofTx";

export type CashNameBinding = BindingFields & {
  protocol: typeof PROTOCOL_ID;
  bchTokenAddress: string;
  proof: ProofPayload;
  bchPublicKeyHex: string;
};

export type BindingEventContent = CashNameBinding;

export function buildBindingContent(
  fields: BindingFields,
  proof: ProofPayload,
  bchPublicKey: Uint8Array,
): CashNameBinding {
  return {
    protocol: PROTOCOL_ID,
    handle: normalizeHandle(fields.handle),
    bchAddress: fields.bchAddress.trim().toLowerCase(),
    bchTokenAddress: tokenAwareFromAddress(fields.bchAddress).toLowerCase(),
    nostrPubkey: fields.nostrPubkey.trim().toLowerCase(),
    nonce: fields.nonce.trim().toLowerCase(),
    issuedAt: fields.issuedAt,
    proof,
    bchPublicKeyHex: [...bchPublicKey].map((b) => b.toString(16).padStart(2, "0")).join(""),
  };
}

export function bindingTags(binding: CashNameBinding): string[][] {
  return [
    ["d", PROTOCOL_ID],
    ["h", binding.handle],
    ["i", `bch:${binding.bchAddress}`],
    ["client", "cashname"],
  ];
}

export function bindingToEventTemplate(binding: CashNameBinding): EventTemplate {
  return {
    kind: KIND_BINDING,
    created_at: binding.issuedAt,
    tags: bindingTags(binding),
    content: JSON.stringify(binding),
  };
}

export function signBindingEvent(binding: CashNameBinding, nostrSecretKey: Uint8Array): Event {
  return finalizeEvent(bindingToEventTemplate(binding), nostrSecretKey);
}

export function parseBindingContent(content: string): CashNameBinding | { error: string } {
  try {
    const parsed = JSON.parse(content) as Partial<CashNameBinding>;
    if (parsed.protocol !== PROTOCOL_ID) return { error: "unsupported protocol id" };
    if (!parsed.handle || !parsed.bchAddress || !parsed.nostrPubkey || !parsed.nonce) {
      return { error: "binding is missing required fields" };
    }
    if (!parsed.proof?.proofTxHex || !parsed.bchPublicKeyHex) {
      return { error: "binding is missing the BCH proof" };
    }
    return parsed as CashNameBinding;
  } catch {
    return { error: "binding content is not valid JSON" };
  }
}

export type VerifyBindingResult =
  | { ok: true; binding: CashNameBinding }
  | { ok: false; error: string };

export function verifyBindingEvent(event: Event): VerifyBindingResult {
  if (event.kind !== KIND_BINDING) return { ok: false, error: "wrong Nostr event kind" };
  if (!verifyEvent(event)) return { ok: false, error: "Nostr signature is invalid" };
  const parsed = parseBindingContent(event.content);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  if (event.pubkey.toLowerCase() !== parsed.nostrPubkey.toLowerCase()) {
    return { ok: false, error: "Nostr pubkey does not match the binding" };
  }
  if (!isValidHandle(parsed.handle)) return { ok: false, error: "invalid handle" };
  const dTag = event.tags.find((t) => t[0] === "d")?.[1];
  if (dTag && dTag !== PROTOCOL_ID) return { ok: false, error: "unexpected d tag" };
  const hTag = event.tags.find((t) => t[0] === "h")?.[1];
  if (hTag && hTag !== parsed.handle) return { ok: false, error: "handle tag does not match content" };

  let bchPublicKey: Uint8Array;
  try {
    bchPublicKey = hexToBin(parsed.bchPublicKeyHex);
  } catch {
    return { ok: false, error: "invalid BCH public key" };
  }
  if (sameSecpKey(bchPublicKey, parsed.nostrPubkey)) {
    return { ok: false, error: "BCH and Nostr keys must be different" };
  }
  const expectedMessage = canonicalBindingMessage(parsed);
  const rebuilt = canonicalBindingMessage({
    bchAddress: parsed.bchAddress,
    nostrPubkey: parsed.nostrPubkey,
    handle: parsed.handle,
    nonce: parsed.nonce,
    issuedAt: parsed.issuedAt,
  });
  if (expectedMessage !== rebuilt) return { ok: false, error: "canonical message mismatch" };

  const proof = verifyProofTx(parsed, parsed.proof, bchPublicKey);
  if (!proof.ok) return { ok: false, error: proof.error };
  return { ok: true, binding: parsed };
}

export function createBindingFields(params: {
  handle: string;
  bchAddress: string;
  nostrSecretKey: Uint8Array;
  issuedAt?: number;
}): BindingFields {
  return {
    handle: normalizeHandle(params.handle),
    bchAddress: params.bchAddress.trim().toLowerCase(),
    nostrPubkey: getPublicKey(params.nostrSecretKey),
    nonce: randomHex(32),
    issuedAt: params.issuedAt ?? Math.floor(Date.now() / 1000),
  };
}
