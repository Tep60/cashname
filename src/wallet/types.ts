import type { Output, Transaction } from "@bitauth/libauth";
import type { BchNetwork } from "../bch/address";

export type WalletKind = "wizard" | "local";

export type ConnectedWallet = {
  kind: WalletKind;
  network: BchNetwork;
  name: string;
  address: string;
  tokenAddress: string;
  publicKey: Uint8Array;
  /** Sign one already-prepared input and return the updated transaction. */
  signInput: (
    transaction: Transaction,
    sourceOutputs: Output[],
    inputIndex: number,
  ) => Promise<Transaction>;
  /**
   * Ask the wallet to sign the whole transaction (WizardConnect). Local wallets
   * sign each input in this process too.
   */
  signTransaction: (params: {
    transaction: Transaction;
    sourceOutputs: Output[];
    inputPaths: [number, "receive" | "change" | "defi", number][];
    broadcast: boolean;
    userPrompt: string;
  }) => Promise<{ signedHex: string }>;
  disconnect: () => Promise<void>;
};
