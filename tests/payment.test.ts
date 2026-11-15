import { describe, expect, it } from "vitest";
import { generatePrivateKey } from "@bitauth/libauth";
import { compressedPubkeyFromPrivateKey, encodeP2pkh } from "../src/bch/address";
import { createVirtualMachineBCH } from "@bitauth/libauth";
import { buildPaymentTx, estimateFee, selectUtxos, signPaymentWithKey, type Utxo } from "../src/bch/payment";

function wallet() {
  const secret = generatePrivateKey();
  const pub = compressedPubkeyFromPrivateKey(secret);
  return { secret, pub, address: encodeP2pkh(pub, "mainnet") };
}

describe("coin selection", () => {
  it("picks enough inputs and leaves change above dust", () => {
    const utxos: Utxo[] = [
      { txid: "11".repeat(32), vout: 0, valueSatoshis: 1000n, address: "x" },
      { txid: "22".repeat(32), vout: 1, valueSatoshis: 20_000n, address: "x" },
    ];
    const result = selectUtxos(utxos, 10_000n);
    expect(result.chosen.length).toBeGreaterThan(0);
    expect(result.change === 0n || result.change >= 546n).toBe(true);
    expect(result.fee).toBeGreaterThanOrEqual(estimateFee(result.chosen.length, result.change > 0n ? 2 : 1));
  });

  it("throws when funds are insufficient", () => {
    const utxos: Utxo[] = [{ txid: "11".repeat(32), vout: 0, valueSatoshis: 1000n, address: "x" }];
    expect(() => selectUtxos(utxos, 10_000n)).toThrow(/not enough funds/);
  });
});

describe("payment signatures", () => {
  it("produces a transaction the BCH VM accepts", () => {
    const payer = wallet();
    const payee = wallet();
    const fakeTxid = "ab".repeat(32);
    const utxos: Utxo[] = [
      { txid: fakeTxid, vout: 0, valueSatoshis: 20_000n, address: payer.address },
    ];
    const built = buildPaymentTx({
      utxos,
      toAddress: payee.address,
      amountSatoshis: 10_000n,
      changeAddress: payer.address,
    });
    const signed = signPaymentWithKey(built, payer.secret, payer.pub);
    const vm = createVirtualMachineBCH();
    const verified = vm.verify({
      transaction: signed.transaction,
      sourceOutputs: signed.sourceOutputs,
    });
    expect(verified).toBe(true);
  });
});
