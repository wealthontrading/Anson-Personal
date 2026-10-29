import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory } from '../../types/finance';
import { CATEGORY_DETAILS, formatINR, getCategoryColor, getCurrentMonthStr } from '../../utils/formatters';
import { SUGGESTED_BUDGET_TEMPLATES } from '../../data/seedData';
import {
  X,
  Target,
  Check,
  Trash2,
  Edit2,
  TrendingUp,
  AlertTriangle,
  Plus,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface BudgetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetManagementModal: React.FC<BudgetManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    categoryBudgets,
    setCategoryBudget,
    deleteCategoryBudget,
    customCategories,
    categoryColors,
    transactions,
    activeDashboard,
    selectedMonth,
  } = useFinance();

  const [selectedCategory, setSelectedCategory] = useState<string>('groceries');
  const [limitAmount, setLimitAmount] = useState<string>('15000');
  const [scope, setScope] = useState<'Family' | 'Anson' | 'Dona'>(() => {
    return activeDashboard === 'Family' ? 'Family' : activeDashboard;
  });
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  // List of all standard categories + custom expense categories
  const standardCategories: { id: string; label: string }[] = Object.entries(CATEGORY_DETAILS).map(
    ([id, details]) => ({
      id,
      label: details.label,
    })
  );

  const customExpenseCats = customCategories
    .filter((c) => c.type === 'expense')
    .map((c) => ({
      id: c.name.toLowerCase(),
      label: c.name,
    }));

  const allAvailableCategories = [...standardCategories, ...customExpenseCats];

  // Calculate current month's spending for comparison
  const targetMonth = selectedMonth === 'all' ? getCurrentMonthStr() : selectedMonth;
  const currentMonthExpenses = transactions.filter((tx) => {
    if (tx.type !== 'expense') return false;
    if (!tx.date.startsWith(targetMonth)) return false;
    if (scope === 'Anson' && tx.person !== 'Anson') return false;
    if (scope === 'Dona' && tx.person !== 'Dona') return false;
    return true;
  });

  const getCategorySpent = (cat: string) => {
    return currentMonthExpenses
      .filter((tx) => (tx.category || '').toLowerCase() === cat.toLowerCase())
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const numLimit = parseFloat(limitAmount);
    if (isNaN(numLimit) || numLimit <= 0) {
      setErrorMsg('Please enter a valid monthly limit greater than 0');
      return;
    }

    setCategoryBudget(selectedCategory, numLimit, scope);
    setSuccessMsg(`Budget for ${CATEGORY_DETAILS[selectedCategory as ExpenseCategory]?.label || selectedCategory} set to ${formatINR(numLimit)}`);
    setErrorMsg('');
    setEditingBudgetId(null);

    // Auto-clear message after 3 seconds
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  const handleEditClick = (cat: string, currentLimit: number, currentScope?: 'Family' | 'Anson' | 'Dona') => {
    setSelectedCategory(cat);
    setLimitAmount(String(currentLimit));
    if (currentScope) setScope(currentScope);
    setEditingBudgetId(cat);
    setErrorMsg('');
  };

  const handleApplyTemplate = (cat: string, defLimit: number) => {
    setSelectedCategory(cat);
    setLimitAmount(String(defLimit));
    setEditingBudgetId(null);
    setCategoryBudget(cat, defLimit, scope);
    setSuccessMsg(`Applied suggested budget of ${formatINR(defLimit)} for ${CATEGORY_DETAILS[cat as ExpenseCategory]?.label || cat}`);
    setTimeout(() => {
      setSuccessMsg('');
    }, 2500);
  };

  // Filter budgets matching currently selected scope
  const scopedBudgets = categoryBudgets.filter(
    (b) => (b.scope || 'Family') === scope
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12">
        <div
          className="w-full max-w-xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
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
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Monthly Expense Budgets</h3>
              <p className="text-xs text-slate-500">Set limits per category to keep monthly spending on track</p>
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

        {/* Feedback banners */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scope Selector: Family vs Anson vs Dona */}
        <div className="mb-5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 flex items-center">
          {(['Family', 'Anson', 'Dona'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setScope(s);
                setEditingBudgetId(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
                scope === s
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s === 'Family' ? 'Family Budget' : `${s}'s Budget`}
            </button>
          ))}
        </div>

        {/* Budget Setting Form */}
        <form onSubmit={handleSaveBudget} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>{editingBudgetId ? 'Update Category Limit' : 'Set Category Limit'}</span>
            </h4>
            {editingBudgetId && (
              <button
                type="button"
                onClick={() => {
                  setEditingBudgetId(null);
                  setLimitAmount('15000');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Select Category *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  // If category already has a budget, pre-populate limit
                  const existing = categoryBudgets.find(
                    (b) => b.category.toLowerCase() === e.target.value.toLowerCase() && (b.scope || 'Family') === scope
                  );
                  if (existing) {
                    setLimitAmount(String(existing.monthlyLimit));
                  }
                }}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {allAvailableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Monthly Limit Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Monthly Limit (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  required
                  placeholder="0"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-base font-extrabold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingBudgetId ? 'Save Updated Limit' : 'Save Category Budget'}</span>
            </button>
          </div>
        </form>

        {/* Quick Suggested Presets */}
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Budget Presets (1-Click Add)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_BUDGET_TEMPLATES.map((tmpl) => {
              const isAlreadySet = scopedBudgets.some(
                (b) => b.category.toLowerCase() === tmpl.category.toLowerCase()
              );
              return (
                <button
                  key={tmpl.category}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl.category, tmpl.defaultLimit)}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isAlreadySet
                      ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>{tmpl.label}:</span>
                  <span className="font-extrabold">₹{tmpl.defaultLimit.toLocaleString('en-IN')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Budgets List */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Active Category Budgets ({scopedBudgets.length})
            </h4>
            <span className="text-[11px] text-slate-400">
              Total Budget: {formatINR(scopedBudgets.reduce((acc, b) => acc + b.monthlyLimit, 0))}
            </span>
          </div>

          {scopedBudgets.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
              <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No category limits set for {scope}</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-0.5">
                Use the form above or click one of the quick presets to set your first category budget.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {scopedBudgets.map((b) => {
                const details = CATEGORY_DETAILS[b.category as ExpenseCategory];
                const label = details?.label || b.category;
                const spent = getCategorySpent(b.category);
                const percent = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
                const isOver = spent > b.monthlyLimit;

                let barColor = 'bg-emerald-500';
                if (percent >= 100) barColor = 'bg-rose-500';
                else if (percent >= 85) barColor = 'bg-amber-500';

                return (
                  <div
                    key={b.id}
                    className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: getCategoryColor(b.category, categoryColors) }}
                        />
                        <span className="text-xs font-extrabold text-slate-900 capitalize">{label}</span>
                        {isOver && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-700">
                            Exceeded
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-slate-900">
                            {formatINR(spent)}
                          </span>
                          <span className="text-[11px] text-slate-400"> / {formatINR(b.monthlyLimit)}</span>
                        </div>

                        {/* Edit and Delete Buttons */}
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                          <button
                            type="button"
                            onClick={() => handleEditClick(b.category, b.monthlyLimit, b.scope)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit budget limit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCategoryBudget(b.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete this budget"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all duration-300`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 mt-1">
                      <span>{percent}% spent</span>
                      <span>
                        {isOver
                          ? `${formatINR(spent - b.monthlyLimit)} over budget`
                          : `${formatINR(b.monthlyLimit - spent)} remaining`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => onClose()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
);
};
