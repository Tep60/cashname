import { useState } from "react";
import { issueChallenge, signChallenge, verifyChallengeResponse } from "../protocol/challenge";
import { loadStoredNostrIdentity } from "../nostr/keys";
import { lookupName, type LookupHit } from "./lookupUtil";
import { BindingCard } from "./Lookup";
import type { Challenge } from "../protocol/challenge";
import type { Event } from "nostr-tools";

export function Verify() {
  const [input, setInput] = useState("");
  const [hit, setHit] = useState<LookupHit | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [response, setResponse] = useState("");
  const [log, setLog] = useState("");

  async function load() {
    setLog("");
    const result = await lookupName(input);
    const first = result.hits[0];
    if (!first) return setLog(result.errors.join("\n") || "No verified binding found.");
    setHit(first);
    setChallenge(issueChallenge("cashname-demo"));
  }

  function signLocally() {
    if (!challenge) return;
    const nostr = loadStoredNostrIdentity();
    if (!nostr) return setLog("No Nostr key in this browser. Import the bound key, or paste a signed response.");
    const event = signChallenge(challenge, nostr.secretKey, hit?.event.id);
    setResponse(JSON.stringify(event, null, 2));
    setLog("Signed the challenge with the Nostr key stored in this browser.");
  }

  function check() {
    if (!hit || !challenge) return;
    try {
      const event = JSON.parse(response) as Event;
      const result = verifyChallengeResponse({
        bindingEvent: hit.event,
        challenge,
        response: event,
      });
      setLog(result.ok ? `Authenticated as ${result.binding.handle}.bch` : result.error);
    } catch (err) {
      setLog(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section>
      <h1>Challenge-response</h1>
      <p className="lede">
        A third-party app can authenticate a CashName without calling any server of ours.
        It issues a nonce; the bound Nostr key signs it.
      </p>
      <label>Handle or npub</label>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="alice.bch" />
      <p>
        <button type="button" onClick={() => void load()}>
          Load binding and issue a challenge
        </button>
      </p>
      {hit && <BindingCard hit={hit} />}
      {challenge && (
        <>
          <label>Challenge</label>
          <pre className="output">{JSON.stringify(challenge, null, 2)}</pre>
          <p>
            <button type="button" onClick={signLocally}>
              Sign with the Nostr key in this browser
            </button>
          </p>
          <label>Response event</label>
          <textarea value={response} onChange={(e) => setResponse(e.target.value)} />
          <p>
            <button className="ember" type="button" onClick={check}>
              Verify response
            </button>
          </p>
        </>
      )}
      {log && <pre className="output">{log}</pre>}
    </section>
  );
}
