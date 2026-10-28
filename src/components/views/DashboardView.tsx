import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { IncomeExpenseChart } from '../dashboard/IncomeExpenseChart';
import { CategoryDonutChart } from '../dashboard/CategoryDonutChart';
import { CategoryBudgetProgressCard } from '../dashboard/CategoryBudgetProgressCard';
import {
  formatDateDDMMYYYY,
  formatINR,
  CATEGORY_DETAILS,
  INCOME_SOURCE_DETAILS,
} from '../../utils/formatters';
import {
  Coins,
  Receipt,
  IndianRupee,
  Building2,
  Wallet,
  PiggyBank,
  Landmark,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  PlusCircle,
  Plus,
  Target,
} from 'lucide-react';
import { Transaction } from '../../types/finance';

interface DashboardViewProps {
  onOpenQuickAction: () => void;
  onOpenActionType: (action: 'income' | 'expense' | 'transfer' | 'emi') => void;
  onOpenBudgetModal: () => void;
  onSelectTab: (tab: any) => void;
  onViewReceipt: (imgUrl: string, title: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenQuickAction,
  onOpenActionType,
  onOpenBudgetModal,
  onSelectTab,
  onViewReceipt,
}) => {
  const {
    activeDashboard,
    setActiveDashboard,
    currentSummary,
    familySummary,
    ansonSummary,
    donaSummary,
    transactions,
    selectedMonth,
    loans,
    bankAccounts,
    cashWallets,
  } = useFinance();

  // Filter transactions for recent activity
  const relevantTransactions = transactions.filter((tx) => {
    if (activeDashboard === 'Anson') return tx.person === 'Anson';
    if (activeDashboard === 'Dona') return tx.person === 'Dona';
    return true; // Family includes all
  });

  const recentTransactions = relevantTransactions.slice(0, 6);

  // Upcoming EMIs check
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const upcomingEmis = loans
    .filter((l) => {
      if (l.status === 'closed') return false;
      if (activeDashboard === 'Anson' && l.owner !== 'Anson') return false;
      if (activeDashboard === 'Dona' && l.owner !== 'Dona') return false;
      return true;
    })
    .map((l) => {
      // Check if already paid this month
      const isPaidThisMonth = transactions.some(
        (tx) => tx.type === 'emi_payment' && tx.loanId === l.id && tx.date.startsWith(currentMonthYear)
      );
      const isOverdue = !isPaidThisMonth && currentDay > l.emiDueDay;
      const isDueSoon = !isPaidThisMonth && l.emiDueDay >= currentDay && l.emiDueDay - currentDay <= 7;
      return {
        ...l,
        isPaidThisMonth,
        isOverdue,
        isDueSoon,
        daysUntilDue: l.emiDueDay - currentDay,
      };
    });

  const getSubtitle = () => {
    if (activeDashboard === 'Anson') {
      return "Anson's personal cash flows, salary, EMIs, and savings";
    }
    if (activeDashboard === 'Dona') {
      return "Dona's personal cash flows, salary, EMIs, and savings";
    }
    return 'Combined financial health and household cash flows';
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                activeDashboard === 'Anson'
                  ? 'bg-blue-600'
                  : activeDashboard === 'Dona'
                  ? 'bg-emerald-600'
                  : 'bg-slate-900'
              }`}
            />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {activeDashboard === 'Family' ? 'Family Financial Overview' : `${activeDashboard}'s Personal Dashboard`}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {getSubtitle()}
          </p>
        </div>

        {/* Quick Action Shortcut Pills without arrows */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenActionType('income')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Income</span>
          </button>
          <button
            onClick={() => onOpenActionType('expense')}
            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-rose-600" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={() => onOpenActionType('transfer')}
            className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Transfer</span>
          </button>
          <button
            onClick={onOpenBudgetModal}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span>Set Budgets</span>
          </button>
        </div>
      </div>

      {/* Upcoming EMI Notification Banner if any */}
      {upcomingEmis.some((e) => !e.isPaidThisMonth) && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-indigo-950">
                  Upcoming Loan EMI Installment
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-200 text-indigo-800">
                  Due this month
                </span>
              </div>
              <p className="text-xs text-indigo-800 mt-0.5">
                {upcomingEmis
                  .filter((e) => !e.isPaidThisMonth)
                  .map((e) => `${e.name} (${formatINR(e.monthlyEmi)} on ${e.emiDueDay}th)`)
                  .join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenActionType('emi')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition self-start sm:self-auto shrink-0"
          >
            Pay EMI Now
          </button>
        </div>
      )}

      {/* Primary KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Income */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Income
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">
              {formatINR(currentSummary.totalIncome)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Monthly inflow
            </p>
          </div>
        </div>

        {/* Total Expenses / Outflows */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Expenses
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-rose-600 tracking-tight">
              {formatINR(currentSummary.totalExpenses)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Incl. EMI & bills
            </p>
          </div>
        </div>

        {/* Monthly Savings & % */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Net Savings
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className={`text-lg sm:text-xl font-black tracking-tight ${
              currentSummary.netSavings >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}>
              {formatINR(currentSummary.netSavings)}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                {currentSummary.savingsRate}% saved
              </span>
            </div>
          </div>
        </div>

        {/* Bank Account Balances */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Bank Balance
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-blue-600 tracking-tight">
              {formatINR(currentSummary.bankBalance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              In savings & salary accounts
            </p>
          </div>
        </div>

        {/* Cash in Hand */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Cash in Hand
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-teal-700 tracking-tight">
              {formatINR(currentSummary.cashInHand)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Physical wallet cash
            </p>
          </div>
        </div>

        {/* Outstanding Loan Principal */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Outstanding EMI
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-indigo-700 tracking-tight">
              {formatINR(currentSummary.totalOutstandingLoans)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {formatINR(currentSummary.monthlyEmiCommitment)}/mo commitment
            </p>
          </div>
        </div>

      </div>

      {/* Monthly Category Budgets & Spending Limits Progress */}
      <CategoryBudgetProgressCard
        onOpenBudgetModal={onOpenBudgetModal}
        transactions={relevantTransactions}
      />

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncomeExpenseChart
          transactions={relevantTransactions}
          currentMonth={selectedMonth}
        />
        <CategoryDonutChart
          transactions={relevantTransactions}
          selectedMonth={selectedMonth}
        />
      </div>

      {/* Combined Financial Summary of Anson and Dona (shown prominently on Family dashboard) */}
      {activeDashboard === 'Family' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Anson & Dona Financial Contribution Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Head-to-head comparison of earnings, spending, and liquid assets
              </p>
            </div>
            <button
              onClick={() => onSelectTab('reports')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Anson Column */}
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <h4 className="text-sm font-bold text-slate-900">Anson</h4>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                  {ansonSummary.totalIncome > 0 && familySummary.totalIncome > 0
                    ? `${Math.round((ansonSummary.totalIncome / familySummary.totalIncome) * 100)}% of Family Income`
                    : 'Partner'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-blue-50">
                  <span className="text-slate-600">Monthly Income:</span>
                  <strong className="text-emerald-700">{formatINR(ansonSummary.totalIncome)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-blue-50">
                  <span className="text-slate-600">Monthly Expenses & EMI:</span>
                  <strong className="text-rose-700">{formatINR(ansonSummary.totalExpenses)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-blue-50">
                  <span className="text-slate-600">Bank & Cash Liquidity:</span>
                  <strong className="text-blue-700">{formatINR(ansonSummary.totalLiquidWealth)}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Outstanding Loans:</span>
                  <strong className="text-indigo-700">{formatINR(ansonSummary.totalOutstandingLoans)}</strong>
                </div>
              </div>

              <button
                onClick={() => setActiveDashboard('Anson')}
                className="mt-4 w-full py-2 bg-white hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition"
              >
                Switch to Anson's Dashboard
              </button>
            </div>

            {/* Dona Column */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">Dona</h4>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                  {donaSummary.totalIncome > 0 && familySummary.totalIncome > 0
                    ? `${Math.round((donaSummary.totalIncome / familySummary.totalIncome) * 100)}% of Family Income`
                    : 'Partner'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-emerald-50">
                  <span className="text-slate-600">Monthly Income:</span>
                  <strong className="text-emerald-700">{formatINR(donaSummary.totalIncome)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-50">
                  <span className="text-slate-600">Monthly Expenses & EMI:</span>
                  <strong className="text-rose-700">{formatINR(donaSummary.totalExpenses)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-50">
                  <span className="text-slate-600">Bank & Cash Liquidity:</span>
                  <strong className="text-blue-700">{formatINR(donaSummary.totalLiquidWealth)}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Outstanding Loans:</span>
                  <strong className="text-indigo-700">{formatINR(donaSummary.totalOutstandingLoans)}</strong>
                </div>
              </div>

              <button
                onClick={() => setActiveDashboard('Dona')}
                className="mt-4 w-full py-2 bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition"
              >
                Switch to Dona's Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest financial activity for {activeDashboard}
            </p>
          </div>
          <button
            onClick={() => onSelectTab('transactions')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All ({relevantTransactions.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
              <IndianRupee className="w-5 h-5 stroke-[2]" />
            </div>
            <p className="font-bold text-slate-800 text-sm">No transactions yet</p>
            <p className="text-slate-400 mt-1">Ready for your real data. Tap "Add Income" or "Add Expense" above to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isEmi = tx.type === 'emi_payment';
              const isTransfer = tx.type === 'transfer';

              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-600'
                          : isEmi
                          ? 'bg-indigo-50 text-indigo-600'
                          : isTransfer
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {isIncome ? (
                        <IndianRupee className="w-4 h-4 stroke-[2.5]" />
                      ) : isTransfer ? (
                        <Building2 className="w-4 h-4" />
                      ) : isEmi ? (
                        <Landmark className="w-4 h-4" />
                      ) : (
                        <IndianRupee className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {tx.title}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            tx.person === 'Anson'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {tx.person}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDateDDMMYYYY(tx.date)} • {tx.paymentMethod === 'cash' ? 'Cash' : 'Bank'}
                        {tx.notes ? ` • ${tx.notes}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs sm:text-sm font-extrabold ${
                        isIncome
                          ? 'text-emerald-600'
                          : isTransfer
                          ? 'text-blue-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatINR(tx.amount)}
                    </p>
                    {tx.receiptImage && (
                      <button
                        onClick={() => onViewReceipt(tx.receiptImage!, tx.title)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Receipt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
