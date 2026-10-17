export type TransactionType = 'income' | 'expense';

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'mobile_money' | 'crypto' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  institution?: string;
  color: string;
  accountNumberLast4?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  accountId?: string;
  tags?: string[];
}

export interface AssetItem {
  id: string;
  name: string;
  category: 'real_estate' | 'vehicle' | 'equity' | 'crypto' | 'valuables' | 'other';
  value: number;
  notes?: string;
  lastUpdated: string;
}

export interface LiabilityItem {
  id: string;
  name: string;
  category: 'credit_card' | 'student_loan' | 'mortgage' | 'auto_loan' | 'personal_loan';
  balance: number;
  apr: number;
  minimumPayment: number;
  dueDate?: number; // Day of month (1-31)
}

export interface ScannedReceipt {
  merchant: string;
  date: string;
  totalAmount: number;
  taxAmount?: number;
  category: string;
  items: Array<{ name: string; price: number }>;
  confidence: string;
  summaryNote?: string;
}

export interface SyncQueueItem {
  id: string;
  entity: 'transactions' | 'budgets' | 'savings_goals' | 'recurring_transactions' | 'snapshots' | 'budget_templates';
  action: 'insert' | 'update' | 'delete' | 'upsert';
  payload: any;
  timestamp: string;
  retryCount: number;
}

export type ActiveTab =
  | 'dash'
  | 'ledger'
  | 'accounts'
  | 'import'
  | 'importer'
  | 'finance'
  | 'savings'
  | 'recurring'
  | 'templates'
  | 'networth'
  | 'debt'
  | 'labs'
  | 'ai'
  | 'reports'
  | 'sheets';

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


