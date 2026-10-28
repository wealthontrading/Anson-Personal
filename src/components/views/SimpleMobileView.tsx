import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory, PaymentMethod, Person, Transaction } from '../../types/finance';
import { formatINR, formatDateDDMMYYYY, getTodayISO, CATEGORY_DETAILS } from '../../utils/formatters';
import {
  Zap,
  ShoppingBag,
  Utensils,
  Fuel,
  ShoppingCart,
  Zap as ZapIcon,
  HeartPulse,
  Film,
  MoreHorizontal,
  Wallet,
  Building2,
  Check,
  Trash2,
  Coins,
  Landmark,
  Smartphone,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface SimpleMobileViewProps {
  onSwitchToFullView: () => void;
  onOpenQuickAction: () => void;
  onOpenIncome: () => void;
  onOpenTransfer: () => void;
  onOpenEmi: () => void;
}

export const SimpleMobileView: React.FC<SimpleMobileViewProps> = ({
  onSwitchToFullView,
  onOpenQuickAction,
  onOpenIncome,
  onOpenTransfer,
  onOpenEmi,
}) => {
  const {
    currentUser,
    switchUser,
    cashWallets,
    bankAccounts,
    transactions,
    customCategories,
    addCustomCategory,
    addTransaction,
    deleteTransaction,
  } = useFinance();

  // Simple state for quick keypad entry
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('food');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Quick categories for 1-tap selection on mobile
  const quickCategories: { id: ExpenseCategory; label: string; icon: any; color: string }[] = [
    { id: 'groceries', label: 'Grocery', icon: ShoppingCart, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'food', label: 'Food / Swiggy', icon: Utensils, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { id: 'fuel', label: 'Fuel / Travel', icon: Fuel, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'bg-pink-50 text-pink-700 border-pink-200' },
    { id: 'electricity', label: 'Bills', icon: ZapIcon, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'medical', label: 'Medical', icon: HeartPulse, color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { id: 'entertainment', label: 'OTT / Movies', icon: Film, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  ];

  // Quick title tag chips
  const quickTitleTags = ['Blinkit', 'Swiggy', 'Zomato', 'Petrol', 'Supermarket', 'Milk & Veggies', 'Auto / Uber', 'Coffee / Snacks'];

  // Current user balances
  const currentCash = cashWallets.find((w) => w.owner === currentUser)?.balance || 0;
  const currentBankAccounts = bankAccounts.filter(
    (a) => a.owner === currentUser || a.owner === 'Joint'
  );
  const totalBankBal = currentBankAccounts.reduce((s, a) => s + a.currentBalance, 0);

  // Today's total spend
  const todayISO = getTodayISO();
  const todayTransactions = transactions.filter((t) => t.date === todayISO);
  const todayTotalSpent = todayTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  // Keypad handling
  const handleDigit = (digit: string) => {
    if (digit === '.') {
      if (amountStr.includes('.')) return;
      if (!amountStr) {
        setAmountStr('0.');
        return;
      }
      setAmountStr((prev) => prev + '.');
      return;
    }
    if (amountStr.length < 8) {
      setAmountStr((prev) => (prev === '0' ? digit : prev + digit));
    }
  };

  const handleBackspace = () => {
    setAmountStr((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setAmountStr('');
  };

  const handleSaveQuickExpense = () => {
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    if (paymentMethod === 'bank' && currentBankAccounts.length === 0) {
      alert(`No bank account found for ${currentUser}. Please add an account in the Accounts tab or choose "Cash in Hand".`);
      return;
    }

    const defaultAccount = currentBankAccounts[0]?.id;
    const catLabel = (CATEGORY_DETAILS as Record<string, { label: string }>)[selectedCategory]?.label || selectedCategory;
    const title = quickTitle.trim() || `${catLabel} Expense`;

    addTransaction({
      type: 'expense',
      title,
      amount: num,
      date: todayISO,
      person: currentUser,
      category: selectedCategory,
      paymentMethod,
      fromAccountId: paymentMethod === 'bank' ? defaultAccount : undefined,
      fromCashPerson: paymentMethod === 'cash' ? currentUser : undefined,
      notes: 'Logged via Simple Mobile mode',
    });

    // Provide haptic feedback if supported on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch {}
    }

    // Success feedback
    setSuccessToast(`Saved ₹${num.toLocaleString('en-IN')} for ${currentUser}!`);
    setTimeout(() => setSuccessToast(null), 2500);

    // Reset inputs
    setAmountStr('');
    setQuickTitle('');
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20 animate-in fade-in">
      
      {/* Top Banner: Mode & User Switch */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Simple Mobile Log
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton compact={true} />
            <button
              onClick={onSwitchToFullView}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl transition"
            >
              📊 Full View
            </button>
          </div>
        </div>

        {/* Person Switcher Buttons (Anson / Dona) */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {(['Anson', 'Dona'] as Person[]).map((p) => {
            const isSelected = currentUser === p;
            return (
              <button
                key={p}
                onClick={() => switchUser(p)}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition active:scale-98 ${
                  isSelected
                    ? p === 'Anson'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>Logging for <strong>{p}</strong></span>
              </button>
            );
          })}
        </div>

        {/* Quick Balance Status Strip */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
          <div className="p-2 bg-slate-50 rounded-xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Today Spent</p>
            <p className="text-xs font-black text-rose-600 mt-0.5">
              {formatINR(todayTotalSpent)}
            </p>
          </div>
          <div className="p-2 bg-slate-50 rounded-xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Cash in Hand</p>
            <p className="text-xs font-black text-teal-700 mt-0.5">
              {formatINR(currentCash)}
            </p>
          </div>
          <div className="p-2 bg-slate-50 rounded-xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Bank Balance</p>
            <p className="text-xs font-black text-blue-600 mt-0.5 truncate">
              {formatINR(totalBankBal)}
            </p>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-200">
            ✕
          </button>
        </div>
      )}

      {/* Main Fast Expense Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        
        {/* Large Amount Display */}
        <div className="text-center py-2 bg-slate-50 rounded-2xl border border-slate-200/60 relative">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Expense Amount (₹)
          </span>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1">
            <span className="text-emerald-600 font-extrabold text-2xl">₹</span>
            <span>{amountStr || '0'}</span>
          </div>
          {amountStr && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-xs text-slate-400 hover:text-slate-700 bg-white rounded-lg border shadow-xs"
            >
              Clear
            </button>
          )}
        </div>



        {/* Numeric Touch Keypad for effortless mobile typing */}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-95 text-slate-900 font-bold text-lg border border-slate-200 shadow-xs transition flex items-center justify-center cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={() => handleDigit('.')}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-900 font-extrabold text-xl border border-slate-200 transition flex items-center justify-center cursor-pointer"
          >
            .
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-95 text-slate-900 font-bold text-lg border border-slate-200 shadow-xs transition flex items-center justify-center cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-rose-600 font-bold text-sm border border-slate-200 transition flex items-center justify-center cursor-pointer"
          >
            ⌫
          </button>
        </div>

        {/* Category Pickers with Add Category Option */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Select Category *
            </span>
            <button
              onClick={() => setIsAddingCustomCategory(!isAddingCustomCategory)}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50"
            >
              <Plus className="w-3 h-3" />
              Add Category
            </button>
          </div>

          {/* Inline Add Category form */}
          {isAddingCustomCategory && (
            <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
              <input
                type="text"
                placeholder="Category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs bg-white border border-rose-300 rounded-lg text-slate-900 focus:outline-hidden"
              />
              <button
                onClick={() => {
                  if (newCatName.trim()) {
                    const created = addCustomCategory(newCatName.trim(), 'expense');
                    setSelectedCategory(created.name);
                    setNewCatName('');
                    setIsAddingCustomCategory(false);
                  }
                }}
                className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAddingCustomCategory(false);
                  setNewCatName('');
                }}
                className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {quickCategories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center transition active:scale-95 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-[10px] font-bold leading-tight truncate w-full">
                    {cat.label}
                  </span>
                </button>
              );
            })}

            {/* Custom Expense Categories */}
            {customCategories
              .filter((c) => c.type === 'expense')
              .map((c) => {
                const isSelected = selectedCategory === c.name;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.name)}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center transition active:scale-95 ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900 hover:bg-rose-100'
                    }`}
                  >
                    <span className="text-sm mb-0.5">🏷️</span>
                    <span className="text-[10px] font-bold leading-tight truncate w-full">
                      {c.name}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>


        {/* Payment Method: Bank vs Cash */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPaymentMethod('bank')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
              paymentMethod === 'bank'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Bank / UPI</span>
          </button>
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
              paymentMethod === 'cash'
                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Cash in Hand</span>
          </button>
        </div>

        {/* Optional Note / Quick Merchant Chips */}
        <div>
          <input
            type="text"
            placeholder="Merchant or description (e.g. Swiggy, Milk, Petrol)"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 text-[10px]">
            {quickTitleTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setQuickTitle(tag)}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold whitespace-nowrap"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Big Save Button */}
        <button
          onClick={handleSaveQuickExpense}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-sm tracking-wide shadow-md transition flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>{amountStr ? `Save Expense (${formatINR(parseFloat(amountStr))})` : 'Save Expense'}</span>
        </button>

      </div>

      {/* Quick Action Shortcuts row */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onOpenIncome}
          className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center hover:bg-slate-50 transition active:scale-95"
        >
          <span className="block font-black text-lg text-emerald-600 mx-auto mb-1">₹</span>
          <span className="text-[11px] font-bold text-slate-800 block">Add Income</span>
        </button>

        <button
          onClick={onOpenTransfer}
          className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center hover:bg-slate-50 transition active:scale-95"
        >
          <Building2 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <span className="text-[11px] font-bold text-slate-800 block">Transfer</span>
        </button>

        <button
          onClick={onOpenEmi}
          className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center hover:bg-slate-50 transition active:scale-95"
        >
          <Landmark className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
          <span className="text-[11px] font-bold text-slate-800 block">Pay EMI</span>
        </button>
      </div>

      {/* Today's Transactions Log */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Today's Log ({todayTransactions.length})
          </h3>
          <span className="text-xs font-black text-slate-900">
            {formatDateDDMMYYYY(todayISO)}
          </span>
        </div>

        {todayTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No expenses recorded yet today. Tap numbers above to log your spend!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {todayTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-900">{tx.title}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {tx.person}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {tx.paymentMethod === 'cash' ? 'Cash' : 'Bank A/C'} • {tx.category || tx.type}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`font-black ${
                        isIncome ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatINR(tx.amount)}
                    </span>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
