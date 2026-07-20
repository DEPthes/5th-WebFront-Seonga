export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  memo: string;
}

export type NewTransaction = Omit<Transaction, "id">;
