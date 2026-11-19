import React, { useMemo, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { HealthInsurancePolicy, Transaction } from '../../types/finance';
import { formatDateDDMMYYYY, formatINR, getTodayISO } from '../../utils/formatters';
import {
  formatDateToISO,
  getInsuranceMonthlyEquivalent,
  getInsuranceScheduledAmount,
  getNextDueDateForInsurance,
  getReminderWindowStart,
  isInsuranceCyclePaid,
} from '../../utils/notifications';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Edit2,
  HeartPulse,
  IndianRupee,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';

interface HealthInsuranceViewProps {
  onOpenAddPolicy: () => void;
  onEditPolicy: (policy: HealthInsurancePolicy) => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const HealthInsuranceView: React.FC<HealthInsuranceViewProps> = ({
  onOpenAddPolicy,
  onEditPolicy,
  onEditTransaction,
}) => {
  const {
    currentUser,
    healthInsurances,
    transactions,
    bankAccounts,
    defaultBankAccount,
    deleteHealthInsurance,
    deleteTransaction,
    recordInsurancePayment,
  } = useFinance();

  const [deleteTargetPolicy, setDeleteTargetPolicy] = useState<HealthInsurancePolicy | null>(null);
  const [deleteTargetTx, setDeleteTargetTx] = useState<Transaction | null>(null);

  // Pay EMI inline modal state
  const [payPolicy, setPayPolicy] = useState<HealthInsurancePolicy | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(getTodayISO());
  const [payMethod, setPayMethod] = useState<'bank' | 'cash'>('bank');
  const [payAccountId, setPayAccountId] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [payError, setPayError] = useState<string>('');

  const spendingAccounts = useMemo(
    () =>
      bankAccounts
        .filter((a) => a.owner !== 'Joint')
        .sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))),
    [bankAccounts]
  );

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const activePolicies = useMemo(
    () => healthInsurances.filter((p) => p.status !== 'expired'),
    [healthInsurances]
  );

  const summary = useMemo(() => {
    const totalCoverage = activePolicies.reduce((s, p) => s + (p.sumInsured || 0), 0);
    const totalMonthlyEmi = activePolicies.reduce((s, p) => s + getInsuranceMonthlyEquivalent(p), 0);
    const totalAnnualPremium = activePolicies.reduce(
      (s, p) => s + (p.annualPremium || (p.monthlyEmi || 0) * 12),
      0
    );
    const paidThisMonth = transactions
      .filter((tx) => tx.insurancePolicyId && (tx.date || '').startsWith(currentMonthPrefix))
      .reduce((s, tx) => s + tx.amount, 0);

    return { totalCoverage, totalMonthlyEmi, totalAnnualPremium, paidThisMonth };
  }, [activePolicies, transactions, currentMonthPrefix]);

  const insuranceHistory = useMemo(
    () =>
      transactions
        .filter((tx) => Boolean(tx.insurancePolicyId) || tx.category === 'insurance')
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [transactions]
  );

  const openPayModal = (policy: HealthInsurancePolicy) => {
    const scheduled = getInsuranceScheduledAmount(policy);
    setPayPolicy(policy);
    setPayAmount(String(scheduled));
    setPayDate(getTodayISO());
    setPayMethod(spendingAccounts.length > 0 ? 'bank' : 'cash');
    const preferredAcc =
      spendingAccounts.find((a) => a.id === policy.linkedAccountId) ||
      defaultBankAccount ||
      spendingAccounts[0];
    setPayAccountId(preferredAcc?.id || '');
    setPayNotes(`${policy.insurer} · Health Insurance EMI`);
    setPayError('');
  };

  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payPolicy) return;
    const numAmt = parseFloat(payAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setPayError('Please enter a valid EMI amount greater than 0.');
      return;
    }
    if (payMethod === 'bank' && !payAccountId) {
      setPayError('Please select a bank account or switch to Cash.');
      return;
    }

    recordInsurancePayment({
      policyId: payPolicy.id,
      amount: numAmt,
      paidBy: currentUser,
      paymentMethod: payMethod,
      accountId: payMethod === 'bank' ? payAccountId : undefined,
      date: payDate,
      notes: payNotes.trim(),
    });
    setPayPolicy(null);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-teal-600" />
            <span>Health Insurance EMI</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track family health policies, monthly EMI schedule &amp; automatic payment reminders
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddPolicy}
          className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Health Policy</span>
        </button>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">Monthly Health EMI</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-teal-700 mt-1 tabular-nums">
            {formatINR(summary.totalMonthlyEmi)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">
            Annual total: <strong className="text-slate-700">{formatINR(summary.totalAnnualPremium)}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">Total Health Coverage</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {formatINR(summary.totalCoverage)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Across <strong>{activePolicies.length}</strong> active{' '}
            {activePolicies.length === 1 ? 'policy' : 'policies'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">Paid This Month</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 tabular-nums">
            {formatINR(summary.paidThisMonth)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
            <Bell className="w-3 h-3 text-teal-600 shrink-0" />
            <span>Auto alerts 5d before &amp; due day</span>
          </p>
        </div>
      </div>

      {/* Policies List */}
      {healthInsurances.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">No Health Insurance Policies Yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 mb-5">
            Add your family or personal health insurance policy to track monthly EMI payments, sum insured coverage, renewal dates, and automatic phone alerts.
          </p>
          <button
            type="button"
            onClick={onOpenAddPolicy}
            className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Health Policy</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {healthInsurances.map((policy) => {
            const scheduledAmt = getInsuranceScheduledAmount(policy);
            const nextDue = getNextDueDateForInsurance(policy, transactions, today);
            const isPaidCycle = isInsuranceCyclePaid(policy, nextDue, transactions);
            const diffDays = Math.round((nextDue.getTime() - todayMidnight.getTime()) / 86400000);
            const reminderStart = getReminderWindowStart(nextDue);
            const totalPaidForPolicy = transactions
              .filter((tx) => tx.insurancePolicyId === policy.id)
              .reduce((s, tx) => s + tx.amount, 0);
            const freqLabel =
              policy.paymentFrequency === 'yearly'
                ? 'Yearly'
                : policy.paymentFrequency === 'quarterly'
                ? 'Quarterly'
                : 'Monthly EMI';

            return (
              <div
                key={policy.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 ${
                  policy.status === 'expired'
                    ? 'border-slate-200 opacity-75'
                    : diffDays <= 5 && !isPaidCycle
                    ? 'border-amber-300 ring-1 ring-amber-200/70'
                    : 'border-slate-200/90'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 mb-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200/70">
                          {policy.owner}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                          {freqLabel}
                        </span>
                        {policy.status === 'expired' ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700">
                            Expired
                          </span>
                        ) : isPaidCycle ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : diffDays <= 5 ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800">
                            {diffDays === 0 ? 'Due Today' : `Due in ${diffDays}d`}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 truncate">
                        {policy.policyName}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        {policy.insurer}
                        {policy.policyNumber ? ` · #${policy.policyNumber}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditPolicy(policy)}
                        aria-label="Edit policy"
                        className="min-w-[36px] min-h-[36px] rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetPolicy(policy)}
                        aria-label="Delete policy"
                        className="min-w-[36px] min-h-[36px] rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Key Numbers Grid */}
                  <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 tabular-nums">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500">EMI Amount</p>
                      <p className="text-sm sm:text-base font-extrabold text-teal-700">
                        {formatINR(scheduledAmt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500">Sum Insured</p>
                      <p className="text-sm sm:text-base font-extrabold text-slate-900">
                        {policy.sumInsured > 0 ? formatINR(policy.sumInsured) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500">Total Paid</p>
                      <p className="text-sm sm:text-base font-extrabold text-emerald-700">
                        {formatINR(totalPaidForPolicy)}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-slate-500">
                        <Users className="w-3.5 h-3.5" /> Covered Members
                      </span>
                      <span className="font-bold text-slate-800 truncate">{policy.coveredMembers}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5" /> Next EMI Due
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatDateDDMMYYYY(formatDateToISO(nextDue))}
                      </span>
                    </div>
                    {policy.renewalDate && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <ShieldCheck className="w-3.5 h-3.5" /> Policy Renewal
                        </span>
                        <span className="font-semibold text-slate-700 tabular-nums">
                          {formatDateDDMMYYYY(policy.renewalDate)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-teal-700 bg-teal-50/70 px-2.5 py-1.5 rounded-lg mt-1">
                      <Bell className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Auto alert: {formatDateDDMMYYYY(formatDateToISO(reminderStart))} –{' '}
                        {formatDateDDMMYYYY(formatDateToISO(nextDue))} (6 AM, 12 PM, 10 PM)
                      </span>
                    </div>
                    {policy.notes && (
                      <p className="text-[11px] text-slate-500 pt-1 italic">{policy.notes}</p>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                {policy.status !== 'expired' && (
                  <button
                    type="button"
                    onClick={() => openPayModal(policy)}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-teal-400" />
                    <span>Pay {freqLabel} ({formatINR(scheduledAmt)})</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Health Insurance Payment History */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Health Insurance Payment History
            </h3>
            <p className="text-xs text-slate-500">
              All recorded health insurance EMI &amp; premium payments
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {insuranceHistory.length} {insuranceHistory.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {insuranceHistory.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No health insurance payments recorded yet. Tap Pay on any policy above to record your monthly EMI.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {insuranceHistory.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {tx.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {formatDateDDMMYYYY(tx.date)} · {tx.person} · {tx.paymentMethod === 'cash' ? 'Cash' : 'Bank'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                    {formatINR(tx.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditTransaction(tx)}
                    aria-label="Edit payment"
                    className="min-w-[32px] min-h-[32px] rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetTx(tx)}
                    aria-label="Delete payment"
                    className="min-w-[32px] min-h-[32px] rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pay Health Insurance EMI Modal */}
      {payPolicy && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setPayPolicy(null)}
        >
          <div className="min-h-full flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12">
            <div
              className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Pay Health Insurance EMI</h3>
                  <p className="text-xs text-slate-500">
                    {payPolicy.policyName} · {payPolicy.insurer}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPayPolicy(null)}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {payError && (
                <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                  {payError}
                </div>
              )}

              <form onSubmit={handleConfirmPay} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    EMI Amount (₹) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      required
                      value={payAmount}
                      onChange={(e) => {
                        setPayAmount(e.target.value);
                        setPayError('');
                      }}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Payment Source *
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod('bank')}
                      className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                        payMethod === 'bank'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Bank Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod('cash')}
                      className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                        payMethod === 'cash'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Cash ({currentUser})
                    </button>
                  </div>

                  {payMethod === 'bank' && (
                    spendingAccounts.length === 0 ? (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                        No personal bank accounts available. Switch to Cash or add an Anson/Dona bank account.
                      </p>
                    ) : (
                      <select
                        value={payAccountId}
                        onChange={(e) => setPayAccountId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                      >
                        {spendingAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.isDefault ? '★ Default · ' : ''}[{acc.owner}] {acc.bankName} - {acc.name} (Bal: {formatINR(acc.currentBalance)})
                          </option>
                        ))}
                      </select>
                    )
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayPolicy(null)}
                    className="w-1/3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Payment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Yes/No Delete Policy Confirmation Modal */}
      {deleteTargetPolicy && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteTargetPolicy(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-slate-900">Delete Health Policy?</h3>
            <p className="text-xs text-slate-600 mt-1.5">
              Are you sure you want to delete <strong>{deleteTargetPolicy.policyName}</strong> ({deleteTargetPolicy.insurer})?
            </p>
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTargetPolicy(null)}
                className="min-h-[44px] py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                No, Keep It
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteHealthInsurance(deleteTargetPolicy.id);
                  setDeleteTargetPolicy(null);
                }}
                className="min-h-[44px] py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yes/No Delete Transaction Confirmation Modal */}
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
