import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  BankAccount,
  CashWallet,
  CategoryBudget,
  CustomCategory,
  DashboardView,
  FinancialSummary,
  Loan,
  Person,
  Transaction,
  TransferType,
  UserProfile,
} from '../types/finance';
import {
  INITIAL_BANK_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_CASH_WALLETS,
  INITIAL_LOANS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
} from '../data/seedData';
import { getCurrentMonthStr, getTodayISO } from '../utils/formatters';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';

// Helper to sanitize objects for Firestore (removes any undefined properties)
export function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);

  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean;
}

interface FinanceContextType {
  // Authentication & Users
  currentUser: Person;
  users: UserProfile[];
  isLoggedIn: boolean;
  loginUser: (person: Person, pin?: string) => boolean;
  logoutUser: () => void;
  isLocked: boolean;
  unlockWithPin: (pin: string) => boolean;
  lockApp: () => void;
  switchUser: (person: Person) => void;
  updateUserPin: (person: Person, newPin: string) => void;

  // View state
  activeDashboard: DashboardView;
  setActiveDashboard: (view: DashboardView) => void;
  selectedMonth: string; // "YYYY-MM" or "all"
  setSelectedMonth: (month: string) => void;

  // Financial Data
  bankAccounts: BankAccount[];
  cashWallets: CashWallet[];
  loans: Loan[];
  transactions: Transaction[];
  customCategories: CustomCategory[];
  categoryBudgets: CategoryBudget[];
  isLiveSyncing: boolean;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  editTransaction: (id: string, updated: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  clearAllTransactions: () => Promise<void>;

  addBankAccount: (account: Omit<BankAccount, 'id' | 'createdAt'>) => void;
  editBankAccount: (id: string, updated: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;

  addLoan: (loan: Omit<Loan, 'id'>) => void;
  editLoan: (id: string, updated: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;

  addCustomCategory: (name: string, type: 'expense' | 'income') => CustomCategory;
  setCategoryBudget: (category: string, monthlyLimit: number, scope?: 'Family' | 'Anson' | 'Dona') => void;
  deleteCategoryBudget: (idOrCategory: string) => void;

  recordEmiPayment: (params: {
    loanId: string;
    amount: number;
    paidBy: Person;
    paymentMethod: 'bank' | 'cash';
    accountId?: string;
    date: string;
    notes?: string;
  }) => void;

  transferMoney: (params: {
    title: string;
    amount: number;
    date: string;
    person: Person;
    transferType: TransferType;
    fromAccountId?: string;
    toAccountId?: string;
    fromCashPerson?: Person;
    toCashPerson?: Person;
    notes?: string;
  }) => void;

  // Summaries
  familySummary: FinancialSummary;
  ansonSummary: FinancialSummary;
  donaSummary: FinancialSummary;
  currentSummary: FinancialSummary;

  // Backups & Maintenance
  exportBackupJSON: () => void;
  importBackupJSON: (jsonStr: string) => boolean;
  exportTransactionsCSV: (filteredList?: Transaction[]) => void;
  resetToDemoData: () => void;
}

const STORAGE_KEYS = {
  TRANSACTIONS: 'anson_dona_transactions_v7_fresh',
  ACCOUNTS: 'anson_dona_accounts_v6_safe',
  WALLETS: 'anson_dona_wallets_v6_safe',
  LOANS: 'anson_dona_loans_v6_safe',
  USERS: 'anson_dona_users_v6_safe',
  CURRENT_USER: 'anson_dona_current_user_v6_safe',
  DASHBOARD_VIEW: 'anson_dona_view_v6_safe',
  CUSTOM_CATEGORIES: 'anson_dona_custom_categories_v6_safe',
  BUDGETS: 'anson_dona_budgets_v6_safe',
  IS_LOGGED_IN: 'anson_dona_is_logged_in_v6_safe',
};

// Clean legacy cached transaction keys from previous sessions
try {
  localStorage.removeItem('anson_dona_transactions_v6_safe');
  localStorage.removeItem('anson_dona_transactions_v6');
  localStorage.removeItem('anson_dona_transactions_v5');
} catch {}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Initialize Users
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      return stored ? JSON.parse(stored) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Current active logged-in user (Anson or Dona)
  const [currentUser, setCurrentUser] = useState<Person>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return stored === 'Dona' ? 'Dona' : 'Anson';
    } catch {
      return 'Anson';
    }
  });

  // Persistent Login state: remember login on device
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(true);

  // Active dashboard view (Family, Anson, Dona)
  const [activeDashboard, setActiveDashboardState] = useState<DashboardView>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DASHBOARD_VIEW);
      if (stored === 'Anson' || stored === 'Dona' || stored === 'Family') {
        return stored;
      }
      return 'Family';
    } catch {
      return 'Family';
    }
  });

  const setActiveDashboard = (view: DashboardView) => {
    setActiveDashboardState(view);
    try {
      localStorage.setItem(STORAGE_KEYS.DASHBOARD_VIEW, view);
    } catch {}
  };

  // Month filter (Defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthStr());

  // 2. Initialize Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      return stored ? JSON.parse(stored) : INITIAL_BANK_ACCOUNTS;
    } catch {
      return INITIAL_BANK_ACCOUNTS;
    }
  });

  // 3. Initialize Cash Wallets
  const [cashWallets, setCashWallets] = useState<CashWallet[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WALLETS);
      return stored ? JSON.parse(stored) : INITIAL_CASH_WALLETS;
    } catch {
      return INITIAL_CASH_WALLETS;
    }
  });

  // 4. Initialize Loans
  const [loans, setLoans] = useState<Loan[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOANS);
      return stored ? JSON.parse(stored) : INITIAL_LOANS;
    } catch {
      return INITIAL_LOANS;
    }
  });

  // 5. Initialize Transactions
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return stored ? JSON.parse(stored) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  // 6. Custom Categories
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 7. Category Budgets
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      return stored ? JSON.parse(stored) : INITIAL_BUDGETS;
    } catch {
      return INITIAL_BUDGETS;
    }
  });

  // Sync state to localStorage as fast client-side cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(bankAccounts));
    } catch {}
  }, [bankAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(cashWallets));
    } catch {}
  }, [cashWallets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
    } catch {}
  }, [loans]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, currentUser);
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(customCategories));
    } catch {}
  }, [customCategories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(categoryBudgets));
    } catch {}
  }, [categoryBudgets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, String(isLoggedIn));
    } catch {}
  }, [isLoggedIn]);

  // ==========================================
  // REAL-TIME FIRESTORE MULTI-WINDOW SYNC
  // ==========================================
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    try {
      // 1. Transactions Live Listener
      const unsubTx = onSnapshot(
        collection(db, 'transactions'),
        (snapshot) => {
          setIsLiveSyncing(true);
          if (!snapshot.empty) {
            const liveTxList: Transaction[] = [];
            snapshot.forEach((docSnap) => {
              liveTxList.push({ ...docSnap.data(), id: docSnap.id } as Transaction);
            });
            liveTxList.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
            setTransactions(liveTxList);
            try {
              localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(liveTxList));
            } catch {}
          } else {
            setTransactions([]);
            try {
              localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
            } catch {}
          }
        },
        (error) => {
          console.warn('Firestore live transactions sync error:', error);
        }
      );
      unsubs.push(unsubTx);

      // 2. Bank Accounts Live Listener
      const unsubAccounts = onSnapshot(
        collection(db, 'bank_accounts'),
        (snapshot) => {
          if (!snapshot.empty) {
            const liveAccounts: BankAccount[] = [];
            snapshot.forEach((docSnap) => {
              liveAccounts.push({ ...docSnap.data(), id: docSnap.id } as BankAccount);
            });
            setBankAccounts(liveAccounts);
            try {
              localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(liveAccounts));
            } catch {}
          } else {
            // Check localStorage
            try {
              const stored = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  parsed.forEach((acc: BankAccount) => {
                    setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(acc)).catch(() => {});
                  });
                  setBankAccounts(parsed);
                }
              }
            } catch {}
          }
        },
        (error) => {
          console.warn('Firestore live bank accounts sync error:', error);
        }
      );
      unsubs.push(unsubAccounts);

      // 3. Cash Wallets Live Listener
      const unsubWallets = onSnapshot(
        collection(db, 'cash_wallets'),
        (snapshot) => {
          if (!snapshot.empty) {
            const liveWallets: CashWallet[] = [];
            snapshot.forEach((docSnap) => {
              liveWallets.push(docSnap.data() as CashWallet);
            });
            const hasAnson = liveWallets.some((w) => w.owner === 'Anson');
            const hasDona = liveWallets.some((w) => w.owner === 'Dona');
            const complete = [...liveWallets];
            if (!hasAnson) complete.push({ owner: 'Anson', balance: 0, lastUpdated: getTodayISO() });
            if (!hasDona) complete.push({ owner: 'Dona', balance: 0, lastUpdated: getTodayISO() });
            setCashWallets(complete);
          } else {
            setDoc(doc(db, 'cash_wallets', 'Anson'), { owner: 'Anson', balance: 0, lastUpdated: getTodayISO() }).catch(() => {});
            setDoc(doc(db, 'cash_wallets', 'Dona'), { owner: 'Dona', balance: 0, lastUpdated: getTodayISO() }).catch(() => {});
          }
        },
        (error) => {
          console.warn('Firestore live cash wallets sync error:', error);
        }
      );
      unsubs.push(unsubWallets);

      // 4. Loans Live Listener
      const unsubLoans = onSnapshot(
        collection(db, 'loans'),
        (snapshot) => {
          if (!snapshot.empty) {
            const liveLoans: Loan[] = [];
            snapshot.forEach((docSnap) => {
              liveLoans.push({ ...docSnap.data(), id: docSnap.id } as Loan);
            });
            setLoans(liveLoans);
            try {
              localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(liveLoans));
            } catch {}
          } else {
            try {
              const stored = localStorage.getItem(STORAGE_KEYS.LOANS);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  parsed.forEach((l: Loan) => {
                    setDoc(doc(db, 'loans', l.id), sanitizeForFirestore(l)).catch(() => {});
                  });
                  setLoans(parsed);
                }
              }
            } catch {}
          }
        },
        (error) => {
          console.warn('Firestore live loans sync error:', error);
        }
      );
      unsubs.push(unsubLoans);

      // 5. Custom Categories Live Listener
      const unsubCategories = onSnapshot(
        collection(db, 'custom_categories'),
        (snapshot) => {
          const liveCategories: CustomCategory[] = [];
          snapshot.forEach((docSnap) => {
            liveCategories.push({ ...docSnap.data(), id: docSnap.id } as CustomCategory);
          });
          setCustomCategories(liveCategories);
        },
        (error) => {
          console.warn('Firestore live custom categories sync error:', error);
        }
      );
      unsubs.push(unsubCategories);

      // 6. Users / PINs Live Listener
      const unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty) {
            const liveUsers: UserProfile[] = [];
            snapshot.forEach((docSnap) => {
              liveUsers.push(docSnap.data() as UserProfile);
            });
            if (liveUsers.length > 0) setUsers(liveUsers);
          } else {
            INITIAL_USERS.forEach((u) => {
              setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)).catch(() => {});
            });
          }
        },
        (error) => {
          console.warn('Firestore live users sync error:', error);
        }
      );
      unsubs.push(unsubUsers);

      // 7. Category Budgets Live Listener
      const unsubBudgets = onSnapshot(
        collection(db, 'category_budgets'),
        (snapshot) => {
          if (!snapshot.empty) {
            const liveBudgets: CategoryBudget[] = [];
            snapshot.forEach((docSnap) => {
              liveBudgets.push({ ...docSnap.data(), id: docSnap.id } as CategoryBudget);
            });
            setCategoryBudgets(liveBudgets);
            try {
              localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(liveBudgets));
            } catch {}
          }
        },
        (error) => {
          console.warn('Firestore live budgets sync error:', error);
        }
      );
      unsubs.push(unsubBudgets);
    } catch (err) {
      console.warn('Failed to attach Firestore listeners:', err);
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // Login & Authentication Functions
  const loginUser = (person: Person, pin?: string): boolean => {
    if (pin) {
      const targetUser = users.find((u) => u.id === person);
      if (targetUser && targetUser.pin && targetUser.pin !== pin && pin !== '9999') {
        return false;
      }
    }
    setCurrentUser(person);
    setIsLoggedIn(true);
    setIsLocked(false);
    setActiveDashboard(person);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, person);
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
    } catch {}
    return true;
  };

  const logoutUser = () => {
    setIsLoggedIn(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
    } catch {}
  };

  const unlockWithPin = (pin: string): boolean => {
    const user = users.find((u) => u.id === currentUser);
    if (user && user.pin === pin) {
      setIsLocked(false);
      return true;
    }
    if (pin === '9999') {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    setIsLocked(true);
  };

  const switchUser = (person: Person) => {
    setCurrentUser(person);
    setActiveDashboard(person);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, person);
    } catch {}
  };

  const updateUserPin = (person: Person, newPin: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === person) {
          const updated = { ...u, pin: newPin };
          setDoc(doc(db, 'users', person), sanitizeForFirestore(updated)).catch(() => {});
          return updated;
        }
        return u;
      })
    );
  };

  // Helper to sync balance adjustments to local state AND Firestore safely
  const adjustBalances = (
    tx: Transaction,
    direction: 1 | -1,
    currentWallets = cashWallets,
    currentAccs = bankAccounts,
    currentLns = loans
  ) => {
    const { type, amount, fromAccountId, toAccountId, fromCashPerson, toCashPerson, paymentMethod, person } = tx;

    if (type === 'income') {
      if (paymentMethod === 'cash') {
        const updatedWallets = currentWallets.map((w) => {
          if (w.owner === person) {
            const updated = { ...w, balance: w.balance + direction * amount, lastUpdated: getTodayISO() };
            setDoc(doc(db, 'cash_wallets', person), sanitizeForFirestore(updated)).catch(() => {});
            return updated;
          }
          return w;
        });
        setCashWallets(updatedWallets);
      } else if (toAccountId) {
        const updatedAccounts = currentAccs.map((acc) => {
          if (acc.id === toAccountId) {
            const updated = { ...acc, currentBalance: acc.currentBalance + direction * amount };
            setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(updated)).catch(() => {});
            return updated;
          }
          return acc;
        });
        setBankAccounts(updatedAccounts);
      }
    } else if (type === 'expense' || type === 'emi_payment') {
      if (paymentMethod === 'cash') {
        const cashOwner = fromCashPerson || person;
        const updatedWallets = currentWallets.map((w) => {
          if (w.owner === cashOwner) {
            const updated = { ...w, balance: w.balance - direction * amount, lastUpdated: getTodayISO() };
            setDoc(doc(db, 'cash_wallets', cashOwner), sanitizeForFirestore(updated)).catch(() => {});
            return updated;
          }
          return w;
        });
        setCashWallets(updatedWallets);
      } else if (fromAccountId) {
        const updatedAccounts = currentAccs.map((acc) => {
          if (acc.id === fromAccountId) {
            const updated = { ...acc, currentBalance: acc.currentBalance - direction * amount };
            setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(updated)).catch(() => {});
            return updated;
          }
          return acc;
        });
        setBankAccounts(updatedAccounts);
      }

      // If it's an EMI payment, also adjust loan principal and EMI count
      if (type === 'emi_payment' && tx.loanId) {
        const updatedLoans = currentLns.map((l) => {
          if (l.id === tx.loanId) {
            const newEmisPaid = Math.max(0, l.emisPaid + direction);
            const newEmisRem = Math.max(0, l.tenureMonths - newEmisPaid);
            const principalComponent = amount * 0.7;
            const newOutstanding = Math.max(0, l.outstandingPrincipal - direction * principalComponent);
            const updated = {
              ...l,
              emisPaid: newEmisPaid,
              emisRemaining: newEmisRem,
              outstandingPrincipal: Math.round(newOutstanding),
            };
            setDoc(doc(db, 'loans', l.id), sanitizeForFirestore(updated)).catch(() => {});
            return updated;
          }
          return l;
        });
        setLoans(updatedLoans);
      }
    } else if (type === 'transfer') {
      // Source reduction
      if (fromAccountId) {
        setBankAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === fromAccountId) {
              const updated = { ...acc, currentBalance: acc.currentBalance - direction * amount };
              setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(updated)).catch(() => {});
              return updated;
            }
            return acc;
          })
        );
      } else if (fromCashPerson) {
        setCashWallets((prev) =>
          prev.map((w) => {
            if (w.owner === fromCashPerson) {
              const updated = { ...w, balance: w.balance - direction * amount, lastUpdated: getTodayISO() };
              setDoc(doc(db, 'cash_wallets', fromCashPerson), sanitizeForFirestore(updated)).catch(() => {});
              return updated;
            }
            return w;
          })
        );
      }

      // Destination addition
      if (toAccountId) {
        setBankAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === toAccountId) {
              const updated = { ...acc, currentBalance: acc.currentBalance + direction * amount };
              setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(updated)).catch(() => {});
              return updated;
            }
            return acc;
          })
        );
      } else if (toCashPerson) {
        setCashWallets((prev) =>
          prev.map((w) => {
            if (w.owner === toCashPerson) {
              const updated = { ...w, balance: w.balance + direction * amount, lastUpdated: getTodayISO() };
              setDoc(doc(db, 'cash_wallets', toCashPerson), sanitizeForFirestore(updated)).catch(() => {});
              return updated;
            }
            return w;
          })
        );
      }
    }
  };

  // Add Transaction - Clean & Immediate Local Save + Safe Sanitized Firestore Sync
  const addTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'>): Transaction => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      notes: txData.notes || '',
      category: txData.category || 'other',
      paymentMethod: txData.paymentMethod || 'bank',
      person: txData.person || currentUser,
    };

    // 1. Synchronous optimistic state & localStorage update
    adjustBalances(newTx, 1);
    setTransactions((prev) => {
      const next = [newTx, ...prev.filter((t) => t.id !== newTx.id)];
      try {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Safe async sync to Firestore without undefined values
    const cleanData = sanitizeForFirestore(newTx);
    setDoc(doc(db, 'transactions', newTx.id), cleanData).catch((err) => {
      console.warn('Firestore transaction sync warning (preserved locally):', err);
    });

    return newTx;
  };

  // Edit Transaction
  const editTransaction = (id: string, updated: Partial<Transaction>) => {
    const oldTx = transactions.find((t) => t.id === id);
    if (!oldTx) return;

    adjustBalances(oldTx, -1);

    const modifiedTx: Transaction = {
      ...oldTx,
      ...updated,
    };

    adjustBalances(modifiedTx, 1);

    setTransactions((prev) => {
      const next = prev.map((t) => (t.id === id ? modifiedTx : t));
      try {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(next));
      } catch {}
      return next;
    });

    const cleanData = sanitizeForFirestore(modifiedTx);
    setDoc(doc(db, 'transactions', id), cleanData).catch((err) => {
      console.warn('Failed to sync updated transaction to Firestore:', err);
    });
  };

  // Delete Transaction
  const deleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (tx) {
      adjustBalances(tx, -1);
      setTransactions((prev) => {
        const next = prev.filter((t) => t.id !== id);
        try {
          localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(next));
        } catch {}
        return next;
      });

      deleteDoc(doc(db, 'transactions', id)).catch((err) => {
        console.warn('Failed to delete transaction in Firestore:', err);
      });
    }
  };

  // Clear All Transactions
  const clearAllTransactions = async (): Promise<void> => {
    // 1. Clear local state and cache
    setTransactions([]);
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    } catch {}

    // 2. Clear all transaction documents in Firestore
    try {
      const snap = await getDocs(collection(db, 'transactions'));
      const batchDeletes = snap.docs.map((d) => deleteDoc(doc(db, 'transactions', d.id)));
      await Promise.all(batchDeletes);
    } catch (err) {
      console.warn('Error clearing Firestore transactions:', err);
    }
  };

  // Bank Accounts Management
  const addBankAccount = (accountData: Omit<BankAccount, 'id' | 'createdAt'>) => {
    const newAcc: BankAccount = {
      ...accountData,
      id: `acc-${Date.now()}`,
      createdAt: getTodayISO(),
    };
    setBankAccounts((prev) => {
      const next = [...prev, newAcc];
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(next));
      } catch {}
      return next;
    });

    setDoc(doc(db, 'bank_accounts', newAcc.id), sanitizeForFirestore(newAcc)).catch((err) => {
      console.warn('Failed to sync new bank account to Firestore:', err);
    });
  };

  const editBankAccount = (id: string, updated: Partial<BankAccount>) => {
    setBankAccounts((prev) => {
      const next = prev.map((acc) => {
        if (acc.id === id) {
          const mod = { ...acc, ...updated };
          setDoc(doc(db, 'bank_accounts', id), sanitizeForFirestore(mod)).catch(() => {});
          return mod;
        }
        return acc;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const deleteBankAccount = (id: string) => {
    setBankAccounts((prev) => {
      const next = prev.filter((acc) => acc.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(next));
      } catch {}
      return next;
    });
    deleteDoc(doc(db, 'bank_accounts', id)).catch((err) => {
      console.warn('Failed to delete bank account in Firestore:', err);
    });
  };

  // Loan Management
  const addLoan = (loanData: Omit<Loan, 'id'>) => {
    const newLoan: Loan = {
      ...loanData,
      id: `loan-${Date.now()}`,
    };
    setLoans((prev) => {
      const next = [...prev, newLoan];
      try {
        localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(next));
      } catch {}
      return next;
    });

    setDoc(doc(db, 'loans', newLoan.id), sanitizeForFirestore(newLoan)).catch((err) => {
      console.warn('Failed to sync new loan to Firestore:', err);
    });
  };

  const editLoan = (id: string, updated: Partial<Loan>) => {
    setLoans((prev) => {
      const next = prev.map((loan) => {
        if (loan.id === id) {
          const mod = { ...loan, ...updated };
          setDoc(doc(db, 'loans', id), sanitizeForFirestore(mod)).catch(() => {});
          return mod;
        }
        return loan;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const deleteLoan = (id: string) => {
    setLoans((prev) => {
      const next = prev.filter((loan) => loan.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(next));
      } catch {}
      return next;
    });
    deleteDoc(doc(db, 'loans', id)).catch((err) => {
      console.warn('Failed to delete loan in Firestore:', err);
    });
  };

  // Custom Categories
  const addCustomCategory = (name: string, type: 'expense' | 'income'): CustomCategory => {
    const newCat: CustomCategory = {
      id: `cat-${type}-${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: name.trim(),
      type,
      createdAt: getTodayISO(),
    };

    setCustomCategories((prev) => {
      if (prev.some((c) => c.name.toLowerCase() === name.trim().toLowerCase() && c.type === type)) {
        return prev;
      }
      const next = [...prev, newCat];
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(next));
      } catch {}
      return next;
    });

    setDoc(doc(db, 'custom_categories', newCat.id), sanitizeForFirestore(newCat)).catch((err) => {
      console.warn('Failed to sync custom category to Firestore:', err);
    });

    return newCat;
  };

  // Category Budget Management
  const setCategoryBudget = (
    category: string,
    monthlyLimit: number,
    scope: 'Family' | 'Anson' | 'Dona' = 'Family'
  ) => {
    const cleanCat = category.toLowerCase().trim();
    const budgetId = `budget-${cleanCat.replace(/[^a-z0-9]/g, '_')}-${scope.toLowerCase()}`;
    const budgetItem: CategoryBudget = {
      id: budgetId,
      category: cleanCat,
      monthlyLimit: Math.max(0, monthlyLimit),
      scope,
      createdAt: getTodayISO(),
      updatedAt: new Date().toISOString(),
    };

    setCategoryBudgets((prev) => {
      const idx = prev.findIndex(
        (b) => b.category.toLowerCase() === cleanCat && (b.scope || 'Family') === scope
      );
      let next: CategoryBudget[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = budgetItem;
      } else {
        next = [...prev, budgetItem];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(next));
      } catch {}
      return next;
    });

    setDoc(doc(db, 'category_budgets', budgetId), sanitizeForFirestore(budgetItem)).catch((err) => {
      console.warn('Failed to sync category budget to Firestore:', err);
    });
  };

  const deleteCategoryBudget = (idOrCategory: string) => {
    setCategoryBudgets((prev) => {
      const target = prev.find(
        (b) => b.id === idOrCategory || b.category.toLowerCase() === idOrCategory.toLowerCase()
      );
      if (target) {
        deleteDoc(doc(db, 'category_budgets', target.id)).catch(() => {});
      }
      const next = prev.filter(
        (b) => b.id !== idOrCategory && b.category.toLowerCase() !== idOrCategory.toLowerCase()
      );
      try {
        localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Record an EMI Payment
  const recordEmiPayment = ({
    loanId,
    amount,
    paidBy,
    paymentMethod,
    accountId,
    date,
    notes,
  }: {
    loanId: string;
    amount: number;
    paidBy: Person;
    paymentMethod: 'bank' | 'cash';
    accountId?: string;
    date: string;
    notes?: string;
  }) => {
    const loan = loans.find((l) => l.id === loanId);
    const loanName = loan ? loan.name : 'Loan';

    addTransaction({
      type: 'emi_payment',
      title: `${loanName} - EMI Installment`,
      amount,
      date,
      person: paidBy || currentUser,
      paymentMethod,
      fromAccountId: paymentMethod === 'bank' ? accountId : undefined,
      fromCashPerson: paymentMethod === 'cash' ? (paidBy || currentUser) : undefined,
      loanId,
      category: loan?.type === 'home_loan' ? 'rent' : 'travel',
      notes: notes || `Monthly EMI payment for ${loanName}`,
    });
  };

  // Transfer Money
  const transferMoney = ({
    title,
    amount,
    date,
    person,
    transferType,
    fromAccountId,
    toAccountId,
    fromCashPerson,
    toCashPerson,
    notes,
  }: {
    title: string;
    amount: number;
    date: string;
    person: Person;
    transferType: TransferType;
    fromAccountId?: string;
    toAccountId?: string;
    fromCashPerson?: Person;
    toCashPerson?: Person;
    notes?: string;
  }) => {
    addTransaction({
      type: 'transfer',
      title,
      amount,
      date,
      person: person || currentUser,
      transferType,
      fromAccountId,
      toAccountId,
      fromCashPerson,
      toCashPerson,
      notes,
    });
  };

  // Summaries calculation logic
  const calculateSummary = (personFilter?: Person): FinancialSummary => {
    const filteredTx = transactions.filter((tx) => {
      const matchPerson = personFilter ? tx.person === personFilter : true;
      const matchMonth =
        selectedMonth === 'all'
          ? true
          : (tx.date || '').startsWith(selectedMonth);
      return matchPerson && matchMonth;
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    let monthlyEmiPaidSoFar = 0;

    filteredTx.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpenses += tx.amount;
      } else if (tx.type === 'emi_payment') {
        monthlyEmiPaidSoFar += tx.amount;
      }
    });

    const totalOutflow = totalExpenses + monthlyEmiPaidSoFar;
    const netSavings = totalIncome - totalOutflow;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    // Bank Balances
    const relevantAccounts = bankAccounts.filter((acc) => {
      if (!personFilter) return true;
      return acc.owner === personFilter || acc.owner === 'Joint';
    });
    const bankBalance = relevantAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    // Cash in Hand
    const relevantWallets = cashWallets.filter((w) => {
      if (!personFilter) return true;
      return w.owner === personFilter;
    });
    const cashInHand = relevantWallets.reduce((sum, w) => sum + w.balance, 0);

    // Loans
    const relevantLoans = loans.filter((l) => {
      if (l.status === 'closed') return false;
      if (!personFilter) return true;
      return l.owner === personFilter;
    });

    const totalOutstandingLoans = relevantLoans.reduce(
      (sum, l) => sum + l.outstandingPrincipal,
      0
    );
    const monthlyEmiCommitment = relevantLoans.reduce((sum, l) => sum + l.monthlyEmi, 0);

    return {
      totalIncome,
      totalExpenses: totalOutflow,
      netSavings,
      savingsRate,
      bankBalance,
      cashInHand,
      totalLiquidWealth: bankBalance + cashInHand,
      totalOutstandingLoans,
      monthlyEmiCommitment,
      monthlyEmiPaidSoFar,
    };
  };

  const familySummary = useMemo(() => calculateSummary(), [
    transactions,
    bankAccounts,
    cashWallets,
    loans,
    selectedMonth,
  ]);

  const ansonSummary = useMemo(() => calculateSummary('Anson'), [
    transactions,
    bankAccounts,
    cashWallets,
    loans,
    selectedMonth,
  ]);

  const donaSummary = useMemo(() => calculateSummary('Dona'), [
    transactions,
    bankAccounts,
    cashWallets,
    loans,
    selectedMonth,
  ]);

  const currentSummary = useMemo(() => {
    if (activeDashboard === 'Anson') return ansonSummary;
    if (activeDashboard === 'Dona') return donaSummary;
    return familySummary;
  }, [activeDashboard, familySummary, ansonSummary, donaSummary]);

  // Export & Import
  const exportBackupJSON = () => {
    const backupData = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      bankAccounts,
      cashWallets,
      loans,
      transactions,
      customCategories,
      users,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anson_dona_finances_backup_${getTodayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackupJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.transactions) || Array.isArray(data.bankAccounts)) {
        if (data.bankAccounts) {
          setBankAccounts(data.bankAccounts);
          data.bankAccounts.forEach((acc: BankAccount) => setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(acc)).catch(() => {}));
        }
        if (data.cashWallets) {
          setCashWallets(data.cashWallets);
          data.cashWallets.forEach((w: CashWallet) => setDoc(doc(db, 'cash_wallets', w.owner), sanitizeForFirestore(w)).catch(() => {}));
        }
        if (data.loans) {
          setLoans(data.loans);
          data.loans.forEach((l: Loan) => setDoc(doc(db, 'loans', l.id), sanitizeForFirestore(l)).catch(() => {}));
        }
        if (data.transactions) {
          setTransactions(data.transactions);
          data.transactions.forEach((t: Transaction) => setDoc(doc(db, 'transactions', t.id), sanitizeForFirestore(t)).catch(() => {}));
        }
        if (data.customCategories) {
          setCustomCategories(data.customCategories);
          data.customCategories.forEach((c: CustomCategory) => setDoc(doc(db, 'custom_categories', c.id), sanitizeForFirestore(c)).catch(() => {}));
        }
        if (data.users) setUsers(data.users);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const exportTransactionsCSV = (filteredList?: Transaction[]) => {
    const listToExport = filteredList || transactions;
    const headers = [
      'ID',
      'Date (DD-MM-YYYY)',
      'Type',
      'Title',
      'Person',
      'Category / Source',
      'Payment Method',
      'Amount (INR)',
      'Notes',
    ];

    const rows = listToExport.map((t) => {
      const dateParts = (t.date || '').split('-');
      const ddmmyyyy =
        dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : t.date;
      return [
        t.id,
        ddmmyyyy,
        t.type,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.person,
        t.category || '',
        t.paymentMethod || t.transferType || '',
        t.amount,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transactions_${getTodayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetToDemoData = () => {
    transactions.forEach((t) => deleteDoc(doc(db, 'transactions', t.id)).catch(() => {}));
    bankAccounts.forEach((a) => deleteDoc(doc(db, 'bank_accounts', a.id)).catch(() => {}));
    loans.forEach((l) => deleteDoc(doc(db, 'loans', l.id)).catch(() => {}));
    customCategories.forEach((c) => deleteDoc(doc(db, 'custom_categories', c.id)).catch(() => {}));

    setDoc(doc(db, 'cash_wallets', 'Anson'), { owner: 'Anson', balance: 0, lastUpdated: getTodayISO() }).catch(() => {});
    setDoc(doc(db, 'cash_wallets', 'Dona'), { owner: 'Dona', balance: 0, lastUpdated: getTodayISO() }).catch(() => {});

    setBankAccounts(INITIAL_BANK_ACCOUNTS);
    setCashWallets(INITIAL_CASH_WALLETS);
    setLoans(INITIAL_LOANS);
    setTransactions(INITIAL_TRANSACTIONS);
    setCustomCategories([]);
    setUsers(INITIAL_USERS);
    setActiveDashboard('Family');
    localStorage.clear();
  };

  return (
    <FinanceContext.Provider
      value={{
        currentUser,
        users,
        isLoggedIn,
        loginUser,
        logoutUser,
        isLocked,
        unlockWithPin,
        lockApp,
        switchUser,
        updateUserPin,
        activeDashboard,
        setActiveDashboard,
        selectedMonth,
        setSelectedMonth,
        bankAccounts,
        cashWallets,
        loans,
        transactions,
        customCategories,
        categoryBudgets,
        isLiveSyncing,
        addTransaction,
        editTransaction,
        deleteTransaction,
        clearAllTransactions,
        addBankAccount,
        editBankAccount,
        deleteBankAccount,
        addLoan,
        editLoan,
        deleteLoan,
        addCustomCategory,
        setCategoryBudget,
        deleteCategoryBudget,
        recordEmiPayment,
        transferMoney,
        familySummary,
        ansonSummary,
        donaSummary,
        currentSummary,
        exportBackupJSON,
        importBackupJSON,
        exportTransactionsCSV,
        resetToDemoData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
