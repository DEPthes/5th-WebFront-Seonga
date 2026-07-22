import type { NewTransaction, Transaction, TransactionType } from "./types.ts";
import { parseTransactions } from "./validators.ts";

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
