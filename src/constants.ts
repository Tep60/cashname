/** Public constants only. The prize wallet private key is not in this repo. */

export const PROTOCOL_ID = "cashname/v1";
export const KIND_BINDING = 31250;
export const KIND_CHALLENGE = 31251;
export const HANDLE_REGEX = /^[a-z0-9](?:[a-z0-9_]{0,28}[a-z0-9])?$/;
export const HANDLE_SUFFIX = ".bch";

/** Token-aware CashTokens address for EMBER2026 donations and prize payout. */
export const PROJECT_DONATION_ADDRESS =
  "bitcoincash:zq9c3mchg56jszu9nwlynz3wdz0ln509xyeauzjdau";

/** Same key, standard P2PKH (for plain BCH). */
export const PROJECT_P2PKH_ADDRESS =
  "bitcoincash:qq9c3mchg56jszu9nwlynz3wdz0ln509xy7h0uutz0";

export const REPO_URL = "https://github.com/Tep60/cashname";
export const PAGES_PATH = "/cashname/";

export const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://relay.primal.net",
  "wss://offchain.pub",
] as const;

export const SIGHASH_ALL_FORKID = 0x41;
export const DUST_SATS = 546n;
export const FEE_RATE_SAT_PER_BYTE = 1n;
/** Comfortable amount for a few demo payments plus fees. */
export const RECOMMENDED_DEMO_SATS = 10_000n; // 0.0001 BCH

export const CHALLENGE_TTL_SECONDS = 10 * 60;
