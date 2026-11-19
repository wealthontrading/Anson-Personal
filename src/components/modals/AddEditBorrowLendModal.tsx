import React, { useEffect, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { BorrowLendRecord, BorrowLendType, Person } from '../../types/finance';
import { formatINR, getTodayISO } from '../../utils/formatters';
import { ArrowDownLeft, ArrowUpRight, Bell, Check, HandCoins, IndianRupee, Phone, User, X } from 'lucide-react';

interface AddEditBorrowLendModalProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  editRecord?: BorrowLendRecord | null;
  presetType?: BorrowLendType;
}

export const AddEditBorrowLendModal: React.FC<AddEditBorrowLendModalProps> = ({
  isOpen,
  onClose,
  editRecord,
  presetType,
}) => {
  const {
    currentUser,
    bankAccounts,
    defaultBankAccount,
    addBorrowLendRecord,
    editBorrowLendRecord,
  } = useFinance();

  const [type, setType] = useState<BorrowLendType>('lend');
  const [personName, setPersonName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [date, setDate] = useState<string>(getTodayISO());
  const [dueDate, setDueDate] = useState<string>('');
  const [handledBy, setHandledBy] = useState<Person>(currentUser);
  const [notes, setNotes] = useState<string>('');
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);

  // Optional bank/cash balance sync when creating a new record
  const [recordInAccounts, setRecordInAccounts] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'cash'>('bank');
  const [accountId, setAccountId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const spendingAccounts = bankAccounts
    .filter((a) => a.owner !== 'Joint')
    .sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)));

  useEffect(() => {
    if (!isOpen) return;
    if (editRecord) {
      setType(editRecord.type);
      setPersonName(editRecord.personName);
      setPhone(editRecord.phone || '');
      setAmount(String(editRecord.amount));
      setPaidAmount(String(editRecord.paidAmount || 0));
      setDate(editRecord.date || getTodayISO());
      setDueDate(editRecord.dueDate || '');
      setHandledBy(editRecord.handledBy || currentUser);
      setNotes(editRecord.notes || '');
      setReminderEnabled(editRecord.reminderEnabled !== false);
      setRecordInAccounts(false);
      setError('');
    } else {
      setType(presetType || 'lend');
      setPersonName('');
      setPhone('');
      setAmount('');
      setPaidAmount('0');
      setDate(getTodayISO());
      setDueDate('');
      setHandledBy(currentUser);
      setNotes('');
      setReminderEnabled(true);
      setRecordInAccounts(false);
      setPaymentMethod(spendingAccounts.length > 0 ? 'bank' : 'cash');
      setAccountId(defaultBankAccount?.id || spendingAccounts[0]?.id || '');
      setError('');
    }
  }, [editRecord, isOpen, presetType, currentUser, defaultBankAccount]);

  if (!isOpen) return null;

  const isLend = type === 'lend';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setError('Please enter the person name.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    const numPaid = Math.max(0, Math.min(numAmount, parseFloat(paidAmount) || 0));

    if (!editRecord && recordInAccounts && paymentMethod === 'bank' && !accountId) {
      setError('Please select a bank account or switch to Cash.');
      return;
    }

    const payload: Omit<BorrowLendRecord, 'id' | 'createdAt'> = {
      type,
      personName: personName.trim(),
      phone: phone.trim() || undefined,
      amount: Math.round(numAmount),
      paidAmount: Math.round(numPaid),
      date: date || getTodayISO(),
      dueDate: dueDate || undefined,
      handledBy,
      status: numPaid >= numAmount ? 'settled' : 'pending',
      notes: notes.trim() || undefined,
      reminderEnabled: Boolean(dueDate) && reminderEnabled,
      payments: editRecord?.payments || [],
    };

    if (editRecord) {
      editBorrowLendRecord(editRecord.id, payload);
    } else {
      addBorrowLendRecord(payload, {
        recordInAccounts,
        paymentMethod,
        accountId: paymentMethod === 'bank' ? accountId : undefined,
      });
    }

    onClose(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs"
      onClick={() => onClose()}
    >
      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12">
        <div
          className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isLend ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                <HandCoins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {editRecord
                    ? 'Edit Borrow / Lend Entry'
                    : isLend
                    ? 'Record Lending Money (Given)'
                    : 'Record Borrowing Money (Taken)'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isLend
                    ? 'Money you gave to someone (to receive back)'
                    : 'Money you took from someone (to pay back)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Lend vs Borrow Type Toggle */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setType('lend')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                  isLend
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isLend ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-extrabold">Lend Money</span>
                  <span className={`block text-[10px] ${isLend ? 'text-emerald-100' : 'text-slate-500'}`}>
                    Given · To Receive
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('borrow')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                  !isLend
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    !isLend ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-extrabold">Borrow Money</span>
                  <span className={`block text-[10px] ${!isLend ? 'text-rose-100' : 'text-slate-500'}`}>
                    Taken · To Pay Back
                  </span>
                </div>
              </button>
            </div>

            {/* Person Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Person Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Friend, relative, or name"
                    value={personName}
                    onChange={(e) => {
                      setPersonName(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Total Amount & Already Returned/Repaid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Total Amount (₹) *
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {isLend ? 'Already Received (₹)' : 'Already Repaid (₹)'}
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {isLend ? 'Date Given *' : 'Date Borrowed *'}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {isLend ? 'Expected Return Date' : 'Repayment Due Date'}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Handled By & Reminder Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Handled By
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Anson', 'Dona'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setHandledBy(p)}
                      className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        handledBy === p
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 rounded"
                />
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  Remind on Due Date
                </span>
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Reason / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Short-term help, hospital emergency, gold purchase"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Optional: Also reflect in Bank/Cash accounts (only on new entries) */}
            {!editRecord && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordInAccounts}
                    onChange={(e) => setRecordInAccounts(e.target.checked)}
                    className="w-4 h-4 accent-slate-900 mt-0.5"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      Also update Bank / Cash balance
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {isLend
                        ? 'Deducts this amount from your chosen Bank or Cash wallet.'
                        : 'Adds this borrowed amount into your chosen Bank or Cash wallet.'}
                    </span>
                  </div>
                </label>

                {recordInAccounts && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bank')}
                        className={`py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                          paymentMethod === 'bank'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Bank Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                          paymentMethod === 'cash'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Cash ({handledBy})
                      </button>
                    </div>
                    {paymentMethod === 'bank' && spendingAccounts.length > 0 && (
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                      >
                        {spendingAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.isDefault ? '★ ' : ''}[{acc.owner}] {acc.bankName} - {acc.name} ({formatINR(acc.currentBalance)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onClose()}
                className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 py-3 px-4 text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                  isLend ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{editRecord ? 'Save Changes' : isLend ? 'Save Lending Record' : 'Save Borrowing Record'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
