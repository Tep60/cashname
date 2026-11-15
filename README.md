# CashName

Pay Bitcoin Cash to a handle like `alice.bch`.

CashName binds a BCH wallet to a Nostr identity with proofs of both keys, publishes the binding on public relays, and lets anyone resolve the handle and send BCH. Built for [BCH BLAZE 2026](https://bchblaze.cash/) (Mainnet track + Paytaca Decentralized Identity bounty).

- Live demo: https://tep60.github.io/cashname/
- Protocol: [PROTOCOL.md](./PROTOCOL.md)
- Deck: [deck.md](./deck.md) or the live `#/deck` page

## For judges

1. Open the live demo. The top banner has this deck, the source repo, and the CashTokens address for EMBER2026 donations.
2. Connect Paytaca (or another WizardConnect wallet). A local demo wallet is available if you only want to see the cryptography.
3. Bind a handle, look it up, send a small mainnet payment (~0.0001 BCH), and try the challenge-response under Auth.

The useful mainnet transaction is **pay-by-handle**. The identity proof itself is an unbroadcastable transaction because WizardConnect cannot sign arbitrary messages.

## Develop

```bash
npm install
npm test
npm run dev
```

The dev server is enough for local work. The production site is the `dist` folder, hosted on GitHub Pages at `/cashname/`.

## Addresses

- Donation / prize (CashTokens-aware): `bitcoincash:zq9c3mchg56jszu9nwlynz3wdz0ln509xyeauzjdau`
- Same key, standard P2PKH: `bitcoincash:qq9c3mchg56jszu9nwlynz3wdz0ln509xy7h0uutz0`

The private key for that wallet is not in this repository.

## License

MIT
