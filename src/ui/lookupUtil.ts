import { verifyBindingEvent, type CashNameBinding } from "../protocol/binding";
import { normalizeHandle } from "../protocol/handles";
import { parsePubkeyOrNpub } from "../nostr/keys";
import { queryBindings } from "../nostr/relays";
import type { Event } from "nostr-tools";

export type LookupHit = {
  event: Event;
  binding: CashNameBinding;
};

export async function lookupName(input: string): Promise<{ hits: LookupHit[]; errors: string[] }> {
  const raw = input.trim();
  if (!raw) return { hits: [], errors: ["Enter a handle or npub."] };
  const params: { handle?: string; pubkey?: string } = {};
  if (raw.startsWith("npub1") || /^[0-9a-fA-F]{64}$/.test(raw)) {
    params.pubkey = parsePubkeyOrNpub(raw);
  } else {
    params.handle = normalizeHandle(raw);
  }
  const events = await queryBindings(params);
  const hits: LookupHit[] = [];
  const errors: string[] = [];
  for (const event of events) {
    const verified = verifyBindingEvent(event);
    if (verified.ok) hits.push({ event, binding: verified.binding });
    else errors.push(`${event.id.slice(0, 10)}… ${verified.error}`);
  }
  hits.sort((a, b) => b.binding.issuedAt - a.binding.issuedAt);
  return { hits, errors };
}
