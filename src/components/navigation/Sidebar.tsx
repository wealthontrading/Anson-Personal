import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Landmark,
  BarChart3,
  Settings,
  PlusCircle,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

export type NavTab = 'dashboard' | 'transactions' | 'accounts' | 'emis' | 'reports' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickAction: () => void;
  isSimpleMode: boolean;
  onToggleSimpleMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickAction,
  isSimpleMode,
  onToggleSimpleMode,
}) => {
  const { currentUser, currentSummary } = useFinance();

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions' as NavTab, label: 'Transactions', icon: Receipt },
    { id: 'accounts' as NavTab, label: 'Bank & Cash', icon: Wallet },
    { id: 'emis' as NavTab, label: 'Loans & EMIs', icon: Landmark },
    { id: 'reports' as NavTab, label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'settings' as NavTab, label: 'Settings & Security', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-65px)] p-4 shrink-0">
      
      {/* Quick Add Button */}
      <div className="mb-4">
        <button
          onClick={onOpenQuickAction}
          className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Record Transaction</span>
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quick Summary Card at bottom of sidebar */}
      <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
            <span>Liquid Balance</span>
            <span className="text-emerald-700 font-extrabold">Active</span>
          </div>
          <p className="text-base font-extrabold text-slate-900 tracking-tight">
            ₹{currentSummary.totalLiquidWealth.toLocaleString('en-IN')}
          </p>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
            <span>Logged in as <strong>{currentUser}</strong></span>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          </div>
        </div>

        <div className="text-center">
          <PWAInstallButton compact={false} />
        </div>
      </div>

    </aside>
  );
};
