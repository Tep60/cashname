import { describe, expect, it } from "vitest";
import { generatePrivateKey } from "@bitauth/libauth";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { compressedPubkeyFromPrivateKey, encodeP2pkh, sameSecpKey } from "../src/bch/address";
import {
  buildBindingContent,
  createBindingFields,
  signBindingEvent,
  verifyBindingEvent,
} from "../src/protocol/binding";
import { issueChallenge, signChallenge, verifyChallengeResponse } from "../src/protocol/challenge";
import { displayHandle, handleError, isValidHandle, normalizeHandle } from "../src/protocol/handles";
import { signProofTx } from "../src/protocol/proofTx";

function localPair() {
  const bchSecret = generatePrivateKey();
  const bchPublic = compressedPubkeyFromPrivateKey(bchSecret);
  const nostrSecret = generateSecretKey();
  return {
    bchSecret,
    bchPublic,
    address: encodeP2pkh(bchPublic, "mainnet"),
    nostrSecret,
    nostrPubkey: getPublicKey(nostrSecret),
  };
}

function bind(pair = localPair(), handle = "alice") {
  const fields = createBindingFields({
    handle,
    bchAddress: pair.address,
    nostrSecretKey: pair.nostrSecret,
    issuedAt: 1_700_000_000,
  });
  const proof = signProofTx(fields, pair.bchSecret, pair.bchPublic);
  const binding = buildBindingContent(fields, proof, pair.bchPublic);
  const event = signBindingEvent(binding, pair.nostrSecret);
  return { pair, fields, proof, binding, event };
}

describe("handles", () => {
  it("normalizes and validates", () => {
    expect(normalizeHandle("Alice.bch")).toBe("alice");
    expect(normalizeHandle("bob@cashname")).toBe("bob");
    expect(isValidHandle("alice")).toBe(true);
    expect(isValidHandle("a")).toBe(true);
    expect(isValidHandle("al_ice9")).toBe(true);
    expect(isValidHandle("_alice")).toBe(false);
    expect(isValidHandle("alice-x")).toBe(false);
    expect(handleError("")).toBeTruthy();
    expect(displayHandle("Alice.BCH")).toBe("alice.bch");
  });
});

describe("cashname binding", () => {
  it("verifies a freshly created binding", () => {
    const { event, binding } = bind();
    const result = verifyBindingEvent(event);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binding.handle).toBe("alice");
      expect(result.binding.bchAddress).toBe(binding.bchAddress);
    }
  });

  it("rejects a listing-only profile with no proof", () => {
    const { event } = bind();
    const content = JSON.parse(event.content);
    delete content.proof;
    const fake = { ...event, content: JSON.stringify(content), id: event.id, sig: event.sig };
    const result = verifyBindingEvent(fake);
    expect(result.ok).toBe(false);
  });

  it("rejects a swapped handle in the event", () => {
    const { event, pair } = bind();
    const tampered = signBindingEvent(
      { ...JSON.parse(event.content), handle: "mallory" },
      pair.nostrSecret,
    );
    // rebuild tags still say alice unless we go through helper; force verify of content vs tags
    const result = verifyBindingEvent({
      ...tampered,
      tags: event.tags,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects reusing the same secp key for BCH and Nostr", () => {
    const bchSecret = generatePrivateKey();
    const bchPublic = compressedPubkeyFromPrivateKey(bchSecret);
    expect(sameSecpKey(bchPublic, "00".repeat(32))).toBe(false);
    const x = [...bchPublic.slice(1)].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(sameSecpKey(bchPublic, x)).toBe(true);
  });

  it("rejects a proof signed by a different BCH key", () => {
    const honest = bind();
    const attacker = localPair();
    const badProof = signProofTx(honest.fields, attacker.bchSecret, attacker.bchPublic);
    const binding = buildBindingContent(honest.fields, badProof, honest.pair.bchPublic);
    const event = signBindingEvent(binding, honest.pair.nostrSecret);
    const result = verifyBindingEvent(event);
    expect(result.ok).toBe(false);
  });
});

describe("challenge-response", () => {
  it("authenticates the bound nostr key", () => {
    const { event, pair } = bind();
    const challenge = issueChallenge("test");
    // freeze time by using the issued challenge
    const response = signChallenge(challenge, pair.nostrSecret, event.id);
    const result = verifyChallengeResponse({
      bindingEvent: event,
      challenge,
      response,
      now: challenge.issuedAt,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a response from a different nostr key", () => {
    const { event } = bind();
    const challenge = issueChallenge("test");
    const response = signChallenge(challenge, generateSecretKey(), event.id);
    const result = verifyChallengeResponse({
      bindingEvent: event,
      challenge,
      response,
      now: challenge.issuedAt,
    });
    expect(result.ok).toBe(false);
  });
});
