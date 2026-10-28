import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { DashboardView, Person } from '../../types/finance';
import { formatMonthName } from '../../utils/formatters';
import { Users, User, Calendar, Lock, Plus, Shield, Smartphone, Zap } from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface DashboardHeaderProps {
  onOpenQuickAction: () => void;
  isSimpleMode: boolean;
  onToggleSimpleMode: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onOpenQuickAction,
  isSimpleMode,
  onToggleSimpleMode,
}) => {
  const {
    activeDashboard,
    setActiveDashboard,
    selectedMonth,
    setSelectedMonth,
    currentUser,
    switchUser,
    lockApp,
    users,
  } = useFinance();

  const months = ['2026-10', '2026-09', '2026-08', '2026-07', 'all'];

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 py-3.5 sm:py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand & Dashboard Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black tracking-tight text-xl shadow-xs">
              ₹
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                Anson & Dona
              </h1>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Family Expense Tracker
              </span>
            </div>
          </div>

          {/* Dashboard Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-xs">
            <button
              onClick={() => setActiveDashboard('Family')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeDashboard === 'Family'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Family</span>
            </button>

            <button
              onClick={() => setActiveDashboard('Anson')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeDashboard === 'Anson'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Anson</span>
            </button>

            <button
              onClick={() => setActiveDashboard('Dona')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeDashboard === 'Dona'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Dona</span>
            </button>
          </div>
        </div>

        {/* Right side controls: Month filter, User profile & action */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 justify-between md:justify-end">
          
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m === 'all' ? 'All Time' : formatMonthName(m)}
                </option>
              ))}
            </select>
          </div>

          {/* User Profile switcher & Lock */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl p-1">
            {(['Anson', 'Dona'] as Person[]).map((person) => {
              const isActive = currentUser === person;
              return (
                <button
                  key={person}
                  onClick={() => switchUser(person)}
                  className={`text-[11px] font-bold py-1 px-2.5 rounded-lg transition flex items-center gap-1 ${
                    isActive
                      ? person === 'Anson'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Logged in as ${person}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  {person}
                </button>
              );
            })}

            <button
              onClick={lockApp}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
              title="Lock with PIN"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* In-app Mobile PWA Install */}
          <PWAInstallButton compact={true} />

          {/* Primary Quick Action Button */}
          <button
            onClick={onOpenQuickAction}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Action</span>
          </button>
        </div>

      </div>
    </header>
  );
};
