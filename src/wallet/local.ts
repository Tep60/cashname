import {
  decodePrivateKeyWif,
  encodePrivateKeyWif,
  generatePrivateKey,
  type Output,
  type Transaction,
} from "@bitauth/libauth";
import {
  addressesFromPubkey,
  compressedPubkeyFromPrivateKey,
  type BchNetwork,
} from "../bch/address";
import { signInputP2pkh } from "../bch/signP2pkh";

const storageKey = (network: BchNetwork) => `cashname-local-bch-key:${network}`;

export type LocalBchWallet = {
  kind: "local";
  network: BchNetwork;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  wif: string;
  address: string;
  tokenAddress: string;
};

export function walletFromPrivateKey(privateKey: Uint8Array, network: BchNetwork): LocalBchWallet {
  const publicKey = compressedPubkeyFromPrivateKey(privateKey);
  const addresses = addressesFromPubkey(publicKey, network);
  return {
    kind: "local",
    network,
    privateKey,
    publicKey,
    wif: encodePrivateKeyWif(privateKey, network === "chipnet" ? "testnet" : "mainnet"),
    address: addresses.p2pkh,
    tokenAddress: addresses.tokenAware,
  };
}

export function createLocalWallet(network: BchNetwork): LocalBchWallet {
  return walletFromPrivateKey(generatePrivateKey(), network);
}

export function loadLocalWallet(network: BchNetwork): LocalBchWallet | null {
  if (typeof localStorage === "undefined") return null;
  const wif = localStorage.getItem(storageKey(network));
  if (!wif) return null;
  const decoded = decodePrivateKeyWif(wif);
  if (typeof decoded === "string") return null;
  return walletFromPrivateKey(decoded.privateKey, network);
}

export function storeLocalWallet(wallet: LocalBchWallet): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey(wallet.network), wallet.wif);
}

export function clearLocalWallet(network: BchNetwork): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(storageKey(network));
}

export function signWithLocalWallet(
  wallet: LocalBchWallet,
  transaction: Transaction,
  sourceOutputs: Output[],
  inputIndex: number,
): Transaction {
  return signInputP2pkh(transaction, sourceOutputs, inputIndex, wallet.privateKey, wallet.publicKey);
}
