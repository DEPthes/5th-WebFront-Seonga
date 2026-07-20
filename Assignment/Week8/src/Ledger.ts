import type { NewTransaction, Transaction, TransactionType } from "./types";

const STORAGE_KEY = "ledger-transactions";

export class Ledger {
  private transactions: Transaction[] = this.load();
  private nextId = this.transactions.reduce((max, t) => Math.max(max, t.id), 0) + 1;

  addTransaction(data: NewTransaction): Transaction {
    const transaction: Transaction = { id: this.nextId++, ...data };
    this.transactions.push(transaction);
    this.save();
    return transaction;
  }

  removeTransaction(id: number): void {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    this.save();
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
    return this.transactions
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private load(): Transaction[] {
    try {
      // localStorage 값이 수동 편집 등으로 깨져있을 수 있어 방어적으로 처리
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.transactions));
    } catch {
      // 저장 공간 초과, 시크릿 모드 등으로 쓰기가 막혀도 앱 동작은 계속되게 함
    }
  }
}
