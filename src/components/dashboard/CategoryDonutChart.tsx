import React from 'react';
import { Transaction } from '../../types/finance';
import { CATEGORY_DETAILS, formatINR, getCategoryColor } from '../../utils/formatters';
import { useFinance } from '../../context/FinanceContext';

interface CategoryDonutChartProps {
  transactions: Transaction[];
  selectedMonth: string;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  transactions,
  selectedMonth,
}) => {
  const { categoryColors } = useFinance();
  // Aggregate expenses for the selected month
  const categoryTotals: Record<string, number> = {};
  let totalExpenses = 0;

  transactions.forEach((tx) => {
    const isMatchingMonth =
      selectedMonth === 'all' ? true : tx.date.startsWith(selectedMonth);

    if (isMatchingMonth && (tx.type === 'expense' || tx.type === 'emi_payment')) {
      const catKey = tx.type === 'emi_payment' ? 'EMI Payments' : tx.category || 'other';
      categoryTotals[catKey] = (categoryTotals[catKey] || 0) + tx.amount;
      totalExpenses += tx.amount;
    }
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8); // Top 8 categories

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Expense Category Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribution of this month's outflows
            </p>
          </div>
          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
            {formatINR(totalExpenses)} Total
          </span>
        </div>

        {totalExpenses === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            No expenses recorded for this period yet.
          </div>
        ) : (
          <div className="space-y-3.5 mt-3">
            {sortedCategories.map(([cat, amount]) => {
              const percentage = Math.round((amount / totalExpenses) * 100);
              const color = getCategoryColor(cat, categoryColors);
              const details = CATEGORY_DETAILS[cat as keyof typeof CATEGORY_DETAILS];
              const label = cat === 'EMI Payments' ? 'Loan EMI Payments' : details?.label || cat;

              return (
                <div key={cat} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-semibold text-slate-800 truncate">{label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold text-slate-900">{formatINR(amount)}</span>
                      <span className="text-[11px] font-bold text-slate-400 w-8 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Highest expense: <strong>{sortedCategories[0]?.[0] || 'None'}</strong></span>
        <span>{sortedCategories.length} categories active</span>
      </div>
    </div>
  );
};
