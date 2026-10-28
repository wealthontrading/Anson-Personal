import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Loan, LoanType } from '../../types/finance';
import {
  formatINR,
  formatDateDDMMYYYY,
  LOAN_TYPE_LABELS,
} from '../../utils/formatters';
import {
  Landmark,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit2,
  Trash2,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';

interface EmisViewProps {
  onOpenAddLoan: () => void;
  onEditLoan: (loan: Loan) => void;
  onPayEmi: (loanId?: string) => void;
}

export const EmisView: React.FC<EmisViewProps> = ({
  onOpenAddLoan,
  onEditLoan,
  onPayEmi,
}) => {
  const { loans, deleteLoan, transactions } = useFinance();

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Loan statuses for the current month
  const loanStatuses = loans.map((l) => {
    const isPaidThisMonth = transactions.some(
      (tx) => tx.type === 'emi_payment' && tx.loanId === l.id && tx.date.startsWith(currentMonthYear)
    );
    const isOverdue = !isPaidThisMonth && currentDay > l.emiDueDay;
    const isPending = !isPaidThisMonth && currentDay <= l.emiDueDay;

    return {
      ...l,
      isPaidThisMonth,
      isOverdue,
      isPending,
    };
  });

  const totalOutstanding = loans.reduce((s, l) => s + l.outstandingPrincipal, 0);
  const totalMonthlyCommitment = loans.reduce((s, l) => s + l.monthlyEmi, 0);

  // EMI payment history across all loans
  const emiTransactions = transactions.filter((tx) => tx.type === 'emi_payment');

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Loans & EMI Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track home loans, car loans, monthly commitments, and payment status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPayEmi()}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Record EMI Payment</span>
          </button>
          <button
            onClick={onOpenAddLoan}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Add New Loan</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Outstanding Loans</span>
            <Landmark className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {formatINR(totalOutstanding)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Across {loans.length} active loan accounts
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Monthly Commitment</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-indigo-600 tracking-tight">
            {formatINR(totalMonthlyCommitment)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Total EMI required every month
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>October Payment Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-black text-emerald-600">
              {loanStatuses.filter((l) => l.isPaidThisMonth).length} Paid
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xl font-black text-slate-700">
              {loanStatuses.filter((l) => !l.isPaidThisMonth).length} Due
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {loanStatuses.some((l) => l.isOverdue) ? '⚠️ Alert: EMI overdue' : 'All installments up to date'}
          </p>
        </div>
      </div>

      {/* Monthly EMI Calendar & Due Dates Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Monthly EMI Schedule & Reminders
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Day {currentDay} of the month
          </span>
        </div>

        {loanStatuses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No active loan commitments scheduled for this month.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loanStatuses.map((loan) => {
              return (
                <div
                  key={loan.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                    loan.isPaidThisMonth
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : loan.isOverdue
                      ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                      : 'bg-amber-50/50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold tracking-tight">
                        {loan.name}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          loan.isPaidThisMonth
                            ? 'bg-emerald-200 text-emerald-800'
                            : loan.isOverdue
                            ? 'bg-rose-200 text-rose-800 animate-pulse'
                            : 'bg-amber-200 text-amber-800'
                        }`}
                      >
                        {loan.isPaidThisMonth ? 'Paid' : loan.isOverdue ? 'Overdue' : 'Pending'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Due Date: <strong>{loan.emiDueDay}th of each month</strong> ({loan.owner})
                    </p>
                    <p className="text-sm font-extrabold mt-2">
                      {formatINR(loan.monthlyEmi)} / month
                    </p>
                  </div>

                  {!loan.isPaidThisMonth && (
                    <button
                      onClick={() => onPayEmi(loan.id)}
                      className="mt-3 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      Pay {loan.name} EMI
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Loan Details List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Active Loans & Repayment Progress ({loans.length})
        </h3>

        {loans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Landmark className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">No Loans Added Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Add your home loan, car loan, personal loan, or education loan to keep track of monthly EMIs, due dates, and principal repayments.
            </p>
            <button
              type="button"
              onClick={onOpenAddLoan}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Your First Loan</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loans.map((loan) => {
              const tenureProgress =
                loan.tenureMonths > 0
                  ? Math.round((loan.emisPaid / loan.tenureMonths) * 100)
                  : 0;
              const principalPaid = Math.max(0, loan.originalAmount - loan.outstandingPrincipal);
              const principalProgress =
                loan.originalAmount > 0
                  ? Math.round((principalPaid / loan.originalAmount) * 100)
                  : 0;

            return (
              <div
                key={loan.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Name & Owner */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{loan.name}</h4>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {LOAN_TYPE_LABELS[loan.type] || loan.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Lender: {loan.lenderName || 'Bank'} • Owner: <strong>{loan.owner}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditLoan(loan)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteLoan(loan.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Figures Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[11px] text-slate-400">Current Outstanding</p>
                      <p className="text-base font-black text-rose-600 mt-0.5">
                        {formatINR(loan.outstandingPrincipal)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Orig: {formatINR(loan.originalAmount)}
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

                  {/* Progress Bars */}
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

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    EMI Due: <strong>{loan.emiDueDay}th</strong> of month
                  </span>
                  <button
                    onClick={() => onPayEmi(loan.id)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
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

      {/* EMI Payment History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          EMI Payment History
        </h3>

        {emiTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No EMI payments recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {emiTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{tx.title}</p>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                      {tx.person}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDateDDMMYYYY(tx.date)} • {tx.paymentMethod === 'cash' ? 'Paid in Cash' : 'Paid via Bank'}
                    {tx.notes ? ` • ${tx.notes}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-rose-600">{formatINR(tx.amount)}</p>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                    Recorded Outflow
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
