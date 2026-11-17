import React from 'react';
import {
  Home,
  ReceiptText,
  Plus,
  Wallet,
  Menu,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickAction: () => void;
  onOpenMoreMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickAction,
  onOpenMoreMenu,
}) => {
  const isMoreActive = currentTab === 'emis' || currentTab === 'reports' || currentTab === 'settings';

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 pt-1.5 pb-safe"
    >
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        {/* Home */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition cursor-pointer ${
            currentTab === 'dashboard' ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Home className={`w-5 h-5 ${currentTab === 'dashboard' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-0.5 leading-none">Home</span>
        </button>

        {/* History */}
        <button
          type="button"
          onClick={() => onSelectTab('transactions')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition cursor-pointer ${
            currentTab === 'transactions' ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <ReceiptText className={`w-5 h-5 ${currentTab === 'transactions' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-0.5 leading-none">History</span>
        </button>

        {/* Prominent Center Thumb Add Button */}
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={onOpenQuickAction}
            aria-label="Add Transaction"
            className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-slate-800 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[2.5] text-emerald-400" />
          </button>
        </div>

        {/* Accounts (Bank & Cash) */}
        <button
          type="button"
          onClick={() => onSelectTab('accounts')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition cursor-pointer ${
            currentTab === 'accounts' ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Wallet className={`w-5 h-5 ${currentTab === 'accounts' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-0.5 leading-none">Accounts</span>
        </button>

        {/* More (Loans, Reports, Budgets, Settings) */}
        <button
          type="button"
          onClick={onOpenMoreMenu}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition cursor-pointer ${
            isMoreActive ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Menu className={`w-5 h-5 ${isMoreActive ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-0.5 leading-none">More</span>
        </button>
      </div>
    </nav>
  );
};
