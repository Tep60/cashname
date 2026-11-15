export function Protocol() {
  return (
    <section>
      <h1>Protocol</h1>
      <p className="lede">
        cashname/v1 is a small, checkable binding between a Bitcoin Cash P2PKH key and a
        Nostr key. The full write-up lives in PROTOCOL.md in the repository.
      </p>
      <div className="card">
        <h3>What is signed</h3>
        <pre className="output">{`cashname/v1
bch: bitcoincash:q...
nostr: <32-byte hex>
handle: alice
nonce: <32-byte hex>
issued: <unix seconds>`}</pre>
        <p>
          The Nostr key signs a kind <code>31250</code> parameterized replaceable event
          (<code>d=cashname/v1</code>, <code>h=handle</code>). The BCH key signs an
          unbroadcastable proof transaction whose outpoint and OP_RETURN commit to that
          same message. Reusing the same secp256k1 key on both sides is rejected.
        </p>
      </div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>Discovery and pay-by-handle</h3>
        <p>
          Clients query public relays for kind 31250 with <code>#h</code> or by author.
          After both signatures verify, the BCH address in the binding is the payment
          destination. Handles are not globally unique; if several bindings share a
          name, the payer must pick one (the UI lists them).
        </p>
      </div>
    </section>
  );
}
