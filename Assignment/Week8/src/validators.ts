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
