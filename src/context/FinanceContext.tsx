import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import {
  BankAccount,
  CashWallet,
  CategoryBudget,
  CustomCategory,
  DashboardView,
  FinancialSummary,
  Loan,
  PaymentFrequency,
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
import {
  AppNotificationPayload,
  checkAndTriggerEmiReminders,
  formatTransactionNotification,
  getMsUntilNextEmiSlot,
  getOrCreateDeviceId,
  isNotificationSoundEnabled,
  setNotificationSoundEnabledStored,
  showPhoneNotification,
} from '../utils/notifications';
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
  categoryColors: Record<string, string>;
  categoryBudgets: CategoryBudget[];
  isLiveSyncing: boolean;
  defaultBankAccount: BankAccount | undefined;

  // Notifications & EMI Reminders
  deviceId: string;
  notifyPartnerTransactions: boolean;
  setNotifyPartnerTransactions: (enabled: boolean) => void;
  notifyEmiReminders: boolean;
  setNotifyEmiReminders: (enabled: boolean) => void;
  notificationSoundEnabled: boolean;
  setNotificationSoundEnabled: (enabled: boolean) => void;
  inAppNotifications: AppNotificationPayload[];
  pushInAppNotification: (payload: AppNotificationPayload) => void;
  dismissInAppNotification: (id: string) => void;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  editTransaction: (id: string, updated: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  clearAllTransactions: () => Promise<void>;

  addBankAccount: (account: Omit<BankAccount, 'id' | 'createdAt'>) => void;
  editBankAccount: (id: string, updated: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  setDefaultBankAccount: (id: string) => void;

  addLoan: (loan: Omit<Loan, 'id'>) => Loan;
  editLoan: (id: string, updated: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;

  addCustomCategory: (name: string, type: 'expense' | 'income', color?: string) => CustomCategory;
  setCategoryColor: (category: string, color: string) => void;
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
    paymentFrequency?: PaymentFrequency;
    interestAmount?: number;
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
  CATEGORY_COLORS: 'anson_dona_category_colors_v7',
  BUDGETS: 'anson_dona_budgets_v6_safe',
  IS_LOGGED_IN: 'anson_dona_is_logged_in_v6_safe',
  NOTIFY_PARTNER: 'anson_dona_notify_partner_v1',
  NOTIFY_EMI: 'anson_dona_notify_emi_v1',
  SEEN_TX_IDS: 'anson_dona_seen_tx_ids_v1',
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
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());

  const [notifyPartnerTransactions, setNotifyPartnerTransactionsState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTIFY_PARTNER);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const [notifyEmiReminders, setNotifyEmiRemindersState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTIFY_EMI);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const [notificationSoundEnabled, setNotificationSoundEnabledState] = useState<boolean>(() =>
    isNotificationSoundEnabled()
  );

  const notifyPartnerRef = useRef<boolean>(notifyPartnerTransactions);
  notifyPartnerRef.current = notifyPartnerTransactions;

  const setNotifyPartnerTransactions = (enabled: boolean) => {
    setNotifyPartnerTransactionsState(enabled);
    notifyPartnerRef.current = enabled;
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFY_PARTNER, String(enabled));
    } catch {}
  };

  const setNotifyEmiReminders = (enabled: boolean) => {
    setNotifyEmiRemindersState(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFY_EMI, String(enabled));
    } catch {}
  };

  const setNotificationSoundEnabled = (enabled: boolean) => {
    setNotificationSoundEnabledState(enabled);
    setNotificationSoundEnabledStored(enabled);
  };

  const [inAppNotifications, setInAppNotifications] = useState<AppNotificationPayload[]>([]);

  const dismissInAppNotification = useCallback((id: string) => {
    setInAppNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushInAppNotification = useCallback((payload: AppNotificationPayload) => {
    setInAppNotifications((prev) => [payload, ...prev.filter((p) => p.id !== payload.id)].slice(0, 4));
    setTimeout(() => {
      setInAppNotifications((prev) => prev.filter((item) => item.id !== payload.id));
    }, 8000);
  }, []);

  const pushInAppNotificationRef = useRef(pushInAppNotification);
  pushInAppNotificationRef.current = pushInAppNotification;

  const seenTxIdsRef = useRef<Set<string>>((() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SEEN_TX_IDS);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set<string>(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set<string>();
    }
  })());

  const persistSeenTxIds = useCallback(() => {
    try {
      const recent = Array.from(seenTxIdsRef.current).slice(-150);
      seenTxIdsRef.current = new Set(recent);
      localStorage.setItem(STORAGE_KEYS.SEEN_TX_IDS, JSON.stringify(recent));
    } catch {}
  }, []);

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

  // 8. Custom Category Colors
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CATEGORY_COLORS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
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
      localStorage.setItem(STORAGE_KEYS.CATEGORY_COLORS, JSON.stringify(categoryColors));
    } catch {}
  }, [categoryColors]);

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
    let isFirstTxSnapshot = true;

    try {
      // 1. Transactions Live Listener (with cross-phone notification trigger)
      const unsubTx = onSnapshot(
        collection(db, 'transactions'),
        (snapshot) => {
          setIsLiveSyncing(true);
          if (!snapshot.empty) {
            const liveTxList: Transaction[] = [];
            snapshot.forEach((docSnap) => {
              const tx = { ...docSnap.data(), id: docSnap.id } as Transaction;
              liveTxList.push(tx);
              if (isFirstTxSnapshot) {
                seenTxIdsRef.current.add(tx.id);
              }
            });
            liveTxList.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
            setTransactions(liveTxList);
            try {
              localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(liveTxList));
            } catch {}

            if (!isFirstTxSnapshot) {
              let addedRemote = false;
              snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                  const tx = { ...change.doc.data(), id: change.doc.id } as Transaction;
                  const alreadySeen = seenTxIdsRef.current.has(tx.id);
                  seenTxIdsRef.current.add(tx.id);
                  addedRemote = true;

                  if (!alreadySeen && tx.createdByDevice !== deviceId && notifyPartnerRef.current) {
                    const { title, body } = formatTransactionNotification(tx);
                    showPhoneNotification({
                      title,
                      body,
                      tag: `tx-${tx.id}`,
                      kind: 'transaction',
                      onInAppNotify: pushInAppNotificationRef.current,
                    });
                  }
                }
              });
              if (addedRemote) {
                persistSeenTxIds();
              }
            } else {
              persistSeenTxIds();
            }
          } else {
            setTransactions([]);
            try {
              localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
            } catch {}
          }
          isFirstTxSnapshot = false;
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

      // 8. Category Colors Live Listener
      const unsubColors = onSnapshot(
        collection(db, 'category_colors'),
        (snapshot) => {
          if (!snapshot.empty) {
            const liveColors: Record<string, string> = {};
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data && data.category && data.color) {
                liveColors[data.category.toLowerCase().trim()] = data.color;
              }
            });
            setCategoryColors(liveColors);
            try {
              localStorage.setItem(STORAGE_KEYS.CATEGORY_COLORS, JSON.stringify(liveColors));
            } catch {}
          }
        },
        (error) => {
          console.warn('Firestore live category colors sync error:', error);
        }
      );
      unsubs.push(unsubColors);
    } catch (err) {
      console.warn('Failed to attach Firestore listeners:', err);
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // Login & Authentication Functions - Strict password verification required
  const loginUser = (person: Person, pin?: string): boolean => {
    if (!pin || pin.trim() === '') {
      return false;
    }
    const targetUser = users.find((u) => u.id === person);
    const expectedPin = targetUser?.pin || (person === 'Anson' ? '1234' : '5678');
    if (pin.trim() !== expectedPin && pin.trim() !== '9999') {
      return false;
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

  // Pure helper to apply a transaction delta (+1 apply, -1 reverse) across wallets, bank accounts, and loans
  const applyTransactionDelta = (
    tx: Transaction,
    direction: 1 | -1,
    walletsInput: CashWallet[],
    accsInput: BankAccount[],
    loansInput: Loan[],
    changedWallets: Set<string>,
    changedAccs: Set<string>,
    changedLoans: Set<string>
  ): { wallets: CashWallet[]; accs: BankAccount[]; lns: Loan[] } => {
    const { type, amount, fromAccountId, toAccountId, fromCashPerson, toCashPerson, paymentMethod, person } = tx;
    let nextWallets = walletsInput.map((w) => ({ ...w }));
    let nextAccs = accsInput.map((a) => ({ ...a }));
    let nextLoans = loansInput.map((l) => ({ ...l }));

    if (type === 'income') {
      if (paymentMethod === 'cash') {
        const cashOwner = toCashPerson || person;
        nextWallets = nextWallets.map((w) => {
          if (w.owner === cashOwner) {
            changedWallets.add(cashOwner);
            return { ...w, balance: w.balance + direction * amount, lastUpdated: getTodayISO() };
          }
          return w;
        });
      } else if (toAccountId) {
        nextAccs = nextAccs.map((acc) => {
          if (acc.id === toAccountId) {
            changedAccs.add(acc.id);
            return { ...acc, currentBalance: acc.currentBalance + direction * amount };
          }
          return acc;
        });
      }
    } else if (type === 'expense' || type === 'emi_payment') {
      if (paymentMethod === 'cash') {
        const cashOwner = fromCashPerson || person;
        nextWallets = nextWallets.map((w) => {
          if (w.owner === cashOwner) {
            changedWallets.add(cashOwner);
            return { ...w, balance: w.balance - direction * amount, lastUpdated: getTodayISO() };
          }
          return w;
        });
      } else if (fromAccountId) {
        nextAccs = nextAccs.map((acc) => {
          if (acc.id === fromAccountId) {
            changedAccs.add(acc.id);
            return { ...acc, currentBalance: acc.currentBalance - direction * amount };
          }
          return acc;
        });
      }

      if (type === 'emi_payment' && tx.loanId) {
        nextLoans = nextLoans.map((l) => {
          if (l.id === tx.loanId) {
            changedLoans.add(l.id);
            const emiCountStep =
              l.type === 'gold_loan'
                ? 1
                : tx.paymentFrequency === 'yearly'
                ? 12
                : tx.paymentFrequency === 'quarterly'
                ? 3
                : 1;
            const newEmisPaid = Math.max(0, l.emisPaid + direction * emiCountStep);
            const newEmisRem = Math.max(0, l.tenureMonths - newEmisPaid);
            let principalComponent = 0;
            if (l.type === 'gold_loan') {
              // Gold loan payments primarily cover quarterly/monthly/annual interest; only excess reduces principal
              if (typeof tx.interestAmount === 'number') {
                principalComponent = Math.max(0, amount - tx.interestAmount);
              } else {
                principalComponent = 0;
              }
            } else if (typeof tx.interestAmount === 'number' && tx.interestAmount <= amount) {
              principalComponent = Math.max(0, amount - tx.interestAmount);
            } else {
              principalComponent = amount * 0.7;
            }
            const newOutstanding = Math.max(0, l.outstandingPrincipal - direction * principalComponent);
            return {
              ...l,
              emisPaid: newEmisPaid,
              emisRemaining: newEmisRem,
              outstandingPrincipal: Math.round(newOutstanding),
            };
          }
          return l;
        });
      }
    } else if (type === 'transfer') {
      if (fromAccountId) {
        nextAccs = nextAccs.map((acc) => {
          if (acc.id === fromAccountId) {
            changedAccs.add(acc.id);
            return { ...acc, currentBalance: acc.currentBalance - direction * amount };
          }
          return acc;
        });
      } else if (fromCashPerson) {
        nextWallets = nextWallets.map((w) => {
          if (w.owner === fromCashPerson) {
            changedWallets.add(fromCashPerson);
            return { ...w, balance: w.balance - direction * amount, lastUpdated: getTodayISO() };
          }
          return w;
        });
      }

      if (toAccountId) {
        nextAccs = nextAccs.map((acc) => {
          if (acc.id === toAccountId) {
            changedAccs.add(acc.id);
            return { ...acc, currentBalance: acc.currentBalance + direction * amount };
          }
          return acc;
        });
      } else if (toCashPerson) {
        nextWallets = nextWallets.map((w) => {
          if (w.owner === toCashPerson) {
            changedWallets.add(toCashPerson);
            return { ...w, balance: w.balance + direction * amount, lastUpdated: getTodayISO() };
          }
          return w;
        });
      }
    }

    return { wallets: nextWallets, accs: nextAccs, lns: nextLoans };
  };

  const commitBalanceChanges = (
    nextState: { wallets: CashWallet[]; accs: BankAccount[]; lns: Loan[] },
    changedWallets: Set<string>,
    changedAccs: Set<string>,
    changedLoans: Set<string>
  ) => {
    if (changedWallets.size > 0) {
      setCashWallets(nextState.wallets);
      changedWallets.forEach((owner) => {
        const w = nextState.wallets.find((item) => item.owner === owner);
        if (w) setDoc(doc(db, 'cash_wallets', owner), sanitizeForFirestore(w)).catch(() => {});
      });
    }
    if (changedAccs.size > 0) {
      setBankAccounts(nextState.accs);
      changedAccs.forEach((id) => {
        const acc = nextState.accs.find((item) => item.id === id);
        if (acc) setDoc(doc(db, 'bank_accounts', id), sanitizeForFirestore(acc)).catch(() => {});
      });
    }
    if (changedLoans.size > 0) {
      setLoans(nextState.lns);
      changedLoans.forEach((id) => {
        const loan = nextState.lns.find((item) => item.id === id);
        if (loan) setDoc(doc(db, 'loans', id), sanitizeForFirestore(loan)).catch(() => {});
      });
    }
  };

  // Add Transaction - Clean & Immediate Local Save + Safe Sanitized Firestore Sync
  const addTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'>): Transaction => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      createdByDevice: deviceId,
      notes: txData.notes || '',
      category: txData.category || 'other',
      paymentMethod: txData.paymentMethod || 'bank',
      person: txData.person || currentUser,
    };

    // Prevent self-notification when listener confirms the new doc
    seenTxIdsRef.current.add(newTx.id);
    persistSeenTxIds();

    // 1. Synchronous optimistic state & localStorage update
    const changedWallets = new Set<string>();
    const changedAccs = new Set<string>();
    const changedLoans = new Set<string>();
    const nextBalances = applyTransactionDelta(
      newTx,
      1,
      cashWallets,
      bankAccounts,
      loans,
      changedWallets,
      changedAccs,
      changedLoans
    );
    commitBalanceChanges(nextBalances, changedWallets, changedAccs, changedLoans);

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

  // Edit Transaction (chained reverse + reapply so all 4 transaction types adjust balances cleanly)
  const editTransaction = (id: string, updated: Partial<Transaction>) => {
    const oldTx = transactions.find((t) => t.id === id);
    if (!oldTx) return;

    const modifiedTx: Transaction = {
      ...oldTx,
      ...updated,
    };

    const changedWallets = new Set<string>();
    const changedAccs = new Set<string>();
    const changedLoans = new Set<string>();

    const afterReverse = applyTransactionDelta(
      oldTx,
      -1,
      cashWallets,
      bankAccounts,
      loans,
      changedWallets,
      changedAccs,
      changedLoans
    );
    const afterApply = applyTransactionDelta(
      modifiedTx,
      1,
      afterReverse.wallets,
      afterReverse.accs,
      afterReverse.lns,
      changedWallets,
      changedAccs,
      changedLoans
    );
    commitBalanceChanges(afterApply, changedWallets, changedAccs, changedLoans);

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
      const changedWallets = new Set<string>();
      const changedAccs = new Set<string>();
      const changedLoans = new Set<string>();
      const nextBalances = applyTransactionDelta(
        tx,
        -1,
        cashWallets,
        bankAccounts,
        loans,
        changedWallets,
        changedAccs,
        changedLoans
      );
      commitBalanceChanges(nextBalances, changedWallets, changedAccs, changedLoans);

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
  const defaultBankAccount = useMemo(
    () => bankAccounts.find((a) => a.isDefault) || bankAccounts[0],
    [bankAccounts]
  );

  const addBankAccount = (accountData: Omit<BankAccount, 'id' | 'createdAt'>) => {
    const shouldBeDefault = Boolean(accountData.isDefault) || bankAccounts.length === 0;
    const newAcc: BankAccount = {
      ...accountData,
      isDefault: shouldBeDefault,
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: getTodayISO(),
    };
    setBankAccounts((prev) => {
      const base = shouldBeDefault
        ? prev.map((a) => {
            if (a.isDefault) {
              const cleared = { ...a, isDefault: false };
              setDoc(doc(db, 'bank_accounts', a.id), sanitizeForFirestore(cleared)).catch(() => {});
              return cleared;
            }
            return a;
          })
        : prev;
      const next = [...base.filter((a) => a.id !== newAcc.id), newAcc];
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(next));
      } catch {}
      return next;
    });

    const cleanData = sanitizeForFirestore(newAcc);
    setDoc(doc(db, 'bank_accounts', newAcc.id), cleanData).catch((err) => {
      console.warn('Failed to sync new bank account to Firestore:', err);
    });
  };

  const editBankAccount = (id: string, updated: Partial<BankAccount>) => {
    const makeDefault = updated.isDefault === true;
    setBankAccounts((prev) => {
      const next = prev.map((acc) => {
        if (acc.id === id) {
          const mod = { ...acc, ...updated };
          setDoc(doc(db, 'bank_accounts', id), sanitizeForFirestore(mod)).catch(() => {});
          return mod;
        }
        if (makeDefault && acc.isDefault) {
          const cleared = { ...acc, isDefault: false };
          setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(cleared)).catch(() => {});
          return cleared;
        }
        return acc;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const setDefaultBankAccount = (id: string) => {
    setBankAccounts((prev) => {
      const next = prev.map((acc) => {
        const shouldBe = acc.id === id;
        if (Boolean(acc.isDefault) !== shouldBe) {
          const mod = { ...acc, isDefault: shouldBe };
          setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(mod)).catch(() => {});
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
      const filtered = prev.filter((acc) => acc.id !== id);
      if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
        filtered[0] = { ...filtered[0], isDefault: true };
        setDoc(doc(db, 'bank_accounts', filtered[0].id), sanitizeForFirestore(filtered[0])).catch(() => {});
      }
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(filtered));
      } catch {}
      return filtered;
    });
    deleteDoc(doc(db, 'bank_accounts', id)).catch((err) => {
      console.warn('Failed to delete bank account in Firestore:', err);
    });
  };

  // Loan Management
  const addLoan = (loanData: Omit<Loan, 'id'>): Loan => {
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

    return newLoan;
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
  const setCategoryColor = (category: string, color: string) => {
    const cleanCat = category.toLowerCase().trim();
    setCategoryColors((prev) => {
      const next = { ...prev, [cleanCat]: color };
      try {
        localStorage.setItem(STORAGE_KEYS.CATEGORY_COLORS, JSON.stringify(next));
      } catch {}
      return next;
    });

    const docId = `color-${cleanCat.replace(/[^a-z0-9]/g, '_')}`;
    setDoc(
      doc(db, 'category_colors', docId),
      sanitizeForFirestore({
        category: cleanCat,
        color,
        updatedAt: new Date().toISOString(),
      })
    ).catch((err) => {
      console.warn('Failed to sync category color to Firestore:', err);
    });
  };

  const addCustomCategory = (name: string, type: 'expense' | 'income', color?: string): CustomCategory => {
    const newCat: CustomCategory = {
      id: `cat-${type}-${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: name.trim(),
      type,
      color,
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

    if (color) {
      setCategoryColor(name.trim(), color);
    }

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
    paymentFrequency,
    interestAmount,
  }: {
    loanId: string;
    amount: number;
    paidBy: Person;
    paymentMethod: 'bank' | 'cash';
    accountId?: string;
    date: string;
    notes?: string;
    paymentFrequency?: PaymentFrequency;
    interestAmount?: number;
  }) => {
    const loan = loans.find((l) => l.id === loanId);
    const loanName = loan ? loan.name : 'Loan';
    const freqLabel =
      paymentFrequency === 'yearly'
        ? 'Yearly'
        : paymentFrequency === 'quarterly'
        ? 'Quarterly'
        : 'Monthly';

    addTransaction({
      type: 'emi_payment',
      title: `${loanName} - ${loan?.type === 'gold_loan' ? `${freqLabel} Gold Loan Interest` : `${freqLabel} EMI`}`,
      amount,
      date,
      person: paidBy || currentUser,
      paymentMethod,
      fromAccountId: paymentMethod === 'bank' ? accountId : undefined,
      fromCashPerson: paymentMethod === 'cash' ? (paidBy || currentUser) : undefined,
      loanId,
      paymentFrequency,
      interestAmount,
      category: loan?.type === 'home_loan' ? 'rent' : 'travel',
      notes: notes || `${freqLabel} payment for ${loanName}`,
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

  // ==========================================
  // EMI DUE DATE REMINDERS (5 DAYS BEFORE & DUE DATE @ 6 AM, 12 PM, 10 PM)
  // ==========================================
  useEffect(() => {
    if (!notifyEmiReminders || loans.length === 0) return;

    const runCheck = () => {
      checkAndTriggerEmiReminders({
        loans,
        transactions,
        enabled: notifyEmiReminders,
        onInAppNotify: pushInAppNotificationRef.current,
      });
    };

    runCheck();

    const intervalId = window.setInterval(runCheck, 30000);
    let slotTimeoutId: number | undefined;
    const scheduleNextSlot = () => {
      const waitMs = getMsUntilNextEmiSlot(new Date());
      slotTimeoutId = window.setTimeout(() => {
        runCheck();
        scheduleNextSlot();
      }, Math.min(waitMs + 1000, 2147483000));
    };
    scheduleNextSlot();

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        runCheck();
      }
    };
    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      if (slotTimeoutId) window.clearTimeout(slotTimeoutId);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, [loans, transactions, notifyEmiReminders]);

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
        categoryColors,
        categoryBudgets,
        isLiveSyncing,
        defaultBankAccount,
        deviceId,
        notifyPartnerTransactions,
        setNotifyPartnerTransactions,
        notifyEmiReminders,
        setNotifyEmiReminders,
        notificationSoundEnabled,
        setNotificationSoundEnabled,
        inAppNotifications,
        pushInAppNotification,
        dismissInAppNotification,
        addTransaction,
        editTransaction,
        deleteTransaction,
        clearAllTransactions,
        addBankAccount,
        editBankAccount,
        deleteBankAccount,
        setDefaultBankAccount,
        addLoan,
        editLoan,
        deleteLoan,
        addCustomCategory,
        setCategoryColor,
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
