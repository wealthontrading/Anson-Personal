import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { IncomeSource, Person } from '../../types/finance';
import { getTodayISO, INCOME_SOURCE_DETAILS } from '../../utils/formatters';
import { X, Coins, Check, Plus, Tag } from 'lucide-react';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, bankAccounts, customCategories, addCustomCategory, addTransaction } = useFinance();

  const [amount, setAmount] = useState<string>('');
  const [person, setPerson] = useState<Person>(currentUser);
  const [source, setSource] = useState<string>('salary');
  const [destinationType, setDestinationType] = useState<'bank' | 'cash'>(() => {
    return bankAccounts.length > 0 ? 'bank' : 'cash';
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const defaultAcc = bankAccounts.find((a) => a.owner === currentUser) || bankAccounts[0];
    return defaultAcc?.id || '';
  });
  const [date, setDate] = useState<string>(getTodayISO());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Custom Income Source / Category
  const [isAddingSource, setIsAddingSource] = useState<boolean>(false);
  const [newSourceName, setNewSourceName] = useState<string>('');

  if (!isOpen) return null;

  const availableAccounts = bankAccounts.filter(
    (acc) => acc.owner === person || acc.owner === 'Joint'
  );

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
        setError('No bank accounts found. Please select Cash in Hand or add a bank account first.');
      } else {
        setError('Please select a destination bank account');
      }
      return;
    }

    const sourceLabel = INCOME_SOURCE_DETAILS[source as IncomeSource]?.label || source;
    const title = notes.trim() ? notes.trim() : `${sourceLabel} - ${person}`;

    addTransaction({
      type: 'income',
      title,
      amount: numAmount,
      date,
      person,
      category: source,
      paymentMethod: destinationType === 'cash' ? 'cash' : 'bank',
      toAccountId: destinationType === 'bank' ? selectedAccountId : undefined,
      toCashPerson: destinationType === 'cash' ? person : undefined,
      notes: notes.trim(),
    });

    onClose();
    setAmount('');
    setNotes('');
    setError('');
  };

  const incomeCustomCats = customCategories.filter((c) => c.type === 'income');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and explicit Close button */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              title="Close window"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl">
              ₹
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Record New Income</h3>
              <p className="text-xs text-slate-500">Live multi-device synced income entry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                ₹
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

          {/* Received By: Anson or Dona */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Received By *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['Anson', 'Dona'] as Person[]).map((p) => {
                const isSelected = person === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => {
                      setPerson(p);
                      const acc = bankAccounts.find((a) => a.owner === p);
                      if (acc) setSelectedAccountId(acc.id);
                    }}
                    className={`py-3 px-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                      isSelected
                        ? p === 'Anson'
                          ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                          : 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        p === 'Anson' ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}
                    />
                    {p}
                  </button>
                );
              })}
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
                Cash in Hand ({person})
              </button>
            </div>

            {destinationType === 'bank' && (
              <div className="mt-2">
                {availableAccounts.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    No bank accounts added for <strong>{person}</strong> yet. Please switch to <strong>Cash in Hand</strong> above or add a bank account in the Accounts section.
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.name} ({acc.accountNumberMasked || 'A/C'}) • Bal: ₹{acc.currentBalance.toLocaleString('en-IN')}
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
              onClick={onClose}
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
  );
};
