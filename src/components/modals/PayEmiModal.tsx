import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { LoanType, PaymentFrequency, Person, Transaction } from '../../types/finance';
import { formatDateDDMMYYYY, formatINR, getTodayISO } from '../../utils/formatters';
import {
  formatDateToISO,
  getLoanFrequency,
  getLoanPaidAmount,
  getLoanPeriodInterestEstimate,
  getLoanQuarterlyInterest,
  getLoanScheduledPaymentAmount,
  getLoanTotalInterest,
  getNextDueDateForLoan,
  getReminderWindowStart,
} from '../../utils/notifications';
import { X, Landmark, Check, Plus, Coins, Bell, Calendar } from 'lucide-react';

interface PayEmiModalProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  presetLoanId?: string;
  editTx?: Transaction | null;
  onOpenAddLoan?: (presetType?: LoanType) => void;
}

export const PayEmiModal: React.FC<PayEmiModalProps> = ({
  isOpen,
  onClose,
  presetLoanId,
  editTx,
  onOpenAddLoan,
}) => {
  const {
    loans,
    transactions,
    bankAccounts,
    defaultBankAccount,
    recordEmiPayment,
    editTransaction,
    currentUser,
  } = useFinance();

  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentFrequency>('monthly');
  const [amount, setAmount] = useState<string>('');
  const [paidBy, setPaidBy] = useState<Person>(currentUser);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'cash'>('bank');
  const [accountId, setAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayISO());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const availableLoans = useMemo(
    () =>
      editTx
        ? loans.filter((l) => l.status === 'active' || l.id === editTx.loanId)
        : loans.filter((l) => l.status === 'active'),
    [loans, editTx]
  );

  const sortedAccounts = useMemo(
    () =>
      bankAccounts
        .filter((a) => a.owner !== 'Joint' || (editTx && editTx.fromAccountId === a.id))
        .sort((a, b) => {
          if (Boolean(a.isDefault) !== Boolean(b.isDefault)) {
            return a.isDefault ? -1 : 1;
          }
          return 0;
        }),
    [bankAccounts, editTx]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (editTx) {
      const targetLoan = availableLoans.find((l) => l.id === editTx.loanId) || availableLoans[0];
      setSelectedLoanId(targetLoan?.id || '');
      setPaymentPeriod(editTx.paymentFrequency || (targetLoan ? getLoanFrequency(targetLoan) : 'monthly'));
      setAmount(String(editTx.amount));
      setPaidBy(editTx.person || currentUser);
      setPaymentMethod(editTx.paymentMethod === 'cash' ? 'cash' : 'bank');
      setAccountId(editTx.fromAccountId || defaultBankAccount?.id || sortedAccounts[0]?.id || '');
      setDate(editTx.date);
      setNotes(editTx.notes || '');
      setError('');
    } else {
      const targetLoanId = presetLoanId || availableLoans[0]?.id || '';
      setSelectedLoanId(targetLoanId);
      const loan = availableLoans.find((l) => l.id === targetLoanId);
      const defaultPeriod = loan ? getLoanFrequency(loan) : 'monthly';
      setPaymentPeriod(defaultPeriod);
      setAmount(loan ? String(getLoanScheduledPaymentAmount(loan, defaultPeriod)) : '');
      setPaidBy(currentUser);
      setPaymentMethod(sortedAccounts.length > 0 ? 'bank' : 'cash');
      const defAcc =
        (loan?.linkedAccountId ? sortedAccounts.find((a) => a.id === loan.linkedAccountId) : undefined) ||
        defaultBankAccount ||
        sortedAccounts.find((a) => a.owner === currentUser) ||
        sortedAccounts[0];
      setAccountId(defAcc?.id || '');
      setDate(getTodayISO());
      setNotes('');
      setError('');
    }
  }, [isOpen, editTx, presetLoanId, availableLoans, bankAccounts, defaultBankAccount, sortedAccounts, currentUser]);

  const currentLoan = useMemo(
    () => availableLoans.find((l) => l.id === selectedLoanId),
    [availableLoans, selectedLoanId]
  );

  const loanBreakdown = useMemo(() => {
    if (!currentLoan) return null;
    const isGold = currentLoan.type === 'gold_loan';
    const nextDue = getNextDueDateForLoan(currentLoan, transactions, new Date());
    const remStart = getReminderWindowStart(nextDue);
    const periodInterest = getLoanPeriodInterestEstimate(currentLoan, paymentPeriod);
    const totalInterest = getLoanTotalInterest(currentLoan);
    const quarterlyInterest = getLoanQuarterlyInterest(currentLoan);
    const paidAmount = getLoanPaidAmount(currentLoan, transactions);
    const periodInstallment = getLoanScheduledPaymentAmount(currentLoan, paymentPeriod);

    return {
      isGold,
      nextDueStr: formatDateDDMMYYYY(formatDateToISO(nextDue)),
      remStartStr: formatDateDDMMYYYY(formatDateToISO(remStart)),
      periodInterest,
      totalInterest,
      quarterlyInterest,
      paidAmount,
      periodInstallment,
    };
  }, [currentLoan, transactions, paymentPeriod]);

  if (!isOpen) return null;

  // Update suggested EMI amount & account when user picks a loan
  const handleLoanChange = (newLoanId: string) => {
    setSelectedLoanId(newLoanId);
    const loan = availableLoans.find((l) => l.id === newLoanId);
    if (loan) {
      const freq = getLoanFrequency(loan);
      setPaymentPeriod(freq);
      if (!editTx) {
        setAmount(String(getLoanScheduledPaymentAmount(loan, freq)));
        const defAcc =
          (loan.linkedAccountId ? bankAccounts.find((a) => a.id === loan.linkedAccountId) : undefined) ||
          defaultBankAccount ||
          bankAccounts.find((a) => a.owner === currentUser) ||
          bankAccounts.find((a) => a.owner === 'Joint') ||
          bankAccounts[0];
        if (defAcc) setAccountId(defAcc.id);
      }
    }
  };

  // Update payment amount when user switches Monthly / Quarterly / Yearly
  const handlePeriodChange = (freq: PaymentFrequency) => {
    setPaymentPeriod(freq);
    if (currentLoan) {
      setAmount(String(getLoanScheduledPaymentAmount(currentLoan, freq)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid EMI amount');
      return;
    }
    if (!selectedLoanId || !currentLoan) {
      setError('Please select an active loan to pay');
      return;
    }
    if (paymentMethod === 'bank' && !accountId) {
      setError('Please select the payment bank account');
      return;
    }

    const estimatedInterest = getLoanPeriodInterestEstimate(currentLoan, paymentPeriod);
    const freqLabel =
      paymentPeriod === 'yearly' ? 'Yearly' : paymentPeriod === 'quarterly' ? 'Quarterly' : 'Monthly';

    if (editTx) {
      const targetPerson = editTx.person || currentUser;
      const loanName = currentLoan.name;
      editTransaction(editTx.id, {
        title: `${loanName} - ${currentLoan.type === 'gold_loan' ? `${freqLabel} Gold Loan Interest` : `${freqLabel} EMI`}`,
        amount: numAmount,
        date,
        person: targetPerson,
        paymentMethod,
        fromAccountId: paymentMethod === 'bank' ? accountId : undefined,
        fromCashPerson: paymentMethod === 'cash' ? targetPerson : undefined,
        loanId: selectedLoanId,
        paymentFrequency: paymentPeriod,
        interestAmount: estimatedInterest,
        category: currentLoan.type === 'home_loan' ? 'rent' : 'travel',
        notes: notes.trim() || `${freqLabel} payment for ${loanName}`,
      });
    } else {
      recordEmiPayment({
        loanId: selectedLoanId,
        amount: numAmount,
        paidBy: currentUser,
        paymentMethod,
        accountId: paymentMethod === 'bank' ? accountId : undefined,
        date,
        notes: notes.trim(),
        paymentFrequency: paymentPeriod,
        interestAmount: estimatedInterest,
      });
    }

    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12">
        <div
          className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Title and explicit Close button */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onClose()}
                className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                title="Close window"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editTx ? 'Edit EMI Payment' : 'Pay EMI / Loan'}
                </h3>
                <p className="text-xs text-slate-500">Monthly, Quarterly &amp; Yearly loan payments</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose()}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
            >
              Close
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {availableLoans.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Landmark className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">No Active Loans Found</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mb-5">
                Add a loan or gold loan right here to view loan amount, interest, payment options, and reminders.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                {onOpenAddLoan && (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenAddLoan('home_loan')}
                      className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Loan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAddLoan('gold_loan')}
                      className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Coins className="w-4 h-4" />
                      <span>Add Gold Loan</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Select Loan + Inline Add Loan Option */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Select Active Loan *
                  </label>
                  {onOpenAddLoan && !editTx && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenAddLoan('home_loan')}
                        className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Loan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAddLoan('gold_loan')}
                        className="text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Coins className="w-3 h-3" />
                        <span>+ Gold Loan</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Clickable Loan Chips when <= 4 loans for 1-tap switching + Select dropdown */}
                {availableLoans.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {availableLoans.map((l) => {
                      const active = l.id === selectedLoanId;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => handleLoanChange(l.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                            active
                              ? l.type === 'gold_loan'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                : 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {l.type === 'gold_loan' && <Coins className="w-3 h-3" />}
                          <span>{l.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <select
                  value={selectedLoanId}
                  onChange={(e) => handleLoanChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {availableLoans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.type === 'gold_loan' ? 'Gold Loan · ' : ''}
                      {l.name} ({l.owner}) • {formatINR(l.originalAmount)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Detailed Loan Breakdown Card (Loan Amount, Interest Amount, Monthly Payment, Next Due Date) */}
              {currentLoan && loanBreakdown && (
                <div
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    loanBreakdown.isGold
                      ? 'bg-amber-50/70 border-amber-200/80'
                      : 'bg-indigo-50/70 border-indigo-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                        {loanBreakdown.isGold && <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        <span>{currentLoan.name}</span>
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {currentLoan.owner} · {currentLoan.lenderName || 'Bank'} · {currentLoan.interestRate}% p.a.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-indigo-700 bg-white border border-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      Due: {loanBreakdown.nextDueStr}
                    </span>
                  </div>

                  {/* 3-Tile Financial Breakdown: Loan Amount, Interest Amount, Monthly Payment */}
                  <div className="grid grid-cols-3 gap-2 tabular-nums">
                    <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Loan Amount</p>
                      <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                        {formatINR(currentLoan.originalAmount)}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        Outst: {formatINR(currentLoan.outstandingPrincipal)}
                      </p>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {paymentPeriod === 'yearly'
                          ? 'Yearly Interest'
                          : paymentPeriod === 'quarterly'
                          ? 'Quarterly Int.'
                          : 'Monthly Interest'}
                      </p>
                      <p className="text-xs sm:text-sm font-black text-amber-700 mt-0.5">
                        {formatINR(loanBreakdown.periodInterest)}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {loanBreakdown.isGold
                          ? `Total: ${formatINR(loanBreakdown.totalInterest)}`
                          : `@ ${currentLoan.interestRate}% rate`}
                      </p>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Monthly Pay
                      </p>
                      <p className="text-xs sm:text-sm font-black text-indigo-700 mt-0.5">
                        {formatINR(currentLoan.monthlyEmi)}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {loanBreakdown.isGold
                          ? `Paid: ${formatINR(loanBreakdown.paidAmount)}`
                          : `${currentLoan.emisRemaining} EMIs left`}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] font-semibold text-indigo-800 flex items-center gap-1">
                    <Bell className="w-3 h-3 shrink-0" />
                    <span>
                      Reminder window: {loanBreakdown.remStartStr} – {loanBreakdown.nextDueStr} (6 AM, 12 PM, 10 PM)
                    </span>
                  </p>
                </div>
              )}

              {/* Payment Frequency Selector: Monthly / Quarterly / Yearly */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Payment Plan (Monthly / Quarterly / Yearly) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'monthly', label: 'Monthly' },
                      { id: 'quarterly', label: 'Quarterly' },
                      { id: 'yearly', label: 'Yearly' },
                    ] as const
                  ).map((opt) => {
                    const suggested = currentLoan
                      ? getLoanScheduledPaymentAmount(currentLoan, opt.id)
                      : 0;
                    const active = paymentPeriod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handlePeriodChange(opt.id)}
                        className={`py-2 px-2 rounded-xl border text-center transition cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs font-bold">{opt.label}</span>
                        {currentLoan && (
                          <span
                            className={`block text-[10px] tabular-nums ${
                              active ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {formatINR(suggested)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount & Paid By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Payment Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      required
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setError('');
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition no-spinner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Paid By (Logged-in Account)
                  </label>
                  <div className="py-2.5 px-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{paidBy}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      Account Locked
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method & Bank Account */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Paid From (All Accounts) *
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      paymentMethod === 'bank'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Bank Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      paymentMethod === 'cash'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cash Wallet ({paidBy})
                  </button>
                </div>

                {paymentMethod === 'bank' && (
                  <div>
                    {bankAccounts.length === 0 ? (
                      <div className="p-2 text-xs text-amber-800 bg-amber-50 rounded-xl">
                        No bank accounts found. Please use Cash or add a bank account first.
                      </div>
                    ) : (
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                      >
                        {sortedAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.isDefault ? '★ Default · ' : ''}{acc.bankName} - {acc.name} ({acc.owner}) • Bal: ₹{acc.currentBalance.toLocaleString('en-IN')}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Quarterly gold interest"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Action buttons: Cancel and Record EMI */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editTx ? 'Update Payment' : 'Record Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
