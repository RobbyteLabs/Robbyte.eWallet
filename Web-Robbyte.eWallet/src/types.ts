export type Currency = string;

export type ExpenseKind = "fixed" | "variable";

export type Frequency = "monthly" | "once";

export type ExpensePriority = "essential" | "lifestyle" | "savings" | "debt";

export interface UserSettings {
  currency: Currency;
  currencyCountry?: string;
  currencyLocale?: string;
  monthlyIncome: number;
  alertDaysBefore: number;
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  recurring: boolean;
  category?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  kind: ExpenseKind;
  dueDay?: number;
  date?: string;
  paid: boolean;
  frequency: Frequency;
  priority?: ExpensePriority;
  paymentMethod?: string;
  notes?: string;
}

export interface Loan {
  id: string;
  lender: string;
  principal: number;
  balance: number;
  monthlyPayment: number;
  dueDay: number;
  nextDueDate: string;
  paidThisMonth: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  paymentDay: number;
  purchases: CardPurchase[];
  lastPaymentDate?: string;
}

export interface CardPurchase {
  id: string;
  description: string;
  amount: number;
  purchaseDate: string;
  installments: number;
  paidInstallments: number;
  category: string;
}

export interface PaymentDue {
  id: string;
  label: string;
  source: "expense" | "loan" | "card";
  amount: number;
  dueDate: string;
  status: "paid" | "due" | "overdue";
}

export interface MonthlyReport {
  monthKey: string;
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  loanPayments: number;
  cardPayments: number;
  available: number;
}

export interface AppData {
  settings: UserSettings;
  incomes: Income[];
  expenses: Expense[];
  loans: Loan[];
  cards: CreditCard[];
}

export type DataBlockName = keyof AppData;

export interface EncryptedBlock {
  encryptedPayload: string;
  iv: string;
  salt: string;
  version: number;
  updatedAt: string;
}

export interface SyncState {
  status: "idle" | "loading" | "saving" | "offline" | "error";
  message: string;
  lastSavedAt?: string;
}

export type AppView =
  | "dashboard"
  | "expenses"
  | "loans"
  | "cards"
  | "calendar"
  | "reports"
  | "backup"
  | "settings";
