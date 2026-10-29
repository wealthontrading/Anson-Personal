import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, getCurrentMonthStr } from '../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Calendar,
  IndianRupee,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ShieldCheck,
} from 'lucide-react';

export const MonthlySummaryCard: React.FC = () => {
  const { transactions, activeDashboard, selectedMonth } = useFinance();

  // Determine current active month (e.g. "2026-10")
  const currentMonth = selectedMonth === 'all' ? getCurrentMonthStr() : selectedMonth;

  // Format month name nicely (e.g., "October 2026")
  const formattedMonthLabel = (() => {
    try {
      const [year, month] = currentMonth.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
      return currentMonth;
    }
  })();

  // Filter transactions for this month based on active dashboard
  const monthTransactions = transactions.filter((tx) => {
    if (!tx.date.startsWith(currentMonth)) return false;
    if (activeDashboard === 'Anson' && tx.person !== 'Anson') return false;
    if (activeDashboard === 'Dona' && tx.person !== 'Dona') return false;
    return true;
  });

  // Calculate totals from stored transactions
  const totalIncome = monthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenseAndEmi = monthTransactions
    .filter((tx) => tx.type === 'expense' || tx.type === 'emi_payment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const pureExpenses = monthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const emiExpenses = monthTransactions
    .filter((tx) => tx.type === 'emi_payment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netSavings = totalIncome - totalExpenseAndEmi;
  const isSurplus = netSavings >= 0;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const expenseRate = totalIncome > 0 ? Math.min(100, Math.round((totalExpenseAndEmi / totalIncome) * 100)) : 0;

  // Person breakdown (Anson vs Dona)
  const ansonMonthTx = transactions.filter((tx) => tx.date.startsWith(currentMonth) && tx.person === 'Anson');
  const donaMonthTx = transactions.filter((tx) => tx.date.startsWith(currentMonth) && tx.person === 'Dona');

  const ansonIncome = ansonMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const ansonSpend = ansonMonthTx.filter((t) => t.type === 'expense' || t.type === 'emi_payment').reduce((s, t) => s + t.amount, 0);
  const ansonSavings = ansonIncome - ansonSpend;

  const donaIncome = donaMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const donaSpend = donaMonthTx.filter((t) => t.type === 'expense' || t.type === 'emi_payment').reduce((s, t) => s + t.amount, 0);
  const donaSavings = donaIncome - donaSpend;

  // Days in month calculation for average daily burn
  const daysInMonth = 30;
  const avgDailySpend = Math.round(totalExpenseAndEmi / daysInMonth);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs relative overflow-hidden">
      {/* Top subtle decorative highlight bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-600 to-indigo-600" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Monthly Summary — {formattedMonthLabel}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time calculation of income, expenses, and net savings from all stored transactions
            {activeDashboard !== 'Family' && ` (${activeDashboard}'s Account)`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-bold px-3 py-1 rounded-xl bg-slate-100 text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{monthTransactions.length} {monthTransactions.length === 1 ? 'Transaction' : 'Transactions'}</span>
          </span>
          {savingsRate > 0 && (
            <span className="text-[11px] font-extrabold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              {savingsRate}% Saved
            </span>
          )}
        </div>
      </div>

      {/* Primary KPI Grid: Income, Expenses, Savings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
        {/* Total Income */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Total Income
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            {formatINR(totalIncome)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-emerald-600 font-medium mt-2 pt-2 border-t border-emerald-200/60">
            <span>Inflows received</span>
            <span>{monthTransactions.filter((t) => t.type === 'income').length} entries</span>
          </div>
        </div>

        {/* Total Expenses & EMIs */}
        <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 tracking-tight">
            {formatINR(totalExpenseAndEmi)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-rose-600 font-medium mt-2 pt-2 border-t border-rose-200/60">
            <span>Spend: {formatINR(pureExpenses)}</span>
            <span>EMIs: {formatINR(emiExpenses)}</span>
          </div>
        </div>

        {/* Net Savings */}
        <div
          className={`p-4 rounded-2xl border relative ${
            isSurplus
              ? 'bg-blue-50/50 border-blue-200/80 text-blue-900'
              : 'bg-amber-50/50 border-amber-200/80 text-amber-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isSurplus ? 'text-blue-800' : 'text-amber-800'
              }`}
            >
              Net Monthly Savings
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isSurplus ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <PiggyBank className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight ${
              isSurplus ? 'text-blue-700' : 'text-amber-700'
            }`}
          >
            {formatINR(netSavings)}
          </div>
          <div
            className={`flex items-center justify-between text-[11px] font-medium mt-2 pt-2 border-t ${
              isSurplus
                ? 'border-blue-200/60 text-blue-600'
                : 'border-amber-200/60 text-amber-700'
            }`}
          >
            <span>{isSurplus ? 'Surplus retained' : 'Deficit / Over budget'}</span>
            <span className="font-bold">{isSurplus ? `+${savingsRate}%` : `${savingsRate}%`}</span>
          </div>
        </div>
      </div>

      {/* Visual Cashflow Ratio Bar */}
      {totalIncome > 0 && (
        <div className="mb-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Cashflow Utilization
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-rose-600 font-semibold">{expenseRate}% Spent</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-600 font-semibold">{Math.max(0, 100 - expenseRate)}% Saved</span>
            </div>
          </div>

          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, expenseRate)}%` }}
              title={`Spent: ${formatINR(totalExpenseAndEmi)} (${expenseRate}%)`}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${Math.max(0, 100 - expenseRate)}%` }}
              title={`Saved: ${formatINR(Math.max(0, netSavings))} (${Math.max(0, 100 - expenseRate)}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
            <span>Avg Daily Spend: <strong>{formatINR(avgDailySpend)}/day</strong></span>
            <span>Total Inflow: <strong>{formatINR(totalIncome)}</strong></span>
          </div>
        </div>
      )}

      {/* Anson & Dona Breakdown Pill when in Family View */}
      {activeDashboard === 'Family' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Anson's contribution */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                A
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 leading-tight">Anson's Month</h4>
                <p className="text-[11px] text-slate-400">
                  Income: {formatINR(ansonIncome)} • Spent: {formatINR(ansonSpend)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-xs font-black block ${
                  ansonSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatINR(ansonSavings)}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Net Savings</span>
            </div>
          </div>

          {/* Dona's contribution */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">
                D
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 leading-tight">Dona's Month</h4>
                <p className="text-[11px] text-slate-400">
                  Income: {formatINR(donaIncome)} • Spent: {formatINR(donaSpend)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-xs font-black block ${
                  donaSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatINR(donaSavings)}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Net Savings</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
