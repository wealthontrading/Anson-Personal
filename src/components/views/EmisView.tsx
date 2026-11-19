import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Loan, Transaction } from '../../types/finance';
import {
  formatINR,
  formatDateDDMMYYYY,
  LOAN_TYPE_LABELS,
} from '../../utils/formatters';
import {
  buildFirstOfMonthCommitmentNotification,
  calculateLoanCommitments,
  formatDateToISO,
  getLoanFrequency,
  getLoanPaidAmount,
  getLoanQuarterlyInterest,
  getLoanScheduledPaymentAmount,
  getLoanTotalInterest,
  getNextDueDateForLoan,
  getNotificationPermission,
  getReminderWindowStart,
  isLoanCyclePaid,
  requestNotificationPermission,
  showPhoneNotification,
  unlockNotificationAudio,
} from '../../utils/notifications';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import {
  Landmark,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Bell,
  Coins,
  AlertTriangle,
  X,
} from 'lucide-react';

interface EmisViewProps {
  onOpenAddLoan: () => void;
  onOpenAddGoldLoan?: () => void;
  onEditLoan: (loan: Loan) => void;
  onPayEmi: (loanId?: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
}

export const EmisView: React.FC<EmisViewProps> = ({
  onOpenAddLoan,
  onOpenAddGoldLoan,
  onEditLoan,
  onPayEmi,
  onEditTransaction,
}) => {
  const {
    loans,
    deleteLoan,
    transactions,
    deleteTransaction,
    bankAccounts,
    notifyEmiReminders,
    pushInAppNotification,
  } = useFinance();

  const [activeLoanTab, setActiveLoanTab] = useState<'all' | 'regular' | 'gold'>('all');
  const [deleteTargetLoan, setDeleteTargetLoan] = useState<Loan | null>(null);
  const [deleteTargetTx, setDeleteTargetTx] = useState<Transaction | null>(null);

  const todayKey = formatDateToISO(new Date());

  // Compute live schedule & status for every loan across all accounts
  const enrichedLoans = useMemo(() => {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return loans.map((l) => {
      const freq = getLoanFrequency(l);
      const nextDueDate = getNextDueDateForLoan(l, transactions, today);
      const remStartDate = getReminderWindowStart(nextDueDate);
      const nextDueISO = formatDateToISO(nextDueDate);
      const remStartISO = formatDateToISO(remStartDate);
      const isPaidCurrentCycle = isLoanCyclePaid(l, nextDueDate, transactions, freq);
      const diffDays = Math.round((nextDueDate.getTime() - todayMidnight.getTime()) / 86400000);
      const isInReminderWindow = !isPaidCurrentCycle && diffDays >= 0 && diffDays <= 5;
      const isOverdue = !isPaidCurrentCycle && diffDays < 0;
      const scheduledPayment = getLoanScheduledPaymentAmount(l, freq);
      const linkedAccount = l.linkedAccountId
        ? bankAccounts.find((a) => a.id === l.linkedAccountId)
        : undefined;

      return {
        ...l,
        freq,
        nextDueDate,
        nextDueStr: formatDateDDMMYYYY(nextDueISO),
        remStartStr: formatDateDDMMYYYY(remStartISO),
        isPaidCurrentCycle,
        diffDays,
        isInReminderWindow,
        isOverdue,
        scheduledPayment,
        linkedAccount,
        totalInterestCalc: getLoanTotalInterest(l),
        quarterlyInterestCalc: getLoanQuarterlyInterest(l),
        paidAmountCalc: getLoanPaidAmount(l, transactions),
      };
    });
  }, [loans, transactions, bankAccounts, todayKey]);

  const goldLoans = enrichedLoans.filter((l) => l.type === 'gold_loan');
  const regularLoans = enrichedLoans.filter((l) => l.type !== 'gold_loan');

  const totalOutstanding = loans.reduce((s, l) => s + l.outstandingPrincipal, 0);

  // Separate commitments by frequency (Monthly / Quarterly / Yearly) across all accounts
  const commitments = useMemo(
    () => calculateLoanCommitments(loans, transactions, new Date()),
    [loans, transactions, todayKey]
  );

  const goldTotalAmount = goldLoans.reduce((s, l) => s + l.originalAmount, 0);
  const goldTotalInterest = goldLoans.reduce((s, l) => s + l.totalInterestCalc, 0);
  const goldTotalPaid = goldLoans.reduce((s, l) => s + l.paidAmountCalc, 0);

  const emiTransactions = transactions.filter((tx) => tx.type === 'emi_payment');

  const handlePreviewFirstOfMonthAlert = async () => {
    await unlockNotificationAudio();
    if (getNotificationPermission() === 'default') {
      await requestNotificationPermission();
    }
    const { title, body } = buildFirstOfMonthCommitmentNotification(loans, transactions, new Date());
    await showPhoneNotification({
      title,
      body,
      tag: `preview-first-of-month-${Date.now()}`,
      kind: 'emi_reminder',
      onInAppNotify: pushInAppNotification,
    });
  };

  const handleOpenGoldSetup = () => {
    if (onOpenAddGoldLoan) {
      onOpenAddGoldLoan();
    } else {
      onOpenAddLoan();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Loans, Gold Loans &amp; EMIs
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track EMIs, dedicated Gold Loans, due dates &amp; auto reminders across all accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPayEmi()}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Pay EMI / Loan</span>
          </button>
          <button
            type="button"
            onClick={onOpenAddLoan}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Add Loan</span>
          </button>
          <button
            type="button"
            onClick={handleOpenGoldSetup}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            <span>Add Gold Loan</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs: All / Regular EMIs / Gold Loans */}
      <div className="grid grid-cols-3 sm:inline-flex p-1 bg-slate-200/70 rounded-2xl">
        {(
          [
            { id: 'all', label: `All (${loans.length})` },
            { id: 'regular', label: `Regular (${regularLoans.length})` },
            { id: 'gold', label: `Gold Loans (${goldLoans.length})` },
          ] as const
        ).map((tab) => {
          const active = activeLoanTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveLoanTab(tab.id)}
              className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Top Summary Cards: Total Outstanding & Auto Reminder Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Outstanding Loans</span>
            <Landmark className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
            {formatINR(totalOutstanding)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Across {loans.length} active accounts ({goldLoans.length} gold loans)
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Auto Reminder Status</span>
            <Bell className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2 mt-1 tabular-nums">
            <span className="text-xl font-black text-indigo-700">
              {enrichedLoans.filter((l) => l.isInReminderWindow).length} Alerting
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xl font-black text-emerald-600">
              {enrichedLoans.filter((l) => l.isPaidCurrentCycle).length} Paid
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            5 days before @ 6 AM, 12 PM &amp; 10 PM + 1st of every month alert
          </p>
        </div>
      </div>

      {/* Separate Commitments Breakdown: Monthly / Quarterly / Yearly (All Accounts) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Separate Loan Commitments (All Accounts)
              </h3>
              <p className="text-[11px] text-slate-500">
                Monthly, Quarterly &amp; Yearly commitments shown separately instead of combined
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePreviewFirstOfMonthAlert}
            className="self-start sm:self-auto min-h-[34px] px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Test 1st-of-Month Alert</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
          {/* Monthly Commitment */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                Monthly Commitment
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-100 shrink-0">
                {commitments.monthly.count} {commitments.monthly.count === 1 ? 'loan' : 'loans'}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight truncate">
              {formatINR(commitments.monthly.total)}
              <span className="text-xs font-semibold text-indigo-600"> / mo</span>
            </p>
            <p className="text-[11px] text-indigo-700 mt-1.5 truncate">
              {commitments.monthly.count > 0
                ? `Anson: ${formatINR(commitments.monthlyByOwner.Anson)} · Dona: ${formatINR(commitments.monthlyByOwner.Dona)}`
                : 'No monthly EMIs active'}
            </p>
          </div>

          {/* Quarterly Commitment */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Quarterly Commitment
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-amber-800 border border-amber-200/70 shrink-0">
                {commitments.quarterly.count} {commitments.quarterly.count === 1 ? 'loan' : 'loans'}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight truncate">
              {formatINR(commitments.quarterly.total)}
              <span className="text-xs font-semibold text-amber-700"> / qtr</span>
            </p>
            <p className="text-[11px] text-amber-800 mt-1.5 truncate">
              {commitments.quarterly.count > 0
                ? 'Every 3 months (Gold Loans & quarterly EMIs)'
                : 'No quarterly loans active'}
            </p>
          </div>

          {/* Yearly Commitment */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Yearly Commitment
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-emerald-700 border border-emerald-200/70 shrink-0">
                {commitments.yearly.count} {commitments.yearly.count === 1 ? 'loan' : 'loans'}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight truncate">
              {formatINR(commitments.yearly.total)}
              <span className="text-xs font-semibold text-emerald-700"> / yr</span>
            </p>
            <p className="text-[11px] text-emerald-800 mt-1.5 truncate">
              {commitments.yearly.count > 0
                ? 'Annual installment commitment'
                : 'No yearly loans active'}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Bell className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              <strong>1st of Every Month Alert:</strong> Auto-notifies all accounts with your Monthly Commitment ({formatINR(commitments.monthly.total)}) on the 1st of each month.
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
              notifyEmiReminders ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {notifyEmiReminders ? 'Active for All Accounts' : 'Paused in Settings'}
          </span>
        </div>
      </div>

      {/* Upcoming Due Schedule Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Auto-Calculated EMI &amp; Interest Schedule (All Accounts)
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
              <Bell className="w-3 h-3" />
              <span>Reminders: 5 days before &amp; due date (6 AM · 12 PM · 10 PM)</span>
            </span>
          </div>
        </div>

        {enrichedLoans.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No active loans or gold loans scheduled yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {enrichedLoans.map((loan) => (
              <div
                key={loan.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                  loan.isPaidCurrentCycle
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : loan.isInReminderWindow
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                    : 'bg-slate-50/70 border-slate-200 text-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold tracking-tight truncate flex items-center gap-1.5">
                      {loan.type === 'gold_loan' && <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      <span className="truncate">{loan.name}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        loan.isPaidCurrentCycle
                          ? 'bg-emerald-100 text-emerald-800'
                          : loan.isInReminderWindow
                          ? 'bg-amber-200 text-amber-950'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {loan.isPaidCurrentCycle
                        ? 'Paid'
                        : loan.diffDays === 0
                        ? 'Due Today'
                        : loan.isInReminderWindow
                        ? `Due in ${loan.diffDays}d`
                        : 'Scheduled'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Next Due: <strong>{loan.nextDueStr}</strong> ({loan.freq}) · {loan.owner}
                  </p>
                  <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                    Remind: {loan.remStartStr} – {loan.nextDueStr}
                  </p>
                  <p className="text-sm font-extrabold mt-2 tabular-nums">
                    {formatINR(loan.scheduledPayment)} / {loan.freq === 'yearly' ? 'year' : loan.freq === 'quarterly' ? 'quarter' : 'month'}
                  </p>
                </div>

                {!loan.isPaidCurrentCycle && (
                  <button
                    type="button"
                    onClick={() => onPayEmi(loan.id)}
                    className={`mt-3 w-full py-1.5 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer ${
                      loan.type === 'gold_loan'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    Pay {loan.name}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DEDICATED GOLD LOAN SECTION */}
      {(activeLoanTab === 'all' || activeLoanTab === 'gold') && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Gold Loan Accounts ({goldLoans.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Loan amount, total interest, quarterly interest, paid amount &amp; auto EMI reminders
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenGoldSetup}
              className="self-start sm:self-auto px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Up Gold Loan</span>
            </button>
          </div>

          {goldLoans.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Gold Loan Amount</p>
                <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5 tabular-nums truncate">
                  {formatINR(goldTotalAmount)}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Total Interest</p>
                <p className="text-base sm:text-lg font-black text-amber-900 mt-0.5 tabular-nums truncate">
                  {formatINR(goldTotalInterest)}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Paid Amount</p>
                <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 tabular-nums truncate">
                  {formatINR(goldTotalPaid)}
                </p>
              </div>
            </div>
          )}

          {goldLoans.length === 0 ? (
            <div className="bg-amber-50/40 rounded-2xl border border-dashed border-amber-300 p-6 text-center">
              <Coins className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-900">No Gold Loans Added Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Set up your gold loan with Loan Amount, Total Interest, Quarterly Interest, Paid Amount, and EMI Due Date for automatic phone reminders.
              </p>
              <button
                type="button"
                onClick={handleOpenGoldSetup}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Gold Loan</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goldLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-white rounded-2xl border border-amber-200/90 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-amber-100 mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-slate-900">{loan.name}</h4>
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                            Gold Loan
                          </span>
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded capitalize">
                            {loan.freq}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {loan.lenderName || 'Bank'} • Owner: <strong>{loan.owner}</strong>
                          {loan.linkedAccount && (
                            <>
                              {' '}• A/C:{' '}
                              <strong>
                                {loan.linkedAccount.isDefault ? '★ ' : ''}
                                {loan.linkedAccount.bankName}
                              </strong>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditLoan(loan)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Edit gold loan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetLoan(loan)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete gold loan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 4 Gold Loan Metrics: Loan Amount, Total Interest, Quarterly Interest, Paid Amount */}
                    <div className="grid grid-cols-2 gap-3 text-xs mb-4 tabular-nums">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Loan Amount</p>
                        <p className="text-base font-black text-slate-900 mt-0.5">
                          {formatINR(loan.originalAmount)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Rate: {loan.interestRate}% p.a.
                        </p>
                      </div>

                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-bold uppercase text-amber-800">Total Interest</p>
                        <p className="text-base font-black text-amber-900 mt-0.5">
                          {formatINR(loan.totalInterestCalc)}
                        </p>
                        <p className="text-[10px] text-amber-700">
                          Outst Principal: {formatINR(loan.outstandingPrincipal)}
                        </p>
                      </div>

                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-bold uppercase text-amber-800">Quarterly Interest</p>
                        <p className="text-base font-black text-amber-900 mt-0.5">
                          {formatINR(loan.quarterlyInterestCalc)}
                        </p>
                        <p className="text-[10px] text-amber-700">
                          Monthly eq: {formatINR(Math.round(loan.quarterlyInterestCalc / 3))}
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-bold uppercase text-emerald-800">Paid Amount</p>
                        <p className="text-base font-black text-emerald-700 mt-0.5">
                          {formatINR(loan.paidAmountCalc)}
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          {loan.emisPaid} payment{loan.emisPaid === 1 ? '' : 's'} logged
                        </p>
                      </div>
                    </div>

                    {/* Auto EMI Due Date & Reminder Box */}
                    <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/60 text-xs mb-4">
                      <div className="flex items-center justify-between gap-2 font-bold text-indigo-950">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>EMI Due Date: {loan.nextDueStr}</span>
                        </span>
                        <span className="text-[10px] bg-white text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                          Auto Reminder
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-800 mt-1">
                        Reminds <strong>{loan.remStartStr}</strong> to <strong>{loan.nextDueStr}</strong> at 6 AM, 12 PM &amp; 10 PM
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      Set Date: <strong>{loan.emiDueDate ? formatDateDDMMYYYY(loan.emiDueDate) : `${loan.emiDueDay}th`}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onPayEmi(loan.id)}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Pay Gold Loan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* REGULAR LOANS SECTION */}
      {(activeLoanTab === 'all' || activeLoanTab === 'regular') && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Regular Loans &amp; Repayment Progress ({regularLoans.length})
          </h3>

          {regularLoans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Landmark className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">No Regular Loans Added Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Add your home loan, car loan, personal loan, or education loan to track monthly, quarterly, or yearly EMIs and auto reminders.
              </p>
              <button
                type="button"
                onClick={onOpenAddLoan}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Regular Loan</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regularLoans.map((loan) => {
                const tenureProgress =
                  loan.tenureMonths > 0
                    ? Math.min(100, Math.round((loan.emisPaid / loan.tenureMonths) * 100))
                    : 0;
                const principalPaid = Math.max(0, loan.originalAmount - loan.outstandingPrincipal);
                const principalProgress =
                  loan.originalAmount > 0
                    ? Math.min(100, Math.round((principalPaid / loan.originalAmount) * 100))
                    : 0;

                return (
                  <div
                    key={loan.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900">{loan.name}</h4>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {LOAN_TYPE_LABELS[loan.type] || loan.type}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded capitalize">
                              {loan.freq}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Lender: {loan.lenderName || 'Bank'} • Owner: <strong>{loan.owner}</strong>
                            {loan.linkedAccount && (
                              <>
                                {' '}•{' '}
                                <strong>
                                  {loan.linkedAccount.isDefault ? '★ ' : ''}
                                  {loan.linkedAccount.bankName}
                                </strong>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditLoan(loan)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetLoan(loan)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs mb-4 tabular-nums">
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[11px] text-slate-400">Current Outstanding</p>
                          <p className="text-base font-black text-rose-600 mt-0.5">
                            {formatINR(loan.outstandingPrincipal)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Loan: {formatINR(loan.originalAmount)}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[11px] text-slate-400">Monthly EMI</p>
                          <p className="text-base font-black text-indigo-700 mt-0.5">
                            {formatINR(loan.monthlyEmi)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            @ {loan.interestRate}% interest
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 text-xs">
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                            <span>Tenure: {loan.emisPaid} / {loan.tenureMonths} EMIs Paid</span>
                            <span className="font-bold text-slate-800">{loan.emisRemaining} remaining</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                              style={{ width: `${tenureProgress}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                            <span>Principal Repaid ({principalProgress}%)</span>
                            <span className="font-bold text-emerald-700">{formatINR(principalPaid)}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${principalProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">
                        <span>Next Due: <strong>{loan.nextDueStr}</strong></span>
                        <span className="block text-[10px] text-indigo-700 font-semibold">
                          Remind: {loan.remStartStr} – {loan.nextDueStr}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPayEmi(loan.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
                      >
                        Pay Installment
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EMI Payment History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          EMI &amp; Gold Loan Payment History ({emiTransactions.length})
        </h3>

        {emiTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No EMI or Gold Loan payments recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {emiTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900 truncate">{tx.title}</p>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                      {tx.person}
                    </span>
                    {tx.paymentFrequency && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded capitalize">
                        {tx.paymentFrequency}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDateDDMMYYYY(tx.date)} • {tx.paymentMethod === 'cash' ? 'Paid in Cash' : 'Paid via Bank'}
                    {tx.notes ? ` • ${tx.notes}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right tabular-nums">
                    <p className="font-black text-rose-600">{formatINR(tx.amount)}</p>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                      Recorded Outflow
                    </span>
                  </div>
                  {onEditTransaction && (
                    <button
                      type="button"
                      onClick={() => onEditTransaction(tx)}
                      aria-label="Edit EMI payment"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteTargetTx(tx)}
                    aria-label="Delete EMI payment"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Loan Yes/No Confirmation Popup */}
      {deleteTargetLoan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
          onClick={() => setDeleteTargetLoan(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetLoan(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Delete this {deleteTargetLoan.type === 'gold_loan' ? 'Gold Loan' : 'Loan'}?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {deleteTargetLoan.name} ({formatINR(deleteTargetLoan.originalAmount)}) will be removed from scheduled reminders.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTargetLoan(null)}
                className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteLoan(deleteTargetLoan.id);
                  setDeleteTargetLoan(null);
                }}
                className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete EMI Payment Transaction Yes/No Confirmation Popup */}
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
