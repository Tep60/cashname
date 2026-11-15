import { useEffect, useState, type ReactNode } from "react";
import { PROJECT_DONATION_ADDRESS, REPO_URL } from "../constants";

const slides: { title: string; body: ReactNode }[] = [
  {
    title: "CashName",
    body: (
      <>
        <p className="lede">Pay Bitcoin Cash to a handle, not a cashaddr.</p>
        <p>
          BCH BLAZE 2026 · Mainnet track and Paytaca Decentralized Identity bounty.
          <br />
          Solo project · Tep60
        </p>
      </>
    ),
  },
  {
    title: "The problem",
    body: (
      <>
        <p>A Bitcoin Cash address is accurate and hostile to share.</p>
        <p>
          People already have portable keys on Nostr. Wallets already know how to
          send BCH. What is missing is a verifiable link between the two that does
          not depend on a company&apos;s database.
        </p>
      </>
    ),
  },
  {
    title: "The widget",
    body: (
      <>
        <div className="nameplate">
          <span className="hole" />
          alice.bch
        </div>
        <p>
          A user binds a BCH wallet to a Nostr key, publishes the binding to
          relays, and anyone can send BCH to that handle. The same binding can
          authenticate the user to another app with a challenge-response.
        </p>
      </>
    ),
  },
  {
    title: "How the proofs work",
    body: (
      <>
        <p>Two different keys, one canonical message.</p>
        <ul>
          <li>The Nostr key signs a kind 31250 event.</li>
          <li>
            The BCH key signs an unbroadcastable proof transaction (WizardConnect
            has no signMessage). The fake outpoint and OP_RETURN commit to the
            same message, so the signature cannot be reused as a payment.
          </li>
          <li>Anyone verifies both signatures without us.</li>
        </ul>
      </>
    ),
  },
  {
    title: "What to click",
    body: (
      <ol className="steps">
        <li>Connect Paytaca with WizardConnect (or the local demo wallet).</li>
        <li>Bind a handle.</li>
        <li>Look it up from a clean state and confirm both proofs pass.</li>
        <li>Send a small mainnet payment to the resolved address (~0.0001 BCH).</li>
        <li>Run the challenge-response.</li>
      </ol>
    ),
  },
  {
    title: "Business potential",
    body: (
      <>
        <p>
          Handles are how people already pay each other. Merchants, tipping,
          invoices, and wallet address books can resolve a name instead of
          pasting a cashaddr.
        </p>
        <p>
          The protocol is a library, not a custodial product. Wallets and Nostr
          clients can adopt it without asking CashName for permission.
        </p>
      </>
    ),
  },
  {
    title: "Links",
    body: (
      <>
        <p>
          Live demo and source: <a href={REPO_URL}>{REPO_URL}</a>
        </p>
        <p>
          EMBER2026 / prizes: <code>{PROJECT_DONATION_ADDRESS}</code>
        </p>
        <p>Built for BCH BLAZE 2026 by Tep60.</p>
      </>
    ),
  },
];

export function Deck() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setI((n) => Math.min(slides.length - 1, n + 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const slide = slides[i]!;
  return (
    <section>
      <p className="muted">Widget Factory-style deck. Arrow keys or the buttons move between slides.</p>
      <div className="deck">
        <div className="hero-tag">CashName · {i + 1} / {slides.length}</div>
        <h1>{slide.title}</h1>
        {slide.body}
      </div>
      <div className="deck-nav">
        <button className="secondary" type="button" disabled={i === 0} onClick={() => setI((n) => n - 1)}>
          Previous
        </button>
        <span>
          {i + 1} / {slides.length}
        </span>
        <button className="secondary" type="button" disabled={i === slides.length - 1} onClick={() => setI((n) => n + 1)}>
          Next
        </button>
      </div>
    </section>
  );
}
