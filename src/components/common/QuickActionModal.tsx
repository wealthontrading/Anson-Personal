import React from 'react';
import { Receipt, Building2, Landmark, X, ArrowDownLeft } from 'lucide-react';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: 'income' | 'expense' | 'transfer' | 'emi') => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'expense' as const,
      title: 'Add Expense',
      desc: 'Food, groceries, bills, fuel & shopping',
      icon: Receipt,
      bg: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200/70',
      iconBg: 'bg-rose-600 text-white',
    },
    {
      id: 'income' as const,
      title: 'Add Income',
      desc: 'Salary, freelance, bonus & earnings',
      icon: ArrowDownLeft,
      bg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/70',
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      id: 'transfer' as const,
      title: 'Transfer Money',
      desc: 'Bank transfer, ATM cash or deposit',
      icon: Building2,
      bg: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200/70',
      iconBg: 'bg-blue-600 text-white',
    },
    {
      id: 'emi' as const,
      title: 'Pay Loan EMI',
      desc: 'Home, car or personal loan payment',
      icon: Landmark,
      bg: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200/70',
      iconBg: 'bg-indigo-600 text-white',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-safe shadow-2xl border border-slate-200/80 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile grab handle */}
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Quick Add
              </h3>
              <p className="text-xs text-slate-500">What would you like to record?</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 mb-4">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => onSelectAction(act.id)}
                  className={`w-full min-h-[68px] p-3.5 rounded-2xl border text-left transition flex items-center gap-3.5 active:scale-[0.98] cursor-pointer ${act.bg}`}
                >
                  <div className={`w-11 h-11 rounded-xl ${act.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900">{act.title}</h4>
                    <p className="text-xs text-slate-600 truncate">{act.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
