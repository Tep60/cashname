import { useEffect, useState } from "react";
import type { BchNetwork } from "./bch/address";
import type { ConnectedWallet } from "./wallet/types";
import { Banner } from "./ui/Banner";
import { WalletBar } from "./ui/WalletBar";
import { Home } from "./ui/Home";
import { Bind } from "./ui/Bind";
import { Send } from "./ui/Send";
import { Lookup } from "./ui/Lookup";
import { Verify } from "./ui/Verify";
import { Deck } from "./ui/Deck";
import { Protocol } from "./ui/Protocol";

const routes = ["", "bind", "send", "lookup", "verify", "deck", "protocol"] as const;
type Route = (typeof routes)[number];

function currentRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return (routes as readonly string[]).includes(hash) ? (hash as Route) : "";
}

function href(route: Route) {
  return `${import.meta.env.BASE_URL}#/${route}`;
}

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute);
  const [network, setNetwork] = useState<BchNetwork>("mainnet");
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) window.location.hash = "#/";
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <Banner />
      <main className="shell">
        <nav className="site">
          <a className={route === "" ? "active" : ""} href={href("")}>
            Home
          </a>
          <a className={route === "bind" ? "active" : ""} href={href("bind")}>
            Bind
          </a>
          <a className={route === "send" ? "active" : ""} href={href("send")}>
            Pay
          </a>
          <a className={route === "lookup" ? "active" : ""} href={href("lookup")}>
            Lookup
          </a>
          <a className={route === "verify" ? "active" : ""} href={href("verify")}>
            Auth
          </a>
          <a className={route === "deck" ? "active" : ""} href={href("deck")}>
            Deck
          </a>
          <a className={route === "protocol" ? "active" : ""} href={href("protocol")}>
            Protocol
          </a>
        </nav>
        {route !== "deck" && (
          <WalletBar network={network} onNetwork={setNetwork} wallet={wallet} onWallet={setWallet} />
        )}
        {route === "" && <Home />}
        {route === "bind" && <Bind network={network} wallet={wallet} />}
        {route === "send" && <Send network={network} wallet={wallet} />}
        {route === "lookup" && <Lookup />}
        {route === "verify" && <Verify />}
        {route === "deck" && <Deck />}
        {route === "protocol" && <Protocol />}
        <p className="footer-note">
          CashName is a BCH BLAZE 2026 entry. Identity data is published only to the
          Nostr relays you choose. The prize wallet key is not in this app.
        </p>
      </main>
    </>
  );
}
