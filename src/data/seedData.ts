import { BankAccount, CashWallet, Loan, Transaction, UserProfile } from '../types/finance';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'Anson',
    name: 'Anson Mathukutty',
    email: 'ansonmathukutty@gmail.com',
    avatarBg: 'bg-blue-600',
    pin: '1234',
  },
  {
    id: 'Dona',
    name: 'Dona Anson',
    email: 'dona.anson@example.com',
    avatarBg: 'bg-emerald-600',
    pin: '5678',
  },
];

// Clean empty accounts - ready for user to enter their own bank accounts
export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [];

// Cash in hand wallets starting at 0
export const INITIAL_CASH_WALLETS: CashWallet[] = [
  {
    owner: 'Anson',
    balance: 0,
    lastUpdated: '2026-10-27',
  },
  {
    owner: 'Dona',
    balance: 0,
    lastUpdated: '2026-10-27',
  },
];

// Clean empty loans
export const INITIAL_LOANS: Loan[] = [];

// Clean empty transactions
export const INITIAL_TRANSACTIONS: Transaction[] = [];
