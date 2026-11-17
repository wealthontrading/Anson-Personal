import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory, Transaction } from '../../types/finance';
import { CATEGORY_DETAILS, formatINR, getCategoryColor, getCurrentMonthStr } from '../../utils/formatters';
import { Target, Sliders, Plus, AlertTriangle } from 'lucide-react';

interface CategoryBudgetProgressCardProps {
  onOpenBudgetModal: () => void;
  transactions: Transaction[];
}

export const CategoryBudgetProgressCard: React.FC<CategoryBudgetProgressCardProps> = ({
  onOpenBudgetModal,
  transactions,
}) => {
  const { categoryBudgets, categoryColors, activeDashboard, selectedMonth } = useFinance();

  const targetMonth = selectedMonth === 'all' ? getCurrentMonthStr() : selectedMonth;

  const relevantBudgets = categoryBudgets.filter((b) => {
    const scope = b.scope || 'Family';
    if (activeDashboard === 'Family') return scope === 'Family';
    return scope === activeDashboard;
  });

  const currentExpenses = transactions.filter((tx) => {
    if (tx.type !== 'expense') return false;
    if (!tx.date.startsWith(targetMonth)) return false;
    if (activeDashboard === 'Anson' && tx.person !== 'Anson') return false;
    if (activeDashboard === 'Dona' && tx.person !== 'Dona') return false;
    return true;
  });

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
    let statusTextColor = 'text-emerald-700';

    if (percent > 100) {
      barColor = 'bg-rose-500';
      statusTextColor = 'text-rose-600';
    } else if (percent >= 85) {
      barColor = 'bg-amber-500';
      statusTextColor = 'text-amber-700';
    } else if (percent >= 70) {
      barColor = 'bg-blue-500';
      statusTextColor = 'text-blue-700';
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
      statusTextColor,
    };
  });

  budgetProgressItems.sort((a, b) => b.percent - a.percent);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Monthly Budgets
          </h3>
          <p className="text-xs text-slate-500">
            Spending limits for {activeDashboard}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenBudgetModal}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer shrink-0"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{relevantBudgets.length > 0 ? 'Edit Budgets' : 'Set Budgets'}</span>
        </button>
      </div>

      {relevantBudgets.length === 0 ? (
        <div className="py-6 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <Target className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700 mb-3">
            No spending limits set yet
          </p>
          <button
            type="button"
            onClick={onOpenBudgetModal}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Monthly Budget</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {budgetProgressItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(item.category, categoryColors) }}
                  />
                  <span className="text-xs font-bold text-slate-900 capitalize truncate">
                    {item.label}
                  </span>
                </div>

                <div className="text-right shrink-0 text-xs tabular-nums">
                  <span className="font-bold text-slate-900">{formatINR(item.spent)}</span>
                  <span className="text-slate-400"> / {formatINR(item.monthlyLimit)}</span>
                </div>
              </div>

              <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.barColor} rounded-full transition-all duration-300`}
                  style={{ width: `${Math.min(100, item.percent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] mt-1.5 tabular-nums">
                {item.isOver ? (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{formatINR(item.overAmount)} over limit</span>
                  </span>
                ) : (
                  <span className="text-slate-500">
                    {formatINR(item.remaining)} left
                  </span>
                )}
                <span className={`font-bold ${item.statusTextColor}`}>
                  {item.percent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
