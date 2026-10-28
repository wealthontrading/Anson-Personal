import React from 'react';
import {
  LayoutDashboard,
  IndianRupee,
  Plus,
  Landmark,
  BarChart3,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickAction: () => void;
  isSimpleMode?: boolean;
  onToggleSimpleMode?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickAction,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 pb-safe shadow-lg">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        
        {/* Home / Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'dashboard' ? 'text-slate-900 font-extrabold' : 'text-slate-400 font-medium'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${currentTab === 'dashboard' ? 'text-slate-900 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Transactions */}
        <button
          onClick={() => onSelectTab('transactions')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'transactions' ? 'text-slate-900 font-extrabold' : 'text-slate-400 font-medium'
          }`}
        >
          <IndianRupee className={`w-5 h-5 ${currentTab === 'transactions' ? 'text-slate-900 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Transactions</span>
        </button>

        {/* Center Prominent Add (+) Button */}
        <div className="relative -top-3.5 flex flex-col items-center">
          <button
            onClick={onOpenQuickAction}
            className="w-13 h-13 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all border-4 border-white cursor-pointer"
            aria-label="Add Transaction"
          >
            <Plus className="w-6 h-6 stroke-[2.5] text-emerald-400" />
          </button>
          <span className="text-[10px] font-bold text-slate-700 mt-0.5">Add</span>
        </div>

        {/* EMIs */}
        <button
          onClick={() => onSelectTab('emis')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'emis' ? 'text-slate-900 font-extrabold' : 'text-slate-400 font-medium'
          }`}
        >
          <Landmark className={`w-5 h-5 ${currentTab === 'emis' ? 'text-slate-900 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">EMIs</span>
        </button>

        {/* Reports */}
        <button
          onClick={() => onSelectTab('reports')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            currentTab === 'reports' ? 'text-slate-900 font-extrabold' : 'text-slate-400 font-medium'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${currentTab === 'reports' ? 'text-slate-900 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Reports</span>
        </button>

      </div>
    </div>
  );
};
