import { test } from "node:test";
import assert from "node:assert/strict";
import { Ledger } from "./Ledger.ts";

class FakeStorage {
  private store = new Map<string, string>();
  failWrites = false;
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("quota exceeded");
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
    this.failWrites = false;
  }
}

const fakeStorage = new FakeStorage();
globalThis.localStorage = fakeStorage as unknown as Storage;

test("addTransaction persists and reports saved: true", () => {
  fakeStorage.clear();
  const ledger = new Ledger();
  const { transaction, saved } = ledger.addTransaction({
    type: "expense",
    category: "식비",
    amount: 1000,
    date: "2026-07-23",
    memo: "",
  });
  assert.equal(saved, true);
  assert.equal(transaction.category, "식비");
  assert.equal(ledger.getTotalExpense(), 1000);
});

test("addTransaction reports saved: false when the storage write throws", () => {
  fakeStorage.clear();
  const ledger = new Ledger();
  fakeStorage.failWrites = true;
  const { saved } = ledger.addTransaction({
    type: "income",
    category: "급여",
    amount: 5000,
    date: "2026-07-23",
    memo: "",
  });
  assert.equal(saved, false);
});

test("removeTransaction removes the entry and reports save status", () => {
  fakeStorage.clear();
  const ledger = new Ledger();
  const { transaction } = ledger.addTransaction({
    type: "expense",
    category: "교통비",
    amount: 500,
    date: "2026-07-23",
    memo: "",
  });
  const saved = ledger.removeTransaction(transaction.id);
  assert.equal(saved, true);
  assert.deepEqual(ledger.getTransactions(), []);
});

test("hadCorruptData is true when stored JSON is not a transaction array", () => {
  fakeStorage.clear();
  fakeStorage.setItem("ledger-transactions", JSON.stringify({ not: "an array" }));
  const ledger = new Ledger();
  assert.equal(ledger.hadCorruptData, true);
  assert.deepEqual(ledger.getTransactions(), []);
});

test("hadCorruptData is false for well-formed stored data", () => {
  fakeStorage.clear();
  fakeStorage.setItem(
    "ledger-transactions",
    JSON.stringify([{ id: 1, type: "expense", category: "식비", amount: 1000, date: "2026-07-23", memo: "" }]),
  );
  const ledger = new Ledger();
  assert.equal(ledger.hadCorruptData, false);
});
