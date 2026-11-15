# CashName — Widget Factory deck

HTML version: live site, `#/deck` (arrow keys). This is the same content in Markdown.

## 1. CashName

Pay Bitcoin Cash to a handle, not a cashaddr.

BCH BLAZE 2026 · Mainnet track and Paytaca Decentralized Identity bounty.

Solo project · Tep60

## 2. The problem

A Bitcoin Cash address is accurate and hostile to share.

People already have portable keys on Nostr. Wallets already know how to send BCH. What is missing is a verifiable link between the two that does not depend on a company's database.

## 3. The widget

`alice.bch`

A user binds a BCH wallet to a Nostr key, publishes the binding to relays, and anyone can send BCH to that handle. The same binding can authenticate the user to another app with a challenge-response.

## 4. How the proofs work

Two different keys, one canonical message.

- The Nostr key signs a kind 31250 event.
- The BCH key signs an unbroadcastable proof transaction (WizardConnect has no signMessage). The fake outpoint and OP_RETURN commit to the same message, so the signature cannot be reused as a payment.
- Anyone verifies both signatures without us.

## 5. What to click

1. Connect Paytaca with WizardConnect (or the local demo wallet).
2. Bind a handle.
3. Look it up from a clean state and confirm both proofs pass.
4. Send a small mainnet payment to the resolved address (~0.0001 BCH).
5. Run the challenge-response.

## 6. Business potential

Handles are how people already pay each other. Merchants, tipping, invoices, and wallet address books can resolve a name instead of pasting a cashaddr.

The protocol is a library, not a custodial product. Wallets and Nostr clients can adopt it without asking CashName for permission.

## 7. Links

- Live demo and source: https://github.com/Tep60/cashname
- Pages: https://tep60.github.io/cashname/
- EMBER2026 / prizes: `bitcoincash:zq9c3mchg56jszu9nwlynz3wdz0ln509xyeauzjdau`

Built for BCH BLAZE 2026 by Tep60.
