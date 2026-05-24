export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface TemplateCategory {
  category: string;
  targetAmount: number;
}

export interface TemplateIncomeSource {
  name: string;
  expectedAmount: number;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  incomes: TemplateIncomeSource[];
  expenses: TemplateCategory[];
}

export interface FinancialSummary {
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  dayOfMonth: number;
  autoLog: boolean;
  lastLoggedDate?: string; // YYYY-MM formatted to prevent dual adding
}

export interface MonthlySnapshot {
  id: string;
  user_id: string;
  month: string; // YYYY-MM
  created_at?: string;
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate: number;
  income_categories: Array<{ category: string; amount: number; percentage: number }>;
  expense_categories: Array<{ category: string; amount: number; percentage: number }>;
  transaction_count: number;
}

