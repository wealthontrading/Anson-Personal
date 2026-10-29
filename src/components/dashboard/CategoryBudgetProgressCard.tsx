import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory, Transaction } from '../../types/finance';
import { CATEGORY_DETAILS, formatINR, getCategoryColor, getCurrentMonthStr } from '../../utils/formatters';
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Plus,
} from 'lucide-react';

interface CategoryBudgetProgressCardProps {
  onOpenBudgetModal: () => void;
  transactions: Transaction[];
}

export const CategoryBudgetProgressCard: React.FC<CategoryBudgetProgressCardProps> = ({
  onOpenBudgetModal,
  transactions,
}) => {
  const { categoryBudgets, categoryColors, activeDashboard, selectedMonth } = useFinance();

  // Target month filtering
  const targetMonth = selectedMonth === 'all' ? getCurrentMonthStr() : selectedMonth;

  // Filter budgets for active dashboard scope (Family vs Anson vs Dona)
  const relevantBudgets = categoryBudgets.filter((b) => {
    const scope = b.scope || 'Family';
    if (activeDashboard === 'Family') return scope === 'Family';
    return scope === activeDashboard;
  });

  // Calculate expenses for the target month & dashboard
  const currentExpenses = transactions.filter((tx) => {
    if (tx.type !== 'expense') return false;
    if (!tx.date.startsWith(targetMonth)) return false;
    if (activeDashboard === 'Anson' && tx.person !== 'Anson') return false;
    if (activeDashboard === 'Dona' && tx.person !== 'Dona') return false;
    return true;
  });

  // Total budget metrics
  const totalBudgetedAmount = relevantBudgets.reduce((acc, b) => acc + b.monthlyLimit, 0);

  const budgetProgressItems = relevantBudgets.map((b) => {
    const details = CATEGORY_DETAILS[b.category as ExpenseCategory];
    const label = details?.label || b.category;
    const spent = currentExpenses
      .filter((tx) => (tx.category || '').toLowerCase() === b.category.toLowerCase())
      .reduce((sum, tx) => sum + tx.amount, 0);

    const percent = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
    const remaining = Math.max(0, b.monthlyLimit - spent);
    const isOver = spent > b.monthlyLimit;
    const overAmount = isOver ? spent - b.monthlyLimit : 0;

    let barColor = 'bg-emerald-500';
    let textColor = 'text-emerald-700';
    let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';

    if (percent > 100) {
      barColor = 'bg-rose-500';
      textColor = 'text-rose-700';
      badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (percent >= 85) {
      barColor = 'bg-amber-500';
      textColor = 'text-amber-700';
      badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (percent >= 70) {
      barColor = 'bg-blue-500';
      textColor = 'text-blue-700';
      badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
    }

    return {
      ...b,
      label,
      spent,
      percent,
      remaining,
      isOver,
      overAmount,
      barColor,
      textColor,
      badgeBg,
    };
  });

  // Sort items: over-budget first, then highest percentage
  budgetProgressItems.sort((a, b) => b.percent - a.percent);

  const totalSpentOnBudgeted = budgetProgressItems.reduce((acc, b) => acc + b.spent, 0);
  const overallPercent = totalBudgetedAmount > 0 ? Math.round((totalSpentOnBudgeted / totalBudgetedAmount) * 100) : 0;
  const overBudgetCount = budgetProgressItems.filter((b) => b.isOver).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs transition">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Monthly Category Budgets & Spending Limits
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of current month spending against set category limits ({activeDashboard})
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenBudgetModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>{relevantBudgets.length > 0 ? 'Manage Budgets' : '+ Set Budgets'}</span>
        </button>
      </div>

      {relevantBudgets.length === 0 ? (
        /* Empty State */
        <div className="p-7 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <Target className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">
            No Category Budgets Configured Yet
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 leading-relaxed">
            Set monthly spending caps for groceries, dining, fuel, utilities, and shopping to track how close you are to reaching those limits.
          </p>
          <button
            type="button"
            onClick={onOpenBudgetModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Set Monthly Category Budgets</span>
          </button>
        </div>
      ) : (
        /* Progress Bars List */
        <div className="space-y-4">
          {/* Summary Overview Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Budgeted
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {formatINR(totalBudgetedAmount)}
                </span>
              </div>
              <div className="w-px h-7 bg-slate-200" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Spent So Far
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {formatINR(totalSpentOnBudgeted)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {overBudgetCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{overBudgetCount} {overBudgetCount === 1 ? 'category' : 'categories'} exceeded</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>All categories within budget ({overallPercent}% used)</span>
                </span>
              )}
            </div>
          </div>

          {/* Individual Category Progress Bars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {budgetProgressItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition-all"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                      style={{ backgroundColor: getCategoryColor(item.category, categoryColors) }}
                    />
                    <span className="text-xs font-extrabold text-slate-900 capitalize">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeBg}`}
                    >
                      {item.percent}%
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900">
                      {formatINR(item.spent)}
                    </span>
                    <span className="text-[11px] text-slate-400"> / {formatINR(item.monthlyLimit)}</span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full ${item.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, item.percent)}%` }}
                  />
                </div>

                {/* Footer status text */}
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mt-1.5">
                  <span>
                    {item.isOver ? (
                      <strong className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 inline" />
                        {formatINR(item.overAmount)} over budget limit
                      </strong>
                    ) : (
                      <span className="text-slate-600">
                        {formatINR(item.remaining)} remaining
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.percent < 100 ? `${100 - item.percent}% room left` : 'Limit reached'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
