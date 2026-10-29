import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { IncomeSource, Person } from '../../types/finance';
import { getTodayISO, INCOME_SOURCE_DETAILS } from '../../utils/formatters';
import { X, Check, IndianRupee, Plus, Tag, Lock } from 'lucide-react';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, bankAccounts, customCategories, addCustomCategory, addTransaction } = useFinance();

  const [amount, setAmount] = useState<string>('');
  const [source, setSource] = useState<string>('salary');
  const [destinationType, setDestinationType] = useState<'bank' | 'cash'>(() => {
    return bankAccounts.length > 0 ? 'bank' : 'cash';
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayISO());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Custom Income Source / Category
  const [isAddingSource, setIsAddingSource] = useState<boolean>(false);
  const [newSourceName, setNewSourceName] = useState<string>('');

  // Sort available accounts so current user & joint accounts appear first, but all family accounts remain accessible
  const availableAccounts = [...bankAccounts].sort((a, b) => {
    const aMatch = a.owner === currentUser ? -2 : a.owner === 'Joint' ? -1 : 0;
    const bMatch = b.owner === currentUser ? -2 : b.owner === 'Joint' ? -1 : 0;
    return aMatch - bMatch;
  });

  // Ensure an account is always selected when bank accounts exist
  useEffect(() => {
    if ((!selectedAccountId || !availableAccounts.some((a) => a.id === selectedAccountId)) && availableAccounts.length > 0) {
      setSelectedAccountId(availableAccounts[0].id);
    }
  }, [availableAccounts, selectedAccountId]);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setSource('salary');
      setDestinationType(bankAccounts.length > 0 ? 'bank' : 'cash');
      const defaultAcc = bankAccounts.find((a) => a.owner === currentUser) || bankAccounts.find((a) => a.owner === 'Joint') || bankAccounts[0];
      setSelectedAccountId(defaultAcc?.id || '');
      setDate(getTodayISO());
      setNotes('');
      setError('');
      setIsAddingSource(false);
      setNewSourceName('');
    }
  }, [isOpen, currentUser, bankAccounts]);

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;
    const created = addCustomCategory(newSourceName.trim(), 'income');
    setSource(created.name);
    setNewSourceName('');
    setIsAddingSource(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid income amount greater than 0');
      return;
    }

    if (destinationType === 'bank' && !selectedAccountId) {
      if (availableAccounts.length === 0) {
        setError('No bank accounts found for your profile. Please select Cash in Hand or add a bank account first.');
      } else {
        setError('Please select a destination bank account');
      }
      return;
    }

    const sourceLabel = INCOME_SOURCE_DETAILS[source as IncomeSource]?.label || source;
    const title = notes.trim() ? notes.trim() : `${sourceLabel} - ${currentUser}`;

    addTransaction({
      type: 'income',
      title,
      amount: numAmount,
      date,
      person: currentUser,
      category: source,
      paymentMethod: destinationType === 'cash' ? 'cash' : 'bank',
      toAccountId: destinationType === 'bank' ? selectedAccountId : undefined,
      toCashPerson: destinationType === 'cash' ? currentUser : undefined,
      notes: notes.trim(),
    });

    setAmount('');
    setNotes('');
    setError('');
    // Save entry and signal parent to close modal and switch to transactions tab
    onClose(true);
  };

  const incomeCustomCats = customCategories.filter((c) => c.type === 'income');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12">
        <div 
          className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header with Title and explicit Close button */}
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
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Record New Income</h3>
              <p className="text-xs text-slate-500">Live multi-device synced income entry</p>
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

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Income Amount */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Income Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <IndianRupee className="w-4 h-4 stroke-[2.5]" />
              </span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xl sm:text-2xl font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
              />
            </div>
          </div>

          {/* Received By: Locked to Logged-in Account */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Received By (Logged-in Account)
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl text-white font-black text-sm flex items-center justify-center shadow-xs ${
                    currentUser === 'Anson' ? 'bg-blue-600' : 'bg-emerald-600'
                  }`}
                >
                  {currentUser[0]}
                </div>
                <div>
                  <span className="text-sm font-extrabold text-slate-900 block leading-tight">{currentUser}</span>
                  <span className="text-[11px] text-slate-500 font-medium">Auto-credited to your account</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Account Locked</span>
              </span>
            </div>
          </div>

          {/* Income Source with Add Category Option */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Income Source / Category *
              </label>
              <button
                type="button"
                onClick={() => setIsAddingSource(!isAddingSource)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </button>
            </div>

            {/* Inline Add Income Source Form */}
            {isAddingSource && (
              <div className="mb-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl animate-in fade-in duration-150">
                <p className="text-xs font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Create New Income Category / Source
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Consulting, Dividends, Rent"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateSource}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    Save & Select
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSource(false);
                      setNewSourceName('');
                    }}
                    className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl">
              {(Object.keys(INCOME_SOURCE_DETAILS) as IncomeSource[]).map((src) => {
                const isSelected = source === src;
                const details = INCOME_SOURCE_DETAILS[src];
                return (
                  <button
                    type="button"
                    key={src}
                    onClick={() => setSource(src)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{details.label}</span>
                  </button>
                );
              })}

              {/* User created custom income sources */}
              {incomeCustomCats.map((c) => {
                const isSelected = source === c.name;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSource(c.name)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-emerald-50/50 border-emerald-200 text-emerald-900 hover:bg-emerald-100/60'
                    }`}
                  >
                    <span className="truncate">🏷️ {c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Received Into: Bank Account or Cash in Hand */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Received Into *
            </label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                type="button"
                onClick={() => setDestinationType('bank')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  destinationType === 'bank'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Bank Account
              </button>
              <button
                type="button"
                onClick={() => setDestinationType('cash')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  destinationType === 'cash'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Cash in Hand ({currentUser})
              </button>
            </div>

            {destinationType === 'bank' && (
              <div className="mt-2">
                {availableAccounts.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    No bank accounts added for <strong>{currentUser}</strong> yet. Please switch to <strong>Cash in Hand</strong> above or add a bank account in the Accounts section.
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        [{acc.owner}] {acc.bankName} - {acc.name} ({acc.accountNumberMasked || 'A/C'}) • Bal: ₹{acc.currentBalance.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Date of Income *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Notes / Description
              </label>
              <input
                type="text"
                placeholder="e.g. October monthly salary"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Action Buttons: Cancel/Close and Submit */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onClose()}
              className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Income Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
};
