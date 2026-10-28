export type Person = 'Anson' | 'Dona';

export type DashboardView = 'Family' | 'Anson' | 'Dona';

export type IncomeSource = 
  | 'salary' 
  | 'business' 
  | 'freelance' 
  | 'bonus' 
  | 'interest' 
  | 'rental' 
  | 'other';

export type ExpenseCategory = 
  | 'food' 
  | 'groceries' 
  | 'rent' 
  | 'electricity' 
  | 'water' 
  | 'internet' 
  | 'travel' 
  | 'fuel' 
  | 'shopping' 
  | 'medical' 
  | 'insurance' 
  | 'entertainment' 
  | 'family' 
  | 'education' 
  | 'other';

export type PaymentMethod = 'bank' | 'cash' | 'credit_card';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'emi_payment';

export type TransferType = 
  | 'bank_to_bank' 
  | 'bank_to_cash' 
  | 'cash_to_bank' 
  | 'cash_to_cash';

export interface BankAccount {
  id: string;
  name: string; // e.g. "Salary Account", "Emergency Savings"
  bankName: string; // e.g. "HDFC Bank", "ICICI Bank", "SBI"
  accountNumberMasked?: string; // e.g. "••4829"
  owner: 'Anson' | 'Dona' | 'Joint';
  openingBalance: number;
  currentBalance: number;
  colorTheme?: string;
  createdAt: string;
}

export interface CashWallet {
  owner: Person;
  balance: number;
  lastUpdated: string;
}

export type LoanType = 
  | 'home_loan' 
  | 'car_loan' 
  | 'personal_loan' 
  | 'gold_loan' 
  | 'education_loan'
  | 'other';

export interface Loan {
  id: string;
  name: string;
  type: LoanType;
  owner: Person;
  originalAmount: number;
  outstandingPrincipal: number;
  monthlyEmi: number;
  interestRate: number; // in %
  startDate: string; // YYYY-MM-DD
  emiDueDay: number; // 1 - 31
  tenureMonths: number;
  emisPaid: number;
  emisRemaining: number;
  lenderName?: string;
  linkedAccountId?: string;
  status: 'active' | 'closed';
}

export interface EmiPaymentRecord {
  id: string;
  loanId: string;
  loanName: string;
  paymentMonth: string; // "YYYY-MM"
  amount: number;
  paidDate: string; // YYYY-MM-DD
  paidBy: Person;
  paymentMethod: 'bank' | 'cash';
  accountId?: string;
  status: 'paid' | 'pending' | 'overdue';
  transactionId?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  person: Person;
  category?: ExpenseCategory | IncomeSource | string;
  paymentMethod?: PaymentMethod;
  fromAccountId?: string;
  toAccountId?: string;
  fromCashPerson?: Person;
  toCashPerson?: Person;
  notes?: string;
  receiptImage?: string; // data URL
  loanId?: string; // If related to EMI payment
  transferType?: TransferType;
  createdAt: string;
}

export interface UserProfile {
  id: Person;
  name: string;
  email: string;
  avatarBg: string;
  pin: string; // 4-digit PIN for privacy/security
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // percentage
  bankBalance: number;
  cashInHand: number;
  totalLiquidWealth: number;
  totalOutstandingLoans: number;
  monthlyEmiCommitment: number;
  monthlyEmiPaidSoFar: number;
}

export interface CustomCategory {
  id: string;
  name: string;
  type: 'expense' | 'income';
  createdAt: string;
}

export interface CategoryBudget {
  id: string;
  category: string;
  monthlyLimit: number;
  scope?: 'Family' | 'Anson' | 'Dona';
  createdAt?: string;
  updatedAt?: string;
}

