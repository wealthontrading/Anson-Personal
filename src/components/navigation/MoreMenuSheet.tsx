import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { NavTab } from './Sidebar';
import { Landmark, BarChart3, Target, Settings, Lock, LogOut, X, ChevronRight, CalendarDays } from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface MoreMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
  onOpenBudgetModal: () => void;
}

export const MoreMenuSheet: React.FC<MoreMenuSheetProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenBudgetModal,
}) => {
  const { currentUser, logoutUser, lockApp } = useFinance();

  if (!isOpen) return null;

  const menuItems = [
    {
      label: 'Daily Notes & Calendar',
      desc: 'Daily matters, journey diary, birthdays & wedding reminders',
      icon: CalendarDays,
      color: 'bg-rose-50 text-rose-600',
      onClick: () => {
        onClose();
        onSelectTab('notes');
      },
    },
    {
      label: 'Loans & EMIs',
      desc: 'Track loans and pay monthly EMIs',
      icon: Landmark,
      color: 'bg-indigo-50 text-indigo-600',
      onClick: () => {
        onClose();
        onSelectTab('emis');
      },
    },
    {
      label: 'Reports & Export',
      desc: 'Monthly trends, partner split & CSV download',
      icon: BarChart3,
      color: 'bg-blue-50 text-blue-600',
      onClick: () => {
        onClose();
        onSelectTab('reports');
      },
    },
    {
      label: 'Monthly Budgets',
      desc: 'Set category spending limits',
      icon: Target,
      color: 'bg-emerald-50 text-emerald-600',
      onClick: () => {
        onClose();
        onOpenBudgetModal();
      },
    },
    {
      label: 'Settings & Passwords',
      desc: 'Change 4-digit PIN, category colors & backup',
      icon: Settings,
      color: 'bg-slate-100 text-slate-700',
      onClick: () => {
        onClose();
        onSelectTab('settings');
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-safe shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">More Options</h3>
            <p className="text-xs text-slate-500">Signed in as {currentUser}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="w-full min-h-[56px] px-3 py-2.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                    <span className="block text-xs text-slate-500">{item.desc}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              lockApp();
            }}
            className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Lock className="w-4 h-4 text-slate-600" />
            <span>Lock Screen</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              logoutUser();
            }}
            className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-600" />
            <span>Switch User</span>
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <PWAInstallButton compact={false} />
        </div>
      </div>
    </div>
  );
};
