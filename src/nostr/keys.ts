import { finalizeEvent, generateSecretKey, getPublicKey, nip19, type Event } from "nostr-tools";

const STORAGE_KEY = "cashname-nostr-key";

export type NostrIdentity = {
  secretKey: Uint8Array;
  publicKey: string;
  nsec: string;
  npub: string;
};

export function identityFromSecret(secretKey: Uint8Array): NostrIdentity {
  const publicKey = getPublicKey(secretKey);
  return {
    secretKey,
    publicKey,
    nsec: nip19.nsecEncode(secretKey),
    npub: nip19.npubEncode(publicKey),
  };
}

export function generateNostrIdentity(): NostrIdentity {
  return identityFromSecret(generateSecretKey());
}

export function parseNostrSecret(input: string): NostrIdentity {
  const trimmed = input.trim();
  if (trimmed.startsWith("nsec1")) {
    const decoded = nip19.decode(trimmed);
    if (decoded.type !== "nsec") throw new Error("not an nsec");
    return identityFromSecret(decoded.data);
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i += 1) bytes[i] = parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
    return identityFromSecret(bytes);
  }
  throw new Error("paste an nsec1... key or a 64-character hex secret");
}

export function loadStoredNostrIdentity(): NostrIdentity | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return parseNostrSecret(raw);
  } catch {
    return null;
  }
}

export function storeNostrIdentity(identity: NostrIdentity): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, identity.nsec);
}

export function clearStoredNostrIdentity(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function parsePubkeyOrNpub(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("npub1")) {
    const decoded = nip19.decode(trimmed);
    if (decoded.type !== "npub") throw new Error("not an npub");
    return decoded.data;
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return trimmed.toLowerCase();
  throw new Error("enter an npub or a 64-character hex pubkey");
}

export { finalizeEvent };
export type { Event };
