import { useState } from "react";
import type { BchNetwork } from "../bch/address";
import { sameSecpKey } from "../bch/address";
import { decodeTransactionBCH, hexToBin } from "@bitauth/libauth";
import {
  buildBindingContent,
  createBindingFields,
  signBindingEvent,
  verifyBindingEvent,
} from "../protocol/binding";
import { displayHandle, handleError, normalizeHandle } from "../protocol/handles";
import { buildUnsignedProofTx, serializeProof, signProofTx } from "../protocol/proofTx";
import {
  clearStoredNostrIdentity,
  generateNostrIdentity,
  loadStoredNostrIdentity,
  parseNostrSecret,
  storeNostrIdentity,
  type NostrIdentity,
} from "../nostr/keys";
import { publishEvent } from "../nostr/relays";
import type { ConnectedWallet } from "../wallet/types";

export function Bind(props: { network: BchNetwork; wallet: ConnectedWallet | null }) {
  const [handle, setHandle] = useState("");
  const [nostr, setNostr] = useState<NostrIdentity | null>(() => loadStoredNostrIdentity());
  const [nsecInput, setNsecInput] = useState("");
  const [log, setLog] = useState("");
  const [eventJson, setEventJson] = useState("");
  const [busy, setBusy] = useState(false);

  function setIdentity(id: NostrIdentity) {
    storeNostrIdentity(id);
    setNostr(id);
  }

  async function onBind() {
    setLog("");
    setEventJson("");
    const problem = handleError(handle);
    if (problem) return setLog(problem);
    if (!props.wallet) return setLog("Connect a BCH wallet first.");
    if (!nostr) return setLog("Create or import a Nostr key first.");
    if (sameSecpKey(props.wallet.publicKey, nostr.publicKey)) {
      return setLog("BCH and Nostr keys must be different.");
    }
    setBusy(true);
    try {
      const fields = createBindingFields({
        handle: normalizeHandle(handle),
        bchAddress: props.wallet.address,
        nostrSecretKey: nostr.secretKey,
      });
      let proof;
      if (props.wallet.kind === "local") {
        proof = signProofTx(fields, (await import("../wallet/local")).loadLocalWallet(props.network)!.privateKey, props.wallet.publicKey);
      } else {
        const unsigned = buildUnsignedProofTx(fields);
        const signed = await props.wallet.signTransaction({
          transaction: unsigned.transaction,
          sourceOutputs: unsigned.sourceOutputs,
          inputPaths: [[0, "receive", 0]],
          broadcast: false,
          userPrompt: `Bind ${displayHandle(fields.handle)} to this BCH address. This proof transaction cannot be broadcast and will not move funds.`,
        });
        const decoded = decodeTransactionBCH(hexToBin(signed.signedHex));
        if (typeof decoded === "string") throw new Error(decoded);
        proof = serializeProof(decoded, unsigned.sourceOutputs);
      }
      const binding = buildBindingContent(fields, proof, props.wallet.publicKey);
      const event = signBindingEvent(binding, nostr.secretKey);
      const checked = verifyBindingEvent(event);
      if (!checked.ok) throw new Error(`local verification failed: ${checked.error}`);
      const published = await publishEvent(event);
      setEventJson(JSON.stringify(event, null, 2));
      setLog(
        `Bound ${displayHandle(fields.handle)}.\n` +
          `Nostr event ${event.id}\n` +
          `Published to ${published.ok.length} relay(s)` +
          (published.failed.length ? `; failed: ${published.failed.join(", ")}` : "") +
          `.\nAnyone can look this up and verify it without CashName's servers.`,
      );
    } catch (err) {
      setLog(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1>Create a binding</h1>
      <p className="lede">Prove control of a BCH key and a Nostr key, then publish the link to relays.</p>

      <label>Handle</label>
      <input
        type="text"
        placeholder="alice"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
      />
      <div className="muted">{handle ? displayHandle(handle) : "Your public name, e.g. alice.bch"}</div>

      <label>Nostr key</label>
      {nostr ? (
        <p>
          <span className="pill">stored in this browser</span>{" "}
          <code>{nostr.npub}</code>{" "}
          <button
            className="secondary"
            type="button"
            onClick={() => {
              clearStoredNostrIdentity();
              setNostr(null);
            }}
          >
            Remove
          </button>
        </p>
      ) : (
        <>
          <button type="button" onClick={() => setIdentity(generateNostrIdentity())}>
            Generate a Nostr key
          </button>
          <input
            type="text"
            placeholder="or paste nsec1…"
            value={nsecInput}
            onChange={(e) => setNsecInput(e.target.value)}
            style={{ marginTop: "0.5rem" }}
          />
          <button
            className="secondary"
            type="button"
            onClick={() => {
              try {
                setIdentity(parseNostrSecret(nsecInput));
                setNsecInput("");
              } catch (err) {
                setLog(err instanceof Error ? err.message : String(err));
              }
            }}
          >
            Import
          </button>
        </>
      )}

      <p>
        <button className="ember" type="button" disabled={busy} onClick={() => void onBind()}>
          {busy ? "Working…" : "Bind and publish"}
        </button>
      </p>
      {log && <pre className="output">{log}</pre>}
      {eventJson && <pre className="output">{eventJson}</pre>}
    </section>
  );
}
