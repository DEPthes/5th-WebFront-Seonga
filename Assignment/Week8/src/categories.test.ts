import { test } from "node:test";
import assert from "node:assert/strict";
import { addCategory, getCategories } from "./categories.ts";

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

test("addCategory adds a new category and reports saved: true", () => {
  fakeStorage.clear();
  const saved = addCategory("expense", "반려동물");
  assert.equal(saved, true);
  assert.ok(getCategories("expense").includes("반려동물"));
});

test("addCategory is a no-op for a duplicate category", () => {
  fakeStorage.clear();
  addCategory("expense", "반려동물");
  const before = getCategories("expense").length;
  addCategory("expense", "반려동물");
  assert.equal(getCategories("expense").length, before);
});

test("addCategory reports saved: false when the storage write throws", () => {
  fakeStorage.clear();
  fakeStorage.failWrites = true;
  const saved = addCategory("expense", "새카테고리");
  assert.equal(saved, false);
});

test("corrupted custom-category storage falls back to defaults without throwing", () => {
  fakeStorage.clear();
  fakeStorage.setItem("ledger-custom-categories", "not valid json");
  const categories = getCategories("expense");
  assert.ok(categories.every((c) => typeof c === "string"));
});
