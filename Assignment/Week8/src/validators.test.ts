import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isTransaction,
  parseTransactions,
  isCategoryMap,
  parseCategories,
  validateTransactionInput,
} from "./validators.ts";

test("isTransaction accepts a well-formed transaction", () => {
  assert.equal(
    isTransaction({ id: 1, type: "expense", category: "식비", amount: 1000, date: "2026-07-23", memo: "" }),
    true,
  );
});

test("isTransaction rejects wrong field types or shapes", () => {
  assert.equal(
    isTransaction({ id: "1", type: "expense", category: "식비", amount: 1000, date: "2026-07-23", memo: "" }),
    false,
  );
  assert.equal(
    isTransaction({ id: 1, type: "invalid", category: "식비", amount: 1000, date: "2026-07-23", memo: "" }),
    false,
  );
  assert.equal(isTransaction(null), false);
});

test("parseTransactions flags hadError on malformed JSON", () => {
  const result = parseTransactions("not json{{{");
  assert.deepEqual(result.data, []);
  assert.equal(result.hadError, true);
});

test("parseTransactions filters invalid entries and flags hadError", () => {
  const raw = JSON.stringify([
    { id: 1, type: "expense", category: "식비", amount: 1000, date: "2026-07-23", memo: "" },
    { id: 2, type: "expense" },
  ]);
  const result = parseTransactions(raw);
  assert.equal(result.data.length, 1);
  assert.equal(result.hadError, true);
});

test("parseTransactions reports hadError: false when every entry is valid", () => {
  const raw = JSON.stringify([
    { id: 1, type: "income", category: "급여", amount: 5000, date: "2026-07-23", memo: "" },
  ]);
  const result = parseTransactions(raw);
  assert.equal(result.data.length, 1);
  assert.equal(result.hadError, false);
});

test("isCategoryMap validates the { income, expense } shape", () => {
  assert.equal(isCategoryMap({ income: ["급여"], expense: ["식비"] }), true);
  assert.equal(isCategoryMap({ income: ["급여"] }), false);
  assert.equal(isCategoryMap({ income: [1], expense: [] }), false);
});

test("parseCategories falls back to empty lists on malformed data", () => {
  assert.deepEqual(parseCategories("not json"), { income: [], expense: [] });
  assert.deepEqual(parseCategories(JSON.stringify({ income: ["급여"] })), { income: [], expense: [] });
});

test("validateTransactionInput reports field-specific errors", () => {
  assert.equal(
    validateTransactionInput({ category: "  ", amount: 1000, date: "2026-07-23" }),
    "카테고리를 입력해주세요.",
  );
  assert.equal(
    validateTransactionInput({ category: "식비", amount: 10.5, date: "2026-07-23" }),
    "금액은 정수로 입력해주세요.",
  );
  assert.equal(
    validateTransactionInput({ category: "식비", amount: 0, date: "2026-07-23" }),
    "금액은 0보다 커야 합니다.",
  );
  assert.equal(
    validateTransactionInput({ category: "식비", amount: Number.MAX_SAFE_INTEGER + 1, date: "2026-07-23" }),
    "금액이 너무 큽니다.",
  );
  assert.equal(validateTransactionInput({ category: "식비", amount: 1000, date: "" }), "날짜를 입력해주세요.");
  assert.equal(validateTransactionInput({ category: "식비", amount: 1000, date: "2026-07-23" }), null);
});
