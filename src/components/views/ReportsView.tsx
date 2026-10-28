import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatINR,
  formatDateDDMMYYYY,
  CATEGORY_DETAILS,
  INCOME_SOURCE_DETAILS,
  formatMonthName,
} from '../../utils/formatters';
import {
  BarChart3,
  Download,
  Calendar,
  PiggyBank,
  PieChart,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    transactions,
    bankAccounts,
    cashWallets,
    loans,
    familySummary,
    ansonSummary,
    donaSummary,
    exportTransactionsCSV,
    exportBackupJSON,
  } = useFinance();

  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Calculate Anson vs Dona ratios
  const totalFamilyIncome = familySummary.totalIncome;
  const ansonIncomePct =
    totalFamilyIncome > 0
      ? Math.round((ansonSummary.totalIncome / totalFamilyIncome) * 100)
      : 0;
  const donaIncomePct =
    totalFamilyIncome > 0
      ? Math.round((donaSummary.totalIncome / totalFamilyIncome) * 100)
      : 0;

  const totalFamilyExpenses = familySummary.totalExpenses;
  const ansonExpensePct =
    totalFamilyExpenses > 0
      ? Math.round((ansonSummary.totalExpenses / totalFamilyExpenses) * 100)
      : 0;
  const donaExpensePct =
    totalFamilyExpenses > 0
      ? Math.round((donaSummary.totalExpenses / totalFamilyExpenses) * 100)
      : 0;

  // Group transactions by month for trend analysis
  const monthlyStats: Record<string, { income: number; expense: number; emi: number }> = {};
  transactions.forEach((tx) => {
    const m = tx.date.substring(0, 7); // "YYYY-MM"
    if (!monthlyStats[m]) {
      monthlyStats[m] = { income: 0, expense: 0, emi: 0 };
    }
    if (tx.type === 'income') {
      monthlyStats[m].income += tx.amount;
    } else if (tx.type === 'expense') {
      monthlyStats[m].expense += tx.amount;
    } else if (tx.type === 'emi_payment') {
      monthlyStats[m].emi += tx.amount;
    }
  });

  const sortedMonths = Object.keys(monthlyStats).sort().reverse();

  // Print/Download Report Trigger
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Financial Reports & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Deep dive into Anson and Dona's joint savings, cash outflows, and net worth
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTransactionsCSV()}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Transactions (.CSV)</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Head-to-Head Comparison Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Anson vs. Dona Contribution & Spending Split
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">Current Month</span>
        </div>

        {/* Income Split Bar */}
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1 text-blue-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              Anson: {formatINR(ansonSummary.totalIncome)} ({ansonIncomePct}%)
            </span>
            <span className="flex items-center gap-1 text-emerald-700">
              Dona: {formatINR(donaSummary.totalIncome)} ({donaIncomePct}%)
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-500"
              style={{ width: `${ansonIncomePct}%` }}
              title={`Anson: ${ansonIncomePct}%`}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${donaIncomePct}%` }}
              title={`Dona: ${donaIncomePct}%`}
            />
          </div>
        </div>

        {/* Expenses Split Bar */}
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1 text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              Anson Spending: {formatINR(ansonSummary.totalExpenses)} ({ansonExpensePct}%)
            </span>
            <span className="flex items-center gap-1 text-rose-700">
              Dona Spending: {formatINR(donaSummary.totalExpenses)} ({donaExpensePct}%)
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden">
            <div
              className="bg-slate-800 h-full transition-all duration-500"
              style={{ width: `${ansonExpensePct}%` }}
              title={`Anson: ${ansonExpensePct}%`}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${donaExpensePct}%` }}
              title={`Dona: ${donaExpensePct}%`}
            />
          </div>
        </div>
      </div>

      {/* Month-over-Month Savings Trend Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Historical Month-by-Month Financial Summary
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3 text-right">Income (₹)</th>
                <th className="py-2.5 px-3 text-right">Expenses (₹)</th>
                <th className="py-2.5 px-3 text-right">EMI Paid (₹)</th>
                <th className="py-2.5 px-3 text-right">Total Outflow (₹)</th>
                <th className="py-2.5 px-3 text-right">Net Savings (₹)</th>
                <th className="py-2.5 px-3 text-right">Savings Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {sortedMonths.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-medium">
                    No transactions recorded yet. Add your income, daily expenses, or loan EMIs to view historical month-by-month reports.
                  </td>
                </tr>
              ) : (
                sortedMonths.map((m) => {
                  const item = monthlyStats[m];
                  const totalOutflow = item.expense + item.emi;
                  const netSavings = item.income - totalOutflow;
                  const rate = item.income > 0 ? Math.round((netSavings / item.income) * 100) : 0;

                  return (
                    <tr key={m} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {formatMonthName(m)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-black">
                        {formatINR(item.income)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatINR(item.expense)}
                      </td>
                      <td className="py-3 px-3 text-right text-indigo-600">
                        {formatINR(item.emi)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-black">
                        {formatINR(totalOutflow)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-black ${
                          netSavings >= 0 ? 'text-slate-900' : 'text-rose-600'
                        }`}
                      >
                        {formatINR(netSavings)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rate >= 30
                              ? 'bg-emerald-50 text-emerald-700'
                              : rate > 0
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset and Debt Balance Sheets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Liquid Assets Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h4 className="text-sm font-bold text-slate-900">Liquid Assets Summary</h4>
            <span className="text-xs font-black text-emerald-600">
              {formatINR(familySummary.totalLiquidWealth)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span>All Bank Accounts ({bankAccounts.length})</span>
              <strong className="text-slate-900">{formatINR(familySummary.bankBalance)}</strong>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Cash in Hand (Anson & Dona)</span>
              <strong className="text-slate-900">{formatINR(familySummary.cashInHand)}</strong>
            </div>
          </div>
        </div>

        {/* Debt & Liabilities Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h4 className="text-sm font-bold text-slate-900">Total Liabilities Summary</h4>
            <span className="text-xs font-black text-rose-600">
              {formatINR(familySummary.totalOutstandingLoans)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {loans.map((l) => (
              <div key={l.id} className="flex justify-between py-1 text-slate-600">
                <span>{l.name} ({l.owner})</span>
                <strong className="text-slate-900">{formatINR(l.outstandingPrincipal)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
