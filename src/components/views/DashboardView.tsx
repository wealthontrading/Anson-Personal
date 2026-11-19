import React, { useMemo, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { IncomeExpenseChart } from '../dashboard/IncomeExpenseChart';
import { CategoryDonutChart } from '../dashboard/CategoryDonutChart';
import { CategoryBudgetProgressCard } from '../dashboard/CategoryBudgetProgressCard';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import {
  doesNoteAppearOnDate,
  formatReminderTime12h,
  getDaysUntilNextNoteDate,
  getLoanFrequency,
  getLoanScheduledPaymentAmount,
  getNextDueDateForLoan,
  getNotificationPermission,
  isLoanCyclePaid,
  isNotificationSupported,
  requestNotificationPermission,
  unlockNotificationAudio,
} from '../../utils/notifications';
import {
  formatDateDDMMYYYY,
  formatINR,
  formatMonthName,
  getCategoryColor,
  getTodayISO,
  CATEGORY_DETAILS,
  INCOME_SOURCE_DETAILS,
} from '../../utils/formatters';
import {
  Calendar,
  CalendarHeart,
  Landmark,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  IndianRupee,
  Wallet,
  Edit2,
  Trash2,
  Bell,
  CheckCircle2,
  Circle,
  Cake,
  Heart,
  PiggyBank,
} from 'lucide-react';
import { Transaction } from '../../types/finance';
import { NavTab } from '../navigation/Sidebar';

interface DashboardViewProps {
  onOpenQuickAction: () => void;
  onOpenActionType: (action: 'income' | 'expense' | 'transfer' | 'emi') => void;
  onOpenBudgetModal: () => void;
  onSelectTab: (tab: NavTab) => void;
  onViewReceipt: (imgUrl: string, title: string) => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenActionType,
  onOpenBudgetModal,
  onSelectTab,
  onViewReceipt,
  onEditTransaction,
}) => {
  const {
    activeDashboard,
    setActiveDashboard,
    currentSummary,
    transactions,
    selectedMonth,
    setSelectedMonth,
    loans,
    dailyNotes,
    toggleDailyNoteComplete,
    categoryColors,
    deleteTransaction,
  } = useFinance();

  const [deleteTargetTx, setDeleteTargetTx] = useState<Transaction | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission()
  );
  const [dismissedNotifPrompt, setDismissedNotifPrompt] = useState<boolean>(false);

  // Build dynamic month options including current month and any months in stored transactions
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    transactions.forEach((tx) => {
      if (tx.date && tx.date.length >= 7) {
        set.add(tx.date.slice(0, 7));
      }
    });
    if (selectedMonth !== 'all') set.add(selectedMonth);
    return [...Array.from(set).sort().reverse(), 'all'];
  }, [transactions, selectedMonth]);

  // Filter transactions for active dashboard scope
  const relevantTransactions = transactions.filter((tx) => {
    if (activeDashboard === 'Anson') return tx.person === 'Anson';
    if (activeDashboard === 'Dona') return tx.person === 'Dona';
    return true;
  });

  const recentTransactions = relevantTransactions.slice(0, 5);

  // Upcoming EMIs & Gold Loans check (frequency-aware across all accounts)
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const upcomingEmis = loans
    .filter((l) => {
      if (l.status === 'closed') return false;
      if (activeDashboard === 'Anson' && l.owner !== 'Anson') return false;
      if (activeDashboard === 'Dona' && l.owner !== 'Dona') return false;
      return true;
    })
    .filter((l) => {
      const freq = getLoanFrequency(l);
      const nextDue = getNextDueDateForLoan(l, transactions, today);
      const isPaid = isLoanCyclePaid(l, nextDue, transactions, freq);
      if (isPaid) return false;
      const diffDays = Math.round((nextDue.getTime() - todayMidnight.getTime()) / 86400000);
      return diffDays <= 15 || nextDue.getMonth() === today.getMonth();
    });

  const spentPercent =
    currentSummary.totalIncome > 0
      ? Math.min(100, Math.round((currentSummary.totalExpenses / currentSummary.totalIncome) * 100))
      : 0;

  // Today's notes & upcoming special dates (Birthdays, Wedding Dates, Events within 14 days)
  const todayISO = getTodayISO();
  const todayNotes = useMemo(() => {
    return dailyNotes
      .filter((note) => doesNoteAppearOnDate(note, todayISO))
      .sort((a, b) => Number(a.completed) - Number(b.completed));
  }, [dailyNotes, todayISO]);

  const upcomingSpecialDates = useMemo(() => {
    return dailyNotes
      .filter((n) => n.type === 'birthday' || n.type === 'wedding' || n.type === 'special_date')
      .map((note) => ({
        note,
        daysUntil: getDaysUntilNextNoteDate(note, today),
      }))
      .filter((item) => item.daysUntil >= 0 && item.daysUntil <= 14)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);
  }, [dailyNotes, todayISO]);

  return (
    <div className="space-y-5 pb-6">
      {/* Row 1: Simple Who & Month Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Person / Family Switcher */}
        <div className="grid grid-cols-3 sm:inline-flex p-1 bg-slate-200/70 rounded-2xl">
          {(['Family', 'Anson', 'Dona'] as const).map((view) => {
            const isActive = activeDashboard === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => setActiveDashboard(view)}
                className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {view}
              </button>
            );
          })}
        </div>

        {/* Month Picker */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 min-h-[42px] text-xs font-bold text-slate-800 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              aria-label="Select month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-hidden cursor-pointer w-full py-1.5"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m === 'all' ? 'All Time' : formatMonthName(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row 2: Single Unified Balance & Monthly Summary Card */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              {activeDashboard === 'Family' ? 'Total Family Balance' : `${activeDashboard}'s Balance`}
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1 tabular-nums">
              {formatINR(currentSummary.totalLiquidWealth)}
            </p>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-2 tabular-nums">
              <span>Bank: <strong className="text-slate-700">{formatINR(currentSummary.bankBalance)}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Cash: <strong className="text-slate-700">{formatINR(currentSummary.cashInHand)}</strong></span>
              {currentSummary.totalOutstandingLoans > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Loans: <strong className="text-slate-700">{formatINR(currentSummary.totalOutstandingLoans)}</strong></span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => onSelectTab('accounts')}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-slate-500" />
              <span>Accounts</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('emis')}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/70 text-xs font-bold text-indigo-800 inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Landmark className="w-3.5 h-3.5 text-indigo-600" />
              <span>Loans</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('savings')}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/70 text-xs font-bold text-emerald-800 inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
              <span>Savings</span>
            </button>
          </div>
        </div>

        {/* Clean 3-column Monthly Summary */}
        <div className="grid grid-cols-3 gap-3 pt-4 tabular-nums">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Income</p>
            <p className="text-base sm:text-xl font-extrabold text-emerald-600 mt-0.5 truncate">
              {formatINR(currentSummary.totalIncome)}
            </p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Spent</p>
            <p className="text-base sm:text-xl font-extrabold text-rose-600 mt-0.5 truncate">
              {formatINR(currentSummary.totalExpenses)}
            </p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Saved</p>
            <p
              className={`text-base sm:text-xl font-extrabold mt-0.5 truncate ${
                currentSummary.netSavings >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatINR(currentSummary.netSavings)}
            </p>
          </div>
        </div>

        {currentSummary.totalIncome > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 tabular-nums">
              <span>{spentPercent}% of income spent</span>
              <span className="font-semibold text-emerald-700">{currentSummary.savingsRate}% saved</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  spentPercent > 90 ? 'bg-rose-500' : 'bg-slate-900'
                }`}
                style={{ width: `${spentPercent}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Row 3: 4 Thumb-Friendly Quick Actions */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => onOpenActionType('expense')}
          className="min-h-[64px] p-3.5 rounded-2xl bg-white hover:bg-rose-50/50 border border-slate-200/90 flex items-center gap-3 text-left transition active:scale-[0.98] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">Add Expense</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenActionType('income')}
          className="min-h-[64px] p-3.5 rounded-2xl bg-white hover:bg-emerald-50/50 border border-slate-200/90 flex items-center gap-3 text-left transition active:scale-[0.98] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">Add Income</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenActionType('transfer')}
          className="min-h-[64px] p-3.5 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200/90 flex items-center gap-3 text-left transition active:scale-[0.98] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">Transfer</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenActionType('emi')}
          className="min-h-[64px] p-3.5 rounded-2xl bg-white hover:bg-indigo-50/50 border border-slate-200/90 flex items-center gap-3 text-left transition active:scale-[0.98] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">Pay EMI</span>
        </button>
      </section>

      {/* Row 4: Phone Notification Opt-In Prompt (only when permission not yet granted) */}
      {isNotificationSupported() && notifPermission === 'default' && !dismissedNotifPrompt && (
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-amber-950">
                Turn on Phone Alerts
              </p>
              <p className="text-xs text-amber-800">
                Get instant alerts when your partner adds a transaction &amp; EMI reminders (6 AM, 12 PM, 10 PM).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setDismissedNotifPrompt(true)}
              className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-100 transition cursor-pointer"
            >
              Later
            </button>
            <button
              type="button"
              onClick={async () => {
                const res = await requestNotificationPermission();
                setNotifPermission(res);
              }}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
            >
              Enable Alerts
            </button>
          </div>
        </div>
      )}

      {/* Row 4b: Upcoming EMI Alert (only when due) */}
      {upcomingEmis.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-indigo-950">
                EMI Due This Month
              </p>
              <p className="text-xs text-indigo-800 truncate tabular-nums">
                {upcomingEmis.map((e) => `${e.name} (${formatINR(getLoanScheduledPaymentAmount(e))})`).join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenActionType('emi')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition cursor-pointer"
          >
            Pay Now
          </button>
        </div>
      )}

      {/* Row 4c: Daily Notes, Doing Matters & Special Dates Shortcut */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center shrink-0">
              <CalendarHeart className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Daily Notes &amp; Calendar
              </h3>
              <p className="text-[11px] text-slate-500">
                {todayNotes.filter((n) => !n.completed).length > 0
                  ? `${todayNotes.filter((n) => !n.completed).length} pending for today`
                  : 'Track daily matters, birthdays & wedding dates'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('notes')}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 transition cursor-pointer"
          >
            <span>Open Calendar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingSpecialDates.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {upcomingSpecialDates.map(({ note, daysUntil }) => {
              const isBirthday = note.type === 'birthday';
              const isWedding = note.type === 'wedding';
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onSelectTab('notes')}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                    isBirthday
                      ? 'bg-pink-50/90 border-pink-200/80 text-pink-800 hover:bg-pink-100/70'
                      : isWedding
                      ? 'bg-rose-50/90 border-rose-200/80 text-rose-800 hover:bg-rose-100/70'
                      : 'bg-amber-50/90 border-amber-200/80 text-amber-900 hover:bg-amber-100/70'
                  }`}
                >
                  {isBirthday ? (
                    <Cake className="w-3.5 h-3.5 shrink-0" />
                  ) : isWedding ? (
                    <Heart className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate max-w-[160px]">{note.title}</span>
                  <span className="opacity-75">
                    · {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil}d`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {todayNotes.length > 0 ? (
          <div className="divide-y divide-slate-100 border-t border-slate-100 pt-1">
            {todayNotes.slice(0, 3).map((note) => (
              <div
                key={note.id}
                className="py-2.5 flex items-center justify-between gap-2.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    void unlockNotificationAudio();
                    toggleDailyNoteComplete(note.id);
                  }}
                  className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer group"
                >
                  {note.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 shrink-0 transition" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-sm font-bold truncate ${
                        note.completed ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {note.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {note.reminderEnabled && note.reminderTime
                        ? `Reminder ${formatReminderTime12h(note.reminderTime)}`
                        : 'Today'}
                      {' · '}
                      {note.person}
                    </p>
                  </div>
                </button>
                {note.completed && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg shrink-0">
                    Done
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No tasks scheduled for today. Open Calendar to log your daily journey, doing matters, birthdays, or wedding dates with phone reminders.
          </p>
        )}
      </section>

      {/* Row 5: Recent Activity (Clean Mobile Tap Rows) */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Recent Transactions
          </h3>
          <button
            type="button"
            onClick={() => onSelectTab('transactions')}
            className="min-h-[36px] text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>See all ({relevantTransactions.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <IndianRupee className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-800">No transactions yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Tap Add Expense or Add Income above to record your first entry.
            </p>
            <button
              type="button"
              onClick={() => onOpenActionType('expense')}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Expense</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              const catLabel =
                CATEGORY_DETAILS[tx.category as keyof typeof CATEGORY_DETAILS]?.label ||
                INCOME_SOURCE_DETAILS[tx.category as keyof typeof INCOME_SOURCE_DETAILS]?.label ||
                tx.category ||
                (tx.paymentMethod === 'cash' ? 'Cash' : 'Bank');

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="min-h-[58px] py-3 px-1.5 flex items-center justify-between gap-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-slate-200/70 bg-slate-50"
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: isIncome
                            ? '#10b981'
                            : isTransfer
                            ? '#3b82f6'
                            : getCategoryColor(tx.category, categoryColors),
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {tx.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {formatDateDDMMYYYY(tx.date)} · {catLabel} · {tx.person}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p
                        className={`text-sm font-extrabold tabular-nums ${
                          isIncome
                            ? 'text-emerald-600'
                            : isTransfer
                            ? 'text-blue-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {isIncome ? `+${formatINR(tx.amount)}` : formatINR(tx.amount)}
                      </p>
                      {tx.receiptImage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewReceipt(tx.receiptImage!, tx.title);
                          }}
                          className="text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          Receipt
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        aria-label="Edit transaction"
                        className="min-w-[34px] min-h-[34px] rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 flex items-center justify-center transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetTx(tx)}
                        aria-label="Delete transaction"
                        className="min-w-[34px] min-h-[34px] rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Row 6: Monthly Budgets */}
      <CategoryBudgetProgressCard
        onOpenBudgetModal={onOpenBudgetModal}
        transactions={relevantTransactions}
      />

      {/* Row 7: Spending Breakdown & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CategoryDonutChart
          transactions={relevantTransactions}
          selectedMonth={selectedMonth}
        />
        <IncomeExpenseChart
          transactions={relevantTransactions}
          currentMonth={selectedMonth}
        />
      </div>

      <DeleteConfirmModal
        transaction={deleteTargetTx}
        onCancelNo={() => setDeleteTargetTx(null)}
        onConfirmYes={(tx) => {
          deleteTransaction(tx.id);
          setDeleteTargetTx(null);
        }}
      />
    </div>
  );
};
