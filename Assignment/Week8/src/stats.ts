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
