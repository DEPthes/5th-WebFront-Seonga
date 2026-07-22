import { test } from "node:test";
import assert from "node:assert/strict";
import { getCategoryTotals, getMonthlyTotals, getIncomeExpenseRatio } from "./stats.ts";
import type { Transaction } from "./types.ts";

const sample: Transaction[] = [
  { id: 1, type: "expense", category: "식비", amount: 10000, date: "2026-06-15", memo: "" },
  { id: 2, type: "expense", category: "식비", amount: 5000, date: "2026-07-01", memo: "" },
  { id: 3, type: "expense", category: "교통비", amount: 3000, date: "2026-07-02", memo: "" },
  { id: 4, type: "income", category: "급여", amount: 30000, date: "2026-07-01", memo: "" },
];

test("getCategoryTotals sums per category for the given type, sorted descending", () => {
  assert.deepEqual(getCategoryTotals(sample, "expense"), [
    { category: "식비", amount: 15000 },
    { category: "교통비", amount: 3000 },
  ]);
});

test("getCategoryTotals returns only matching-type categories", () => {
  assert.deepEqual(getCategoryTotals(sample, "income"), [{ category: "급여", amount: 30000 }]);
});

test("getMonthlyTotals groups by year-month and sorts ascending", () => {
  assert.deepEqual(getMonthlyTotals(sample), [
    { month: "2026-06", income: 0, expense: 10000 },
    { month: "2026-07", income: 30000, expense: 8000 },
  ]);
});

test("getIncomeExpenseRatio computes each type's share of the total", () => {
  const ratio = getIncomeExpenseRatio(sample);
  assert.equal(ratio.incomeRatio, 30000 / 48000);
  assert.equal(ratio.expenseRatio, 18000 / 48000);
});

test("getIncomeExpenseRatio returns zeros when there are no transactions", () => {
  assert.deepEqual(getIncomeExpenseRatio([]), { incomeRatio: 0, expenseRatio: 0 });
});
