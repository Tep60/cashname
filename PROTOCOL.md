# cashname/v1

CashName binds a Bitcoin Cash P2PKH key to a Nostr key so a handle such as `alice.bch` can be resolved to a cashaddr, and so another application can authenticate that identity.

There is no CashName server in the verification path. Bindings live on public Nostr relays.

## Canonical message

Both keys attest to the same UTF-8 message, with fields normalized to lowercase and a trailing-newline-free body:

```
cashname/v1
bch: bitcoincash:q...
nostr: <32-byte hex pubkey>
handle: alice
nonce: <32-byte hex>
issued: <unix seconds>
```

The BCH and Nostr keys must be different secp256k1 keys. Reusing one key for both sides is rejected.

## Nostr proof

A parameterized replaceable event:

- kind `31250`
- tags: `d=cashname/v1`, `h=<handle>`, `i=bch:<cashaddr>`, `client=cashname`
- content: JSON (`CashNameBinding`) including the canonical fields, the token-aware address, the compressed BCH public key, and the BCH proof

The event signature is the Nostr proof of control.

## BCH proof

WizardConnect, the wallet protocol required by BCH BLAZE 2026, can sign transactions but has no generic `signMessage`. CashName therefore uses a **non-broadcastable proof transaction**:

- One input, whose outpoint hash is `SHA256("cashname/v1/utxo\n" || canonical message)` and whose source output is a 1000-sat P2PKH of the claimed address. That outpoint does not exist on chain.
- One output: `OP_RETURN` with `cashname/v1:` plus `SHA256(canonical message)`.
- The wallet signs this transaction with SIGHASH_ALL|FORKID and must **not** broadcast it.

A verifier rebuilds the expected outpoint and OP_RETURN, checks the source locking bytecode matches the claimed address, and verifies the P2PKH signature. The signed bytes cannot be broadcast as a payment.

## Discovery

Clients query relays for kind `31250` with `#h=<handle>` or by author pubkey. Invalid events are discarded. Handles are conveniences, not globally unique names. If several valid bindings share a handle, the payer chooses one.

## Pay-by-handle

After verification, send BCH to the `bchAddress` in the binding (standard P2PKH). The binding also lists a CashTokens-aware address for token transfers.

## Challenge-response

A verifier issues a nonce (`challenge`, `issuedAt`, optional `audience`). The bound Nostr key signs a kind `31251` event that echoes the nonce. The verifier checks the signature against the binding, the nonce, and a 10-minute window.

## What this is not

- Not a DNS name or NIP-05 registration.
- Not a custodial account.
- Not satisfied by putting a cashaddr in a Nostr profile with no BCH signature.
