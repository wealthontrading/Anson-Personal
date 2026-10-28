import React from 'react';
import { PlusCircle, Receipt, Building2, Landmark, X } from 'lucide-react';

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
      id: 'income' as const,
      title: 'Add Income',
      desc: 'Salary, freelance, bonus, or other earnings',
      iconText: '₹',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60',
      badgeBg: 'bg-emerald-600',
    },
    {
      id: 'expense' as const,
      title: 'Add Expense',
      desc: 'Food, groceries, bills, fuel, shopping & more',
      icon: Receipt,
      color: 'text-rose-600',
      bg: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200/60',
      badgeBg: 'bg-rose-600',
    },
    {
      id: 'transfer' as const,
      title: 'Transfer Money',
      desc: 'Bank to bank, ATM cash withdrawal, or cash to bank',
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200/60',
      badgeBg: 'bg-blue-600',
    },
    {
      id: 'emi' as const,
      title: 'Pay EMI',
      desc: 'Record home loan, car loan, or personal loan installment',
      icon: Landmark,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200/60',
      badgeBg: 'bg-indigo-600',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
      <div 
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Create New Record
            </h3>
            <p className="text-xs text-slate-500">Choose a financial transaction type</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  onSelectAction(act.id);
                }}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between group active:scale-[0.98] cursor-pointer ${act.bg}`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className={`w-10 h-10 rounded-xl ${act.badgeBg} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
                    {act.iconText ? (
                      <span className="font-black text-xl text-white">{act.iconText}</span>
                    ) : (
                      Icon && <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Quick
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-950">
                    {act.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {act.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
