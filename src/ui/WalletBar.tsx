import { useEffect, useMemo, useState } from "react";
import { useWizardConnect, WizardConnectQRDialog } from "@wizardconnect/react";
import { encodeTransaction, binToHex } from "@bitauth/libauth";
import { addressesFromPubkey, type BchNetwork } from "../bch/address";
import { toWcSourceOutputs } from "../bch/signP2pkh";
import {
  clearLocalWallet,
  createLocalWallet,
  loadLocalWallet,
  signWithLocalWallet,
  storeLocalWallet,
  type LocalBchWallet,
} from "../wallet/local";
import type { ConnectedWallet } from "../wallet/types";

function pubkeyToHexPreview(pub: Uint8Array): string {
  const hex = [...pub].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 10)}…`;
}

export function WalletBar(props: {
  network: BchNetwork;
  onNetwork: (n: BchNetwork) => void;
  wallet: ConnectedWallet | null;
  onWallet: (w: ConnectedWallet | null) => void;
}) {
  const wc = useWizardConnect({ dappName: "CashName" });
  const [error, setError] = useState<string | null>(null);

  const wizardWallet = useMemo(() => {
    if (wc.state !== "connected" || !wc.manager) return null;
    const pub = wc.manager.getPubkey(0, 0n);
    if (!pub) return null;
    const addresses = addressesFromPubkey(pub, props.network);
    const manager = wc.manager;
    const connected: ConnectedWallet = {
      kind: "wizard",
      network: props.network,
      name: wc.walletName ?? "WizardConnect wallet",
      address: addresses.p2pkh,
      tokenAddress: addresses.tokenAware,
      publicKey: pub,
      signInput: async () => {
        throw new Error("WizardConnect signs the whole transaction, not one input at a time");
      },
      signTransaction: async ({ transaction, sourceOutputs, inputPaths, broadcast, userPrompt }) => {
        const response = await manager.signTransaction({
          transaction: {
            transaction: binToHex(encodeTransaction(transaction)),
            sourceOutputs: toWcSourceOutputs(transaction, sourceOutputs),
            broadcast,
            userPrompt,
          },
          inputPaths,
        });
        if (!response.signedTransaction) throw new Error(response.error || "wallet did not return a signed transaction");
        return { signedHex: response.signedTransaction };
      },
      disconnect: () => wc.disconnect(),
    };
    return connected;
  }, [wc.state, wc.manager, wc.walletName, props.network]);

  useEffect(() => {
    if (wizardWallet && props.wallet?.kind !== "local") {
      props.onWallet(wizardWallet);
    }
  }, [wizardWallet]);

  const using = props.wallet ?? wizardWallet;

  function attachLocal(wallet: LocalBchWallet) {
    storeLocalWallet(wallet);
    const connected: ConnectedWallet = {
      kind: "local",
      network: wallet.network,
      name: "Local demo wallet",
      address: wallet.address,
      tokenAddress: wallet.tokenAddress,
      publicKey: wallet.publicKey,
      signInput: async (transaction, sourceOutputs, inputIndex) =>
        signWithLocalWallet(wallet, transaction, sourceOutputs, inputIndex),
      signTransaction: async ({ transaction, sourceOutputs }) => {
        let tx = transaction;
        for (let i = 0; i < transaction.inputs.length; i += 1) {
          tx = signWithLocalWallet(wallet, tx, sourceOutputs, i);
        }
        return { signedHex: binToHex(encodeTransaction(tx)) };
      },
      disconnect: async () => {
        clearLocalWallet(wallet.network);
        props.onWallet(null);
      },
    };
    props.onWallet(connected);
  }

  return (
    <div className="wallet-bar">
      <label style={{ margin: 0 }}>
        Network{" "}
        <select
          value={props.network}
          onChange={(e) => {
            props.onNetwork(e.target.value as BchNetwork);
            props.onWallet(null);
          }}
          style={{ width: "auto" }}
        >
          <option value="mainnet">mainnet</option>
          <option value="chipnet">chipnet</option>
        </select>
      </label>

      {using ? (
        <>
          <span className="pill">{using.kind === "wizard" ? "WizardConnect" : "local demo"}</span>
          <span className="mono">{using.address}</span>
          <span className="muted mono">{pubkeyToHexPreview(using.publicKey)}</span>
          <button className="secondary" type="button" onClick={() => void using.disconnect().then(() => props.onWallet(null))}>
            Disconnect
          </button>
        </>
      ) : (
        <>
          <button type="button" className="ember" onClick={() => { setError(null); wc.connect(); }}>
            Connect with WizardConnect
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setError(null);
              const existing = loadLocalWallet(props.network) ?? createLocalWallet(props.network);
              attachLocal(existing);
            }}
          >
            Use a local demo wallet
          </button>
          <span className="muted">Local keys stay in this browser. Judges should use WizardConnect on mainnet.</span>
        </>
      )}

      {wc.uri && wc.qrUri && (
        <div className="qr-wrap" style={{ width: "100%" }}>
          <WizardConnectQRDialog
            show={wc.state === "connecting"}
            onClose={() => void wc.disconnect()}
            uri={wc.uri}
            qrUri={wc.qrUri}
            title="CashName"
            subtitle="Scan with Paytaca or another WizardConnect wallet"
          />
        </div>
      )}
      {(error || wc.error) && <div className="err">{error || wc.error}</div>}
    </div>
  );
}
