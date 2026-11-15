import { SimplePool, type EventTemplate, type Filter, type Event } from "nostr-tools";
import { DEFAULT_RELAYS } from "../constants";
import { KIND_BINDING } from "../constants";

let pool: SimplePool | null = null;

export function getPool(): SimplePool {
  if (!pool) pool = new SimplePool();
  return pool;
}

export function relayList(extra?: string[]): string[] {
  const set = new Set<string>([...DEFAULT_RELAYS, ...(extra ?? [])]);
  return [...set];
}

export async function publishEvent(event: Event, relays = relayList()): Promise<{ ok: string[]; failed: string[] }> {
  const ok: string[] = [];
  const failed: string[] = [];
  const pubs = getPool().publish(relays, event);
  const results = await Promise.allSettled(pubs);
  results.forEach((result, i) => {
    const url = relays[i] ?? "unknown";
    if (result.status === "fulfilled") ok.push(url);
    else failed.push(url);
  });
  return { ok, failed };
}

export async function queryBindings(params: {
  handle?: string;
  pubkey?: string;
  relays?: string[];
}): Promise<Event[]> {
  const filter: Filter = { kinds: [KIND_BINDING], limit: 20 };
  if (params.handle) filter["#h"] = [params.handle];
  if (params.pubkey) filter.authors = [params.pubkey];
  const events = await getPool().querySync(params.relays ?? relayList(), filter);
  return events as Event[];
}

export type { EventTemplate, Filter };
