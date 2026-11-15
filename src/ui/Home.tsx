import { RECOMMENDED_DEMO_SATS } from "../constants";

function href(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export function Home() {
  return (
    <section>
      <div className="hero-tag">BCH BLAZE 2026 · Mainnet + Paytaca DID</div>
      <h1>
        Pay Bitcoin Cash to a name, not a <span className="handle">cashaddr</span>.
      </h1>
      <p className="lede">
        CashName binds a BCH wallet to a Nostr identity with proofs of both keys,
        publishes the link on relays, and lets anyone send BCH to a handle like
        <strong> alice.bch</strong>.
      </p>
      <div className="nameplate">
        <span className="hole" />
        alice.bch
      </div>
      <p>
        <a className="btn ember" href={href("#/bind")}>Create a binding</a>{" "}
        <a className="btn secondary" href={href("#/send")}>Pay a handle</a>
      </p>

      <div className="grid-2" style={{ marginTop: "1.6rem" }}>
        <div className="card">
          <h3>How the binding works</h3>
          <ol className="steps">
            <li>You keep two keys: a BCH wallet and a Nostr key. They must be different.</li>
            <li>Both sign the same canonical message (handle, addresses, nonce).</li>
            <li>WizardConnect has no message-signing API, so the BCH proof is a signed transaction that spends a fake outpoint. It cannot be broadcast and moves no funds.</li>
            <li>The result is published as a replaceable Nostr event. Anyone can verify it without us.</li>
          </ol>
        </div>
        <div className="card">
          <h3>What judges can click</h3>
          <ol className="steps">
            <li>Connect Paytaca with WizardConnect, or try the local demo wallet first.</li>
            <li>Bind a handle, then look it up from another tab.</li>
            <li>Send a small mainnet payment to the resolved address. About 0.0001 BCH ({RECOMMENDED_DEMO_SATS.toString()} sats) covers several tries.</li>
            <li>Run the challenge-response to see how another app would authenticate the identity.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
