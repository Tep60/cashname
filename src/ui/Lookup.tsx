import { useState } from "react";
import { displayHandle } from "../protocol/handles";
import { lookupName, type LookupHit } from "./lookupUtil";

export function BindingCard({ hit }: { hit: LookupHit }) {
  const { binding, event } = hit;
  return (
    <div className="card" style={{ marginTop: "0.8rem" }}>
      <h3>{displayHandle(binding.handle)}</h3>
      <p className="ok">Both proofs verified.</p>
      <p>
        BCH: <code>{binding.bchAddress}</code>
        <br />
        Token-aware: <code>{binding.bchTokenAddress}</code>
        <br />
        Nostr: <code>{binding.nostrPubkey}</code>
        <br />
        Event: <code>{event.id}</code>
      </p>
    </div>
  );
}

export function Lookup() {
  const [input, setInput] = useState("");
  const [hits, setHits] = useState<LookupHit[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const result = await lookupName(input);
      setHits(result.hits);
      setErrors(result.errors);
    } catch (err) {
      setHits([]);
      setErrors([err instanceof Error ? err.message : String(err)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1>Look up a handle</h1>
      <p className="lede">Resolve a name or npub from public Nostr relays and verify the BCH proof.</p>
      <label>Handle or npub</label>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="alice.bch or npub1…" />
      <p>
        <button className="ember" type="button" disabled={busy} onClick={() => void run()}>
          {busy ? "Searching…" : "Look up"}
        </button>
      </p>
      {hits.length === 0 && !busy && errors.length === 0 && <p className="muted">No results yet.</p>}
      {hits.map((hit) => (
        <BindingCard key={hit.event.id} hit={hit} />
      ))}
      {errors.length > 0 && <pre className="output">{errors.join("\n")}</pre>}
    </section>
  );
}
