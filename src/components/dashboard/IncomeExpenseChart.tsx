import React, { useState } from 'react';
import { Transaction } from '../../types/finance';
import { formatINR, formatMonthName } from '../../utils/formatters';

interface IncomeExpenseChartProps {
  transactions: Transaction[];
  currentMonth: string;
}

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({
  transactions,
  currentMonth,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Generate data for the last 5 months leading up to currentMonth
  // Current month example: "2026-10"
  const getRecentMonths = () => {
    const list: string[] = [];
    const [currYear, currMonth] = (currentMonth === 'all' ? '2026-10' : currentMonth)
      .split('-')
      .map(Number);
    for (let i = 4; i >= 0; i--) {
      const d = new Date(currYear, currMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      list.push(`${y}-${m}`);
    }
    return list;
  };

  const months = getRecentMonths();

  const data = months.map((m) => {
    let income = 0;
    let expense = 0;

    transactions.forEach((tx) => {
      if (tx.date.startsWith(m)) {
        if (tx.type === 'income') {
          income += tx.amount;
        } else if (tx.type === 'expense' || tx.type === 'emi_payment') {
          expense += tx.amount;
        }
      }
    });

    const savings = income - expense;
    return {
      monthStr: m,
      monthLabel: formatMonthName(m),
      income,
      expense,
      savings,
    };
  });

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    100000
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Income vs. Outflow Trend
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monthly comparison of earnings vs. expenses & EMIs
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Income</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span>Outflow</span>
          </div>
        </div>
      </div>

      {/* SVG / Bar Chart Container */}
      <div className="h-56 w-full flex items-end justify-between gap-2 sm:gap-6 pt-6 pb-2 px-1">
        {data.map((item, idx) => {
          const incHeight = (item.income / maxVal) * 160;
          const expHeight = (item.expense / maxVal) * 160;
          const isSelected = item.monthStr === currentMonth;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={item.monthStr}
              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-14 z-20 bg-slate-900 text-white text-[11px] font-medium py-1.5 px-3 rounded-xl shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95">
                  <p className="font-bold border-b border-slate-700 pb-0.5 mb-1 text-slate-200">
                    {item.monthLabel}
                  </p>
                  <p className="text-emerald-400">Income: {formatINR(item.income)}</p>
                  <p className="text-rose-400">Outflow: {formatINR(item.expense)}</p>
                  <p className="text-blue-300 font-semibold">
                    Savings: {formatINR(item.savings)}
                  </p>
                </div>
              )}

              {/* Bars side by side */}
              <div className="w-full flex items-end justify-center gap-1.5 sm:gap-2 h-[165px]">
                {/* Income Bar */}
                <div
                  style={{ height: `${Math.max(incHeight, 4)}px` }}
                  className={`w-3 sm:w-5 rounded-t-lg transition-all duration-300 ${
                    isSelected ? 'bg-emerald-600 shadow-sm' : 'bg-emerald-400/80 hover:bg-emerald-500'
                  }`}
                />
                {/* Outflow Bar */}
                <div
                  style={{ height: `${Math.max(expHeight, 4)}px` }}
                  className={`w-3 sm:w-5 rounded-t-lg transition-all duration-300 ${
                    isSelected ? 'bg-rose-600 shadow-sm' : 'bg-rose-400/80 hover:bg-rose-500'
                  }`}
                />
              </div>

              {/* Month Label */}
              <div
                className={`mt-2.5 text-[11px] font-semibold transition ${
                  isSelected ? 'text-slate-900 font-extrabold' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                {item.monthLabel.split(' ')[0]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
