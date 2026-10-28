import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Person, TransferType } from '../../types/finance';
import { getTodayISO } from '../../utils/formatters';
import { X, ArrowLeftRight, Check, Info } from 'lucide-react';

interface TransferMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferMoneyModal: React.FC<TransferMoneyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, bankAccounts, cashWallets, transferMoney } = useFinance();

  const [transferType, setTransferType] = useState<TransferType>(() => {
    if (bankAccounts.length >= 2) return 'bank_to_bank';
    if (bankAccounts.length === 1) return 'bank_to_cash';
    return 'cash_to_cash';
  });
  const [person, setPerson] = useState<Person>(currentUser);
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>(() => {
    if (bankAccounts.length >= 2) return 'Account Transfer';
    if (bankAccounts.length === 1) return 'ATM Cash Withdrawal';
    return 'Cash Handover / Transfer';
  });
  const [date, setDate] = useState<string>(getTodayISO());
  const [fromAccountId, setFromAccountId] = useState<string>(bankAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(bankAccounts[1]?.id || bankAccounts[0]?.id || '');
  const [fromCashPerson, setFromCashPerson] = useState<Person>('Anson');
  const [toCashPerson, setToCashPerson] = useState<Person>('Dona');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleTypeChange = (type: TransferType) => {
    setTransferType(type);
    setError('');
    if (type === 'bank_to_cash') {
      setTitle('ATM Cash Withdrawal');
      if (bankAccounts.length > 0 && !fromAccountId) setFromAccountId(bankAccounts[0].id);
    } else if (type === 'cash_to_bank') {
      setTitle('Cash Deposit to Bank');
      if (bankAccounts.length > 0 && !toAccountId) setToAccountId(bankAccounts[0].id);
    } else if (type === 'cash_to_cash') {
      setTitle('Cash Handover / Transfer');
      setFromCashPerson('Anson');
      setToCashPerson('Dona');
    } else {
      setTitle('Account Transfer');
      if (bankAccounts.length > 0 && !fromAccountId) setFromAccountId(bankAccounts[0].id);
      if (bankAccounts.length > 1 && !toAccountId) setToAccountId(bankAccounts[1].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid transfer amount greater than 0');
      return;
    }

    if (transferType === 'bank_to_bank') {
      if (bankAccounts.length < 2) {
        setError('At least two bank accounts are required to transfer between bank accounts. Please add another account first.');
        return;
      }
      if (!fromAccountId || !toAccountId) {
        setError('Please select both source and destination bank accounts');
        return;
      }
      if (fromAccountId === toAccountId) {
        setError('Source account and destination account cannot be the same');
        return;
      }
    }

    if (transferType === 'bank_to_cash') {
      if (bankAccounts.length === 0 || !fromAccountId) {
        setError('Please select a source bank account for ATM withdrawal');
        return;
      }
    }

    if (transferType === 'cash_to_bank') {
      if (bankAccounts.length === 0 || !toAccountId) {
        setError('Please select a destination bank account for cash deposit');
        return;
      }
    }

    if (transferType === 'cash_to_cash' && fromCashPerson === toCashPerson) {
      setError('Source cash person and destination person must be different');
      return;
    }

    transferMoney({
      title: title.trim() || 'Money Transfer',
      amount: numAmount,
      date,
      person,
      transferType,
      fromAccountId: transferType === 'bank_to_bank' || transferType === 'bank_to_cash' ? fromAccountId : undefined,
      toAccountId: transferType === 'bank_to_bank' || transferType === 'cash_to_bank' ? toAccountId : undefined,
      fromCashPerson: transferType === 'cash_to_bank' || transferType === 'cash_to_cash' ? fromCashPerson : undefined,
      toCashPerson: transferType === 'bank_to_cash' || transferType === 'cash_to_cash' ? toCashPerson : undefined,
      notes: notes.trim(),
    });

    onClose();
  };

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
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Transfer Funds</h3>
              <p className="text-xs text-slate-500">Live multi-device synced balance transfer</p>
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

        {/* Informational Banner */}
        <div className="mb-4 p-3 rounded-2xl bg-blue-50/70 border border-blue-200/60 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            Transfers rebalance your accounts without impacting income or expense totals.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transfer Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Transfer Mode *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'bank_to_bank', label: 'Bank → Bank' },
                { id: 'bank_to_cash', label: 'ATM Withdrawal' },
                { id: 'cash_to_bank', label: 'Cash Deposit' },
                { id: 'cash_to_cash', label: 'Cash Transfer' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => handleTypeChange(m.id as TransferType)}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-bold text-center transition ${
                    transferType === m.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
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
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Transfer Title / Reason
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Source & Destination Details */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            {/* Source */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                From (Source)
              </label>
              {transferType === 'bank_to_bank' || transferType === 'bank_to_cash' ? (
                bankAccounts.length === 0 ? (
                  <div className="p-2 text-xs text-amber-700 bg-amber-50 rounded-lg">No bank accounts added yet</div>
                ) : (
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  >
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.name} ({acc.owner}) • Bal: ₹{acc.currentBalance.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <select
                  value={fromCashPerson}
                  onChange={(e) => setFromCashPerson(e.target.value as Person)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                >
                  <option value="Anson">
                    Anson Cash Wallet (Bal: ₹{cashWallets.find((w) => w.owner === 'Anson')?.balance.toLocaleString('en-IN')})
                  </option>
                  <option value="Dona">
                    Dona Cash Wallet (Bal: ₹{cashWallets.find((w) => w.owner === 'Dona')?.balance.toLocaleString('en-IN')})
                  </option>
                </select>
              )}
            </div>

            {/* Destination */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                To (Destination)
              </label>
              {transferType === 'bank_to_bank' || transferType === 'cash_to_bank' ? (
                bankAccounts.length === 0 ? (
                  <div className="p-2 text-xs text-amber-700 bg-amber-50 rounded-lg">No bank accounts added yet</div>
                ) : (
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  >
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.name} ({acc.owner}) • Bal: ₹{acc.currentBalance.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <select
                  value={toCashPerson}
                  onChange={(e) => setToCashPerson(e.target.value as Person)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                >
                  <option value="Anson">
                    Anson Cash Wallet (Bal: ₹{cashWallets.find((w) => w.owner === 'Anson')?.balance.toLocaleString('en-IN')})
                  </option>
                  <option value="Dona">
                    Dona Cash Wallet (Bal: ₹{cashWallets.find((w) => w.owner === 'Dona')?.balance.toLocaleString('en-IN')})
                  </option>
                </select>
              )}
            </div>
          </div>

          {/* Date & Handled By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Initiated By
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Anson', 'Dona'] as Person[]).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPerson(p)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      person === p
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Notes
            </label>
            <input
              type="text"
              placeholder="ATM location, reference number, or note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
            />
          </div>

          {/* Action buttons: Cancel and Complete Transfer */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Complete Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
