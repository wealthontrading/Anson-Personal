import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { NavTab } from '../navigation/Sidebar';
import { Lock, Plus, Settings, LogOut, CalendarDays, Landmark } from 'lucide-react';

interface DashboardHeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickAction: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickAction,
}) => {
  const { currentUser, logoutUser, lockApp } = useFinance();

  const navItems: { id: NavTab; label: string }[] = [
    { id: 'dashboard', label: 'Home' },
    { id: 'transactions', label: 'History' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'savings', label: 'Savings' },
    { id: 'emis', label: 'Loans' },
    { id: 'insurance', label: 'Health' },
    { id: 'borrow_lend', label: 'Borrow/Lend' },
    { id: 'notes', label: 'Notes' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 h-14 sm:h-16 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-3 lg:gap-6">
        {/* Zone 1: Clean single-line brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer text-left"
        >
          <span className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-lg">
            ₹
          </span>
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
            Anson &amp; Dona
          </span>
        </button>

        {/* Zone 2: Clean desktop single-line navigation links */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-4 text-xs lg:text-sm font-semibold overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: User indicator + quick actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={logoutUser}
            title={`Signed in as ${currentUser} — tap to switch profile`}
            className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            <span
              className={`w-5 h-5 rounded-lg text-white text-[11px] font-extrabold flex items-center justify-center ${
                currentUser === 'Anson' ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
            >
              {currentUser[0]}
            </span>
            <span>{currentUser}</span>
            <LogOut className="w-3 h-3 text-slate-400 hidden sm:inline" />
          </button>

          <button
            type="button"
            onClick={lockApp}
            aria-label="Lock with PIN"
            title="Lock screen"
            className="min-w-[40px] min-h-[40px] rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <Lock className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('emis')}
            aria-label="Loans & EMIs"
            title="Loans & EMIs"
            className={`md:hidden min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center transition cursor-pointer ${
              currentTab === 'emis'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('notes')}
            aria-label="Daily Notes & Calendar"
            title="Daily Notes & Calendar"
            className={`md:hidden min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center transition cursor-pointer ${
              currentTab === 'notes'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            aria-label="Settings"
            title="Settings"
            className="md:hidden min-w-[38px] min-h-[38px] rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenQuickAction}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>
    </header>
  );
};
