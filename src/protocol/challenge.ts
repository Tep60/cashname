import { finalizeEvent, verifyEvent, type Event } from "nostr-tools";
import { CHALLENGE_TTL_SECONDS, KIND_CHALLENGE, PROTOCOL_ID } from "../constants";
import { randomHex } from "./canonical";
import { verifyBindingEvent, type CashNameBinding } from "./binding";

export type Challenge = {
  protocol: typeof PROTOCOL_ID;
  challenge: string;
  issuedAt: number;
  audience?: string;
};

export function issueChallenge(audience?: string): Challenge {
  return {
    protocol: PROTOCOL_ID,
    challenge: randomHex(32),
    issuedAt: Math.floor(Date.now() / 1000),
    audience,
  };
}

export function signChallenge(challenge: Challenge, nostrSecretKey: Uint8Array, bindingEventId?: string): Event {
  const tags: string[][] = [["c", challenge.challenge]];
  if (bindingEventId) tags.push(["e", bindingEventId]);
  if (challenge.audience) tags.push(["aud", challenge.audience]);
  return finalizeEvent(
    {
      kind: KIND_CHALLENGE,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: JSON.stringify(challenge),
    },
    nostrSecretKey,
  );
}

export function verifyChallengeResponse(params: {
  bindingEvent: Event;
  challenge: Challenge;
  response: Event;
  now?: number;
}): { ok: true; binding: CashNameBinding } | { ok: false; error: string } {
  const binding = verifyBindingEvent(params.bindingEvent);
  if (!binding.ok) return binding;
  if (!verifyEvent(params.response)) return { ok: false, error: "challenge signature is invalid" };
  if (params.response.kind !== KIND_CHALLENGE) return { ok: false, error: "wrong challenge event kind" };
  if (params.response.pubkey.toLowerCase() !== binding.binding.nostrPubkey.toLowerCase()) {
    return { ok: false, error: "challenge was not signed by the bound Nostr key" };
  }
  let body: Challenge;
  try {
    body = JSON.parse(params.response.content) as Challenge;
  } catch {
    return { ok: false, error: "challenge content is not valid JSON" };
  }
  if (body.protocol !== PROTOCOL_ID) return { ok: false, error: "unsupported protocol id" };
  if (body.challenge !== params.challenge.challenge) return { ok: false, error: "challenge nonce mismatch" };
  const now = params.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - body.issuedAt) > CHALLENGE_TTL_SECONDS) {
    return { ok: false, error: "challenge has expired" };
  }
  return { ok: true, binding: binding.binding };
}
