# 가계부 검증/에러UI/통계 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unchecked `JSON.parse`/`any` usage with validated parsing, extract form validation into reusable functions, surface all of this (plus storage failures and corrupt-data recovery) through a native `<dialog>` error message, and add a statistics tab (category totals, monthly trend, income/expense ratio) to the existing household-ledger SPA.

**Architecture:** Pure logic (type guards, parsers, form validation, stats aggregation) lives in two new framework-free modules (`src/validators.ts`, `src/stats.ts`) that are unit-testable in plain Node. `Ledger.ts` and `categories.ts` are updated to use the parsers and to report success/failure of `localStorage` writes instead of swallowing errors silently. `main.ts` and `index.html` wire everything into the UI: a `<dialog>` for error messages and a tab toggle (no router) between the existing ledger view and a new stats view.

**Tech Stack:** TypeScript (Vite, no framework), native `<dialog>`, Node's built-in `node:test` + `node:assert/strict` test runner (Node 24 strips TypeScript types natively — no ts-node/tsx/vitest needed). No new npm dependencies.

## Global Constraints

- No new npm dependencies (project only has `typescript` and `vite`; confirmed no `@types/node` installed).
- Test files run directly via `node --test src/*.test.ts` using Node 24's built-in TypeScript stripping. Relative imports inside test files must use explicit `.ts` extensions (Node ESM resolution requirement); app source files keep the project's existing extension-less import convention (Vite/bundler resolution).
- Since there's no `@types/node`, add a small ambient shim (`src/node-test-shim.d.ts`) declaring only the `node:test`/`node:assert/strict` exports actually used, so `tsc` (part of `npm run build`) still type-checks the test files without pulling in a dependency.
- All new user-facing strings are Korean, matching the existing app's tone.
- `localStorage` remains the only persistence layer — no backend.
- `Transaction`/`NewTransaction`/`TransactionType` types (`src/types.ts`) are unchanged and are the source of truth other modules build on.

**Note on import extensions (Task 3 & 4):** The code blocks below show `import { parseTransactions } from "./validators"` (Task 3, line 516) and `import { parseCategories } from "./validators"` (Task 4, line 605) without `.ts` extensions in the plan text. The actual implementation correctly uses `./validators.ts` in both `src/Ledger.ts` and `src/categories.ts` — this is a verified, approved deviation from the plan's literal code, required by Node's native TypeScript test runner (`node --test`), not an error to fix back.

---

### Task 1: `src/validators.ts` — safe parsing + form validation

**Files:**
- Create: `src/validators.ts`
- Create: `src/validators.test.ts`
- Create: `src/node-test-shim.d.ts`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Consumes: `Transaction`, `NewTransaction`, `TransactionType` from `src/types.ts`
- Produces (used by Task 3, 4, 5):
  - `isTransaction(x: unknown): x is Transaction`
  - `interface ParseResult<T> { data: T; hadError: boolean }`
  - `parseTransactions(raw: string): ParseResult<Transaction[]>`
  - `isCategoryMap(x: unknown): x is Record<TransactionType, string[]>`
  - `parseCategories(raw: string): Record<TransactionType, string[]>`
  - `validateTransactionInput(input: Pick<NewTransaction, "category" | "amount" | "date">): string | null`

- [ ] **Step 1: Write the ambient type shim for `node:test`/`node:assert/strict`**

```typescript
// src/node-test-shim.d.ts
declare module "node:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
}

declare module "node:assert/strict" {
  interface Assert {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): void;
  }
  const assert: Assert;
  export default assert;
}
```

- [ ] **Step 2: Write the failing tests**

```typescript
// src/validators.test.ts
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
```

- [ ] **Step 3: Add the `test` script and run to verify failure**

Edit `package.json` scripts block to add:
```json
"test": "node --test src/*.test.ts"
```

Run: `npm test`
Expected: FAIL — `Cannot find module './validators.ts'`

- [ ] **Step 4: Implement `src/validators.ts`**

```typescript
// src/validators.ts
import type { NewTransaction, Transaction, TransactionType } from "./types";

function isTransactionType(x: unknown): x is TransactionType {
  return x === "income" || x === "expense";
}

export function isTransaction(x: unknown): x is Transaction {
  if (typeof x !== "object" || x === null) return false;
  const t = x as Record<string, unknown>;
  return (
    typeof t.id === "number" &&
    isTransactionType(t.type) &&
    typeof t.category === "string" &&
    typeof t.amount === "number" &&
    Number.isFinite(t.amount) &&
    typeof t.date === "string" &&
    typeof t.memo === "string"
  );
}

export interface ParseResult<T> {
  data: T;
  hadError: boolean;
}

export function parseTransactions(raw: string): ParseResult<Transaction[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { data: [], hadError: true };
  }
  if (!Array.isArray(parsed)) return { data: [], hadError: true };
  const valid = parsed.filter(isTransaction);
  return { data: valid, hadError: valid.length !== parsed.length };
}

export function isCategoryMap(x: unknown): x is Record<TransactionType, string[]> {
  if (typeof x !== "object" || x === null) return false;
  const m = x as Record<string, unknown>;
  return (
    Array.isArray(m.income) &&
    m.income.every((c) => typeof c === "string") &&
    Array.isArray(m.expense) &&
    m.expense.every((c) => typeof c === "string")
  );
}

export function parseCategories(raw: string): Record<TransactionType, string[]> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isCategoryMap(parsed) ? parsed : { income: [], expense: [] };
  } catch {
    return { income: [], expense: [] };
  }
}

export function validateTransactionInput(
  input: Pick<NewTransaction, "category" | "amount" | "date">,
): string | null {
  if (!input.category.trim()) return "카테고리를 입력해주세요.";
  if (!Number.isFinite(input.amount) || !Number.isInteger(input.amount)) {
    return "금액은 정수로 입력해주세요.";
  }
  if (input.amount <= 0) return "금액은 0보다 커야 합니다.";
  if (input.amount > Number.MAX_SAFE_INTEGER) return "금액이 너무 큽니다.";
  if (!input.date) return "날짜를 입력해주세요.";
  return null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all `validators.test.ts` tests PASS (0 fail)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/validators.ts src/validators.test.ts src/node-test-shim.d.ts package.json
git commit -m "feat: add validated JSON parsing and form-input validation helpers"
```

---

### Task 2: `src/stats.ts` — pure statistics functions

**Files:**
- Create: `src/stats.ts`
- Create: `src/stats.test.ts`

**Interfaces:**
- Consumes: `Transaction`, `TransactionType` from `src/types.ts`
- Produces (used by Task 5):
  - `interface CategoryTotal { category: string; amount: number }`
  - `getCategoryTotals(transactions: Transaction[], type: TransactionType): CategoryTotal[]` (sorted descending by amount)
  - `interface MonthlyTotal { month: string; income: number; expense: number }`
  - `getMonthlyTotals(transactions: Transaction[]): MonthlyTotal[]` (`month` = `"YYYY-MM"`, sorted ascending)
  - `interface IncomeExpenseRatio { incomeRatio: number; expenseRatio: number }`
  - `getIncomeExpenseRatio(transactions: Transaction[]): IncomeExpenseRatio` (both `0` when there are no transactions)

- [ ] **Step 1: Write the failing tests**

```typescript
// src/stats.test.ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `Cannot find module './stats.ts'`

- [ ] **Step 3: Implement `src/stats.ts`**

```typescript
// src/stats.ts
import type { Transaction, TransactionType } from "./types";

export interface CategoryTotal {
  category: string;
  amount: number;
}

export function getCategoryTotals(transactions: Transaction[], type: TransactionType): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export interface MonthlyTotal {
  month: string;
  income: number;
  expense: number;
}

export function getMonthlyTotals(transactions: Transaction[]): MonthlyTotal[] {
  const totals = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const entry = totals.get(month) ?? { income: 0, expense: 0 };
    entry[t.type] += t.amount;
    totals.set(month, entry);
  }
  return [...totals.entries()]
    .map(([month, totalsForMonth]) => ({ month, ...totalsForMonth }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface IncomeExpenseRatio {
  incomeRatio: number;
  expenseRatio: number;
}

export function getIncomeExpenseRatio(transactions: Transaction[]): IncomeExpenseRatio {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  const total = income + expense;
  if (total === 0) return { incomeRatio: 0, expenseRatio: 0 };
  return { incomeRatio: income / total, expenseRatio: expense / total };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all `stats.test.ts` tests PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/stats.ts src/stats.test.ts
git commit -m "feat: add category/monthly/ratio statistics functions"
```

---

### Task 3: Wire `Ledger.ts` to validated parsing + reported save success

**Files:**
- Modify: `src/Ledger.ts`
- Create: `src/Ledger.test.ts`

**Interfaces:**
- Consumes: `parseTransactions` from `src/validators.ts` (Task 1)
- Produces (used by Task 5):
  - `class Ledger` constructor takes no args (unchanged)
  - `readonly hadCorruptData: boolean` (new public field)
  - `addTransaction(data: NewTransaction): { transaction: Transaction; saved: boolean }` (return type changed from `Transaction`)
  - `removeTransaction(id: number): boolean` (return type changed from `void`)
  - `getTransactions()`, `getTotalIncome()`, `getTotalExpense()`, `getBalance()` unchanged

- [ ] **Step 1: Write the failing tests (with an in-memory fake `localStorage`)**

```typescript
// src/Ledger.test.ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `Ledger` constructor/methods don't yet match the new shape (`saved`/`hadCorruptData` undefined, assertions fail)

- [ ] **Step 3: Implement the changes in `src/Ledger.ts`**

```typescript
// src/Ledger.ts
import type { NewTransaction, Transaction, TransactionType } from "./types";
import { parseTransactions } from "./validators";

const STORAGE_KEY = "ledger-transactions";

export class Ledger {
  readonly hadCorruptData: boolean;
  private transactions: Transaction[];
  private nextId: number;

  constructor() {
    const { data, hadError } = this.load();
    this.transactions = data;
    this.hadCorruptData = hadError;
    this.nextId = this.transactions.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  }

  addTransaction(data: NewTransaction): { transaction: Transaction; saved: boolean } {
    const transaction: Transaction = { id: this.nextId++, ...data };
    this.transactions.push(transaction);
    return { transaction, saved: this.save() };
  }

  removeTransaction(id: number): boolean {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    return this.save();
  }

  getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  getTotalIncome(): number {
    return this.sumByType("income");
  }

  getTotalExpense(): number {
    return this.sumByType("expense");
  }

  getBalance(): number {
    return this.getTotalIncome() - this.getTotalExpense();
  }

  private sumByType(type: TransactionType): number {
    return this.transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);
  }

  private load(): { data: Transaction[]; hadError: boolean } {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseTransactions(raw) : { data: [], hadError: false };
  }

  private save(): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.transactions));
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all `Ledger.test.ts` tests PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (this will also surface the now-outdated call sites in `main.ts` — that's expected, Task 5 fixes them)

- [ ] **Step 6: Commit**

```bash
git add src/Ledger.ts src/Ledger.test.ts
git commit -m "feat: validate stored transactions and report save success from Ledger"
```

---

### Task 4: Wire `categories.ts` to validated parsing + reported save success

**Files:**
- Modify: `src/categories.ts`
- Create: `src/categories.test.ts`

**Interfaces:**
- Consumes: `parseCategories` from `src/validators.ts` (Task 1)
- Produces (used by Task 5):
  - `getCategories(type: TransactionType): string[]` unchanged
  - `addCategory(type: TransactionType, category: string): boolean` (return type changed from `void`)
  - `CUSTOM_CATEGORY` unchanged

- [ ] **Step 1: Write the failing tests**

```typescript
// src/categories.test.ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `addCategory` still returns `undefined`, `saved` assertions fail

- [ ] **Step 3: Implement the changes in `src/categories.ts`**

```typescript
// src/categories.ts
import type { TransactionType } from "./types";
import { parseCategories } from "./validators";

// select의 "직접추가" 옵션을 구분하는 값. 실제 카테고리명과 겹치지 않도록 예약된 문자열.
export const CUSTOM_CATEGORY = "__custom__";

const STORAGE_KEY = "ledger-custom-categories";

const DEFAULT_CATEGORIES: Record<TransactionType, string[]> = {
  expense: [
    "식비",
    "교통비",
    "주거/관리비",
    "통신비",
    "생활용품",
    "의료/건강",
    "문화/여가",
    "쇼핑",
    "교육",
    "경조사",
    "기타",
  ],
  income: ["급여", "용돈", "부수입", "투자수익", "환급/보너스", "기타"],
};

function loadCustom(): Record<TransactionType, string[]> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? parseCategories(raw) : { income: [], expense: [] };
}

export function getCategories(type: TransactionType): string[] {
  return [...DEFAULT_CATEGORIES[type], ...loadCustom()[type]];
}

export function addCategory(type: TransactionType, category: string): boolean {
  if (!category || getCategories(type).includes(category)) return true;
  const custom = loadCustom();
  custom[type].push(category);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all `categories.test.ts` tests PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (aside from the still-pending `main.ts` call sites, fixed in Task 5)

- [ ] **Step 6: Commit**

```bash
git add src/categories.ts src/categories.test.ts
git commit -m "feat: validate stored categories and report save success from addCategory"
```

---

### Task 5: Error dialog, stats tab, and UI wiring

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes:
  - `validateTransactionInput` from `src/validators.ts` (Task 1)
  - `getCategoryTotals`, `getMonthlyTotals`, `getIncomeExpenseRatio`, `type CategoryTotal` from `src/stats.ts` (Task 2)
  - `Ledger` with `hadCorruptData`, `addTransaction(...): { transaction, saved }`, `removeTransaction(...): boolean` from Task 3
  - `addCategory(...): boolean` from Task 4
- Produces: fully wired UI — no further tasks depend on this one.

- [ ] **Step 1: Update `index.html`** — add the tab nav, wrap the existing content in a `#ledger-view` div, add the `#stats-view` div, add `maxlength` to the memo/custom-category inputs, and add the error `<dialog>`.

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>가계부</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
    />
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <main class="container">
      <h1>가계부</h1>

      <nav class="tabs" aria-label="화면 전환">
        <button type="button" class="tab-btn" data-tab="ledger" aria-pressed="true">가계부</button>
        <button type="button" class="tab-btn" data-tab="stats" aria-pressed="false">통계</button>
      </nav>

      <div id="ledger-view">
        <section class="summary" id="summary">
          <article>
            <hgroup>
              <h3 id="total-income">0원</h3>
              <p>총 수입</p>
            </hgroup>
          </article>
          <article>
            <hgroup>
              <h3 id="total-expense">0원</h3>
              <p>총 지출</p>
            </hgroup>
          </article>
          <article>
            <hgroup>
              <h3 id="balance">0원</h3>
              <p>현재 잔액</p>
            </hgroup>
          </article>
        </section>

        <form id="transaction-form">
          <div class="grid">
            <select id="type" aria-label="거래 유형" required>
              <option value="expense">지출</option>
              <option value="income">수입</option>
            </select>
            <select id="category" aria-label="카테고리" required></select>
            <input id="amount" type="number" placeholder="금액" aria-label="금액" min="1" required />
            <input id="date" type="date" aria-label="날짜" required />
          </div>
          <div id="category-custom-wrap" hidden>
            <input
              id="category-custom"
              type="text"
              placeholder="새 카테고리 입력"
              aria-label="새 카테고리 입력"
              maxlength="30"
            />
            <label>
              <input id="category-save" type="checkbox" checked />
              다음에도 이 카테고리 목록에 표시
            </label>
          </div>
          <input id="memo" type="text" placeholder="메모 (선택)" aria-label="메모" maxlength="200" />
          <button type="submit">등록</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>날짜</th>
                <th>구분</th>
                <th>카테고리</th>
                <th>메모</th>
                <th>금액</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="transaction-list"></tbody>
          </table>
        </div>
      </div>

      <div id="stats-view" hidden>
        <h2>카테고리별 합계</h2>
        <div id="category-stats" class="stat-bars"></div>

        <h2>월별 수입/지출 추이</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>월</th>
                <th>수입</th>
                <th>지출</th>
              </tr>
            </thead>
            <tbody id="monthly-stats"></tbody>
          </table>
        </div>

        <h2>수입/지출 비율</h2>
        <div class="ratio-bar">
          <div id="ratio-income" class="ratio-income"></div>
          <div id="ratio-expense" class="ratio-expense"></div>
        </div>
        <p id="ratio-label"></p>
      </div>
    </main>

    <dialog id="error-dialog">
      <article>
        <p id="error-message"></p>
        <button type="button" id="error-dialog-close">확인</button>
      </article>
    </dialog>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Append tab/stat styles to `src/style.css`** (append at end of file, existing rules unchanged)

```css
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab-btn[aria-pressed="true"] {
  font-weight: bold;
  text-decoration: underline;
}

.stat-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.stat-bar-row {
  display: grid;
  grid-template-columns: 6rem 1fr 5rem;
  align-items: center;
  gap: 0.5rem;
}

.stat-bar-track {
  background: #eee;
  height: 0.75rem;
  border-radius: 0.375rem;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
}

.stat-bar-fill.income {
  background: #2e7d32;
}

.stat-bar-fill.expense {
  background: #c62828;
}

.ratio-bar {
  display: flex;
  height: 1.5rem;
  border-radius: 0.375rem;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.ratio-income {
  background: #2e7d32;
}

.ratio-expense {
  background: #c62828;
}
```

- [ ] **Step 3: Rewrite `src/main.ts`**

```typescript
import "./style.css";
import { addCategory, CUSTOM_CATEGORY, getCategories } from "./categories";
import { Ledger } from "./Ledger";
import { validateTransactionInput } from "./validators";
import { getCategoryTotals, getMonthlyTotals, getIncomeExpenseRatio, type CategoryTotal } from "./stats";
import type { TransactionType } from "./types";

const ledger = new Ledger();
const currency = new Intl.NumberFormat("ko-KR");

const form = document.querySelector<HTMLFormElement>("#transaction-form")!;
const typeInput = document.querySelector<HTMLSelectElement>("#type")!;
const categorySelect = document.querySelector<HTMLSelectElement>("#category")!;
const categoryCustomWrap = document.querySelector<HTMLElement>("#category-custom-wrap")!;
const categoryCustomInput = document.querySelector<HTMLInputElement>("#category-custom")!;
const categorySaveCheckbox = document.querySelector<HTMLInputElement>("#category-save")!;
const amountInput = document.querySelector<HTMLInputElement>("#amount")!;
const dateInput = document.querySelector<HTMLInputElement>("#date")!;
const memoInput = document.querySelector<HTMLInputElement>("#memo")!;
const listBody = document.querySelector<HTMLTableSectionElement>("#transaction-list")!;
const totalIncomeEl = document.querySelector<HTMLElement>("#total-income")!;
const totalExpenseEl = document.querySelector<HTMLElement>("#total-expense")!;
const balanceEl = document.querySelector<HTMLElement>("#balance")!;

const tabButtons = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
const ledgerView = document.querySelector<HTMLElement>("#ledger-view")!;
const statsView = document.querySelector<HTMLElement>("#stats-view")!;
const categoryStatsEl = document.querySelector<HTMLElement>("#category-stats")!;
const monthlyStatsEl = document.querySelector<HTMLTableSectionElement>("#monthly-stats")!;
const ratioIncomeEl = document.querySelector<HTMLElement>("#ratio-income")!;
const ratioExpenseEl = document.querySelector<HTMLElement>("#ratio-expense")!;
const ratioLabelEl = document.querySelector<HTMLElement>("#ratio-label")!;

const errorDialog = document.querySelector<HTMLDialogElement>("#error-dialog")!;
const errorMessageEl = document.querySelector<HTMLElement>("#error-message")!;
const errorDialogClose = document.querySelector<HTMLButtonElement>("#error-dialog-close")!;

dateInput.valueAsDate = new Date();

// 카테고리/메모는 사용자 입력 그대로 innerHTML에 들어가므로 XSS 방지를 위해 이스케이프
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showError(message: string): void {
  errorMessageEl.textContent = message;
  errorDialog.showModal();
}

errorDialogClose.addEventListener("click", () => errorDialog.close());

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    const showStats = btn.dataset.tab === "stats";
    ledgerView.hidden = showStats;
    statsView.hidden = !showStats;
  });
});

function refreshCategoryOptions(): void {
  const type = typeInput.value as TransactionType;
  const options = [...getCategories(type), CUSTOM_CATEGORY];
  categorySelect.innerHTML = options
    .map((c) => `<option value="${escapeHtml(c)}">${c === CUSTOM_CATEGORY ? "직접추가" : escapeHtml(c)}</option>`)
    .join("");
  showCustomInput(false);
}

function showCustomInput(show: boolean): void {
  categoryCustomWrap.hidden = !show;
  categoryCustomInput.required = show;
  if (!show) {
    categoryCustomInput.value = "";
    categorySaveCheckbox.checked = true; // 다음에 "직접추가"를 열 때 기본값(저장함)으로 되돌림
  }
}

typeInput.addEventListener("change", refreshCategoryOptions);
categorySelect.addEventListener("change", () => {
  showCustomInput(categorySelect.value === CUSTOM_CATEGORY);
});

function render(): void {
  totalIncomeEl.textContent = `${currency.format(ledger.getTotalIncome())}원`;
  totalExpenseEl.textContent = `${currency.format(ledger.getTotalExpense())}원`;
  balanceEl.textContent = `${currency.format(ledger.getBalance())}원`;

  listBody.innerHTML = ledger
    .getTransactions()
    .map(
      (t) => `
        <tr data-id="${t.id}">
          <td>${t.date}</td>
          <td class="${t.type}">${t.type === "income" ? "수입" : "지출"}</td>
          <td>${escapeHtml(t.category)}</td>
          <td>${escapeHtml(t.memo)}</td>
          <td class="amount ${t.type}">${t.type === "income" ? "+" : "-"}${currency.format(t.amount)}원</td>
          <td><button class="delete-btn" data-id="${t.id}" type="button" aria-label="${escapeHtml(t.category)} 삭제">삭제</button></td>
        </tr>
      `,
    )
    .join("");
}

function categoryBarRow(item: CategoryTotal, max: number, type: TransactionType): string {
  const percent = (item.amount / max) * 100;
  return `
    <div class="stat-bar-row">
      <span>${escapeHtml(item.category)}</span>
      <div class="stat-bar-track"><div class="stat-bar-fill ${type}" style="width: ${percent}%"></div></div>
      <span class="amount ${type}">${currency.format(item.amount)}원</span>
    </div>
  `;
}

function renderStats(): void {
  const transactions = ledger.getTransactions();
  const expenseTotals = getCategoryTotals(transactions, "expense");
  const incomeTotals = getCategoryTotals(transactions, "income");
  const max = Math.max(1, ...expenseTotals.map((c) => c.amount), ...incomeTotals.map((c) => c.amount));

  categoryStatsEl.innerHTML =
    expenseTotals.map((c) => categoryBarRow(c, max, "expense")).join("") +
    incomeTotals.map((c) => categoryBarRow(c, max, "income")).join("");

  monthlyStatsEl.innerHTML = getMonthlyTotals(transactions)
    .map(
      (m) => `
        <tr>
          <td>${m.month}</td>
          <td class="amount income">+${currency.format(m.income)}원</td>
          <td class="amount expense">-${currency.format(m.expense)}원</td>
        </tr>
      `,
    )
    .join("");

  const { incomeRatio, expenseRatio } = getIncomeExpenseRatio(transactions);
  ratioIncomeEl.style.width = `${incomeRatio * 100}%`;
  ratioExpenseEl.style.width = `${expenseRatio * 100}%`;
  ratioLabelEl.textContent = `수입 ${Math.round(incomeRatio * 100)}% · 지출 ${Math.round(expenseRatio * 100)}%`;
}

function renderAll(): void {
  render();
  renderStats();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const type = typeInput.value as TransactionType;
  const isCustom = categorySelect.value === CUSTOM_CATEGORY;
  const category = (isCustom ? categoryCustomInput.value : categorySelect.value).trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;

  const validationError = validateTransactionInput({ category, amount, date });
  if (validationError) {
    showError(validationError);
    return;
  }

  const { saved } = ledger.addTransaction({ type, category, amount, date, memo: memoInput.value });
  if (!saved) showError("이 항목이 브라우저에 저장되지 못했습니다. 저장 공간을 확인해주세요.");

  if (isCustom && categorySaveCheckbox.checked) {
    const categorySaved = addCategory(type, category);
    if (!categorySaved) showError("카테고리가 브라우저에 저장되지 못했습니다. 저장 공간을 확인해주세요.");
  }
  refreshCategoryOptions();

  form.reset();
  dateInput.valueAsDate = new Date();
  renderAll();
});

listBody.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (!target.matches(".delete-btn")) return;
  const id = Number(target.dataset.id);
  const saved = ledger.removeTransaction(id);
  if (!saved) showError("삭제 내용이 브라우저에 저장되지 못했습니다. 저장 공간을 확인해주세요.");
  renderAll();
});

refreshCategoryOptions();
renderAll();

if (ledger.hadCorruptData) {
  showError("저장된 거래 데이터 일부가 손상되어 초기화되었습니다.");
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Run the full automated test suite**

Run: `npm test`
Expected: all tests across `validators.test.ts`, `stats.test.ts`, `Ledger.test.ts`, `categories.test.ts` PASS

- [ ] **Step 6: Manual verification in the browser**

Run: `npm run dev`, open the printed local URL, and check:
1. Submit the form with an empty category / a decimal amount / amount `0` / no date → the error dialog opens each time with the matching Korean message, and the transaction list does not change.
2. Submit a valid transaction → dialog does not open, it appears in the table, and the summary totals update.
3. Delete a transaction → it disappears and totals update.
4. Click the "통계" tab → category bars, the monthly table, and the income/expense ratio bar all reflect the current transactions; click back to "가계부" → the original view returns.
5. In the browser console, run `localStorage.setItem("ledger-transactions", "{}")` then reload → the error dialog appears once on load ("저장된 거래 데이터 일부가 손상되어 초기화되었습니다"), and the ledger starts empty instead of crashing.

- [ ] **Step 7: Commit**

```bash
git add index.html src/style.css src/main.ts
git commit -m "feat: add error dialog, storage-failure/corrupt-data handling, and a stats tab"
```
