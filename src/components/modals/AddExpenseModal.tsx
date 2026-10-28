import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory, PaymentMethod, Person, Transaction } from '../../types/finance';
import { CATEGORY_DETAILS, getTodayISO } from '../../utils/formatters';
import { X, Receipt, IndianRupee, Check, Upload, Trash2, Plus, Tag, Lock } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  editTx?: Transaction | null;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  editTx,
}) => {
  const { currentUser, bankAccounts, customCategories, addCustomCategory, addTransaction, editTransaction } = useFinance();

  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('food');
  const [paidBy, setPaidBy] = useState<Person>(currentUser);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayISO());
  const [notes, setNotes] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string>('');

  // Inline custom category creation
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Sync state if editing an existing transaction
  useEffect(() => {
    if (editTx) {
      setAmount(String(editTx.amount));
      setTitle(editTx.title);
      setCategory(editTx.category || 'food');
      setPaidBy(editTx.person || currentUser);
      setPaymentMethod(editTx.paymentMethod || 'bank');
      setSelectedAccountId(editTx.fromAccountId || '');
      setDate(editTx.date);
      setNotes(editTx.notes || '');
      setReceiptImage(editTx.receiptImage);
    } else {
      setAmount('');
      setTitle('');
      setCategory('food');
      setPaidBy(currentUser);
      setPaymentMethod(bankAccounts.length > 0 ? 'bank' : 'cash');
      const defaultAcc = bankAccounts.find((a) => a.owner === currentUser) || bankAccounts.find((a) => a.owner === 'Joint') || bankAccounts[0];
      setSelectedAccountId(defaultAcc?.id || '');
      setDate(getTodayISO());
      setNotes('');
      setReceiptImage(undefined);
      setError('');
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  }, [editTx, isOpen, currentUser, bankAccounts]);

  if (!isOpen) return null;

  // Filter available accounts strictly to logged in user and Joint accounts
  const availableAccounts = bankAccounts.filter(
    (acc) => acc.owner === currentUser || acc.owner === 'Joint'
  );

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const created = addCustomCategory(newCategoryName.trim(), 'expense');
    setCategory(created.name);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Receipt file size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0');
      return;
    }
    if (!title.trim()) {
      setError('Please provide an expense title (e.g. Groceries)');
      return;
    }
    if ((paymentMethod === 'bank' || paymentMethod === 'credit_card') && !selectedAccountId) {
      setError('Please select the payment account used');
      return;
    }

    if (editTx) {
      editTransaction(editTx.id, {
        amount: numAmount,
        title: title.trim(),
        category,
        person: currentUser,
        paymentMethod,
        fromAccountId: paymentMethod !== 'cash' ? selectedAccountId : undefined,
        fromCashPerson: paymentMethod === 'cash' ? currentUser : undefined,
        date,
        notes: notes.trim(),
        receiptImage,
      });
    } else {
      addTransaction({
        type: 'expense',
        title: title.trim(),
        amount: numAmount,
        date,
        person: currentUser,
        category,
        paymentMethod,
        fromAccountId: paymentMethod !== 'cash' ? selectedAccountId : undefined,
        fromCashPerson: paymentMethod === 'cash' ? currentUser : undefined,
        notes: notes.trim(),
        receiptImage,
      });
    }

    // Save entry and signal parent to close modal and switch to transactions tab
    onClose(true);
  };

  // Filter custom categories of type 'expense'
  const expenseCustomCats = customCategories.filter((c) => c.type === 'expense');

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
              onClick={() => onClose()}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              title="Close window"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editTx ? 'Edit Expense Record' : 'Record New Expense'}
              </h3>
              <p className="text-xs text-slate-500">Live multi-device synced expense entry</p>
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
          {/* Amount & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Expense Amount (₹) *
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
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Expense Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Swiggy food delivery"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 transition"
              />
            </div>
          </div>

          {/* Paid By: Locked to Logged-in Account */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Paid By (Logged-in Account)
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
                  <span className="text-[11px] text-slate-500 font-medium">Auto-assigned to your account</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Account Locked</span>
              </span>
            </div>
          </div>

          {/* Category Section with Add Category Option */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Expense Category *
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </button>
            </div>

            {/* Inline Add Category Form */}
            {isAddingCategory && (
              <div className="mb-2 p-3 bg-rose-50/70 border border-rose-200 rounded-xl animate-in fade-in duration-150">
                <p className="text-xs font-bold text-rose-900 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Create New Custom Category
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Gym, Pet Care, School Books"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    Save & Select
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName('');
                    }}
                    className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl">
              {/* Preset Categories */}
              {(Object.keys(CATEGORY_DETAILS) as ExpenseCategory[]).map((cat) => {
                const isSelected = category === cat;
                const details = CATEGORY_DETAILS[cat];
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`p-2 rounded-lg border text-left text-[11px] font-semibold truncate transition ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {details.label}
                  </button>
                );
              })}

              {/* User Created Custom Categories */}
              {expenseCustomCats.map((c) => {
                const isSelected = category === c.name;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategory(c.name)}
                    className={`p-2 rounded-lg border text-left text-[11px] font-semibold truncate transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-rose-50/50 border-rose-200 text-rose-900 hover:bg-rose-100/60'
                    }`}
                  >
                    <span className="truncate">🏷️ {c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method & Account */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Payment Method & Source *
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { id: 'bank', label: 'Bank A/C' },
                { id: 'cash', label: 'Cash in Hand' },
                { id: 'credit_card', label: 'Credit Card' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition flex items-center justify-center ${
                    paymentMethod === m.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {paymentMethod !== 'cash' ? (
              availableAccounts.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  No bank accounts added for <strong>{paidBy}</strong> yet. Please select <strong>Cash in Hand</strong> above or add a bank account in the Accounts section.
                </div>
              ) : (
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                >
                  {availableAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.name} ({acc.accountNumberMasked || 'A/C'}) • Bal: ₹{acc.currentBalance.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                <span>Deducts directly from <strong>{paidBy}</strong>'s cash wallet.</span>
              </div>
            )}
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Notes
              </label>
              <input
                type="text"
                placeholder="Optional notes or details"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Optional Receipt Attachment */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Receipt Attachment (Optional)
            </label>
            {receiptImage ? (
              <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <img
                  src={receiptImage}
                  alt="Receipt Preview"
                  className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-800">Receipt Attached</p>
                  <p className="text-[10px] text-slate-500">Image saved with transaction</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptImage(undefined)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition text-xs font-semibold text-slate-600">
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Upload bill or receipt snapshot</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Action Buttons: Cancel/Close and Submit */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onClose()}
              className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {editTx ? 'Update Expense' : 'Save Expense Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
