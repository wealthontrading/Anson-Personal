import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { BankAccount } from '../../types/finance';
import { X, Building2, Check, Plus } from 'lucide-react';

interface AddEditAccountModalProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  editAccount?: BankAccount | null;
}

export const AddEditAccountModal: React.FC<AddEditAccountModalProps> = ({
  isOpen,
  onClose,
  editAccount,
}) => {
  const { addBankAccount, editBankAccount, currentUser } = useFinance();

  const [name, setName] = useState<string>('');
  const [bankName, setBankName] = useState<string>('HDFC Bank');
  const [isCustomBank, setIsCustomBank] = useState<boolean>(false);
  const [customBankInput, setCustomBankInput] = useState<string>('');
  const [accountNumberMasked, setAccountNumberMasked] = useState<string>('');
  const [owner, setOwner] = useState<'Anson' | 'Dona' | 'Joint'>('Anson');
  const [balance, setBalance] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (editAccount) {
      setName(editAccount.name);
      setBankName(editAccount.bankName);
      setAccountNumberMasked(editAccount.accountNumberMasked || '');
      setOwner(editAccount.owner);
      setBalance(String(editAccount.currentBalance));
      setIsCustomBank(false);
      setCustomBankInput('');
    } else {
      setName('');
      setBankName('HDFC Bank');
      setIsCustomBank(false);
      setCustomBankInput('');
      setAccountNumberMasked('');
      setOwner(currentUser);
      setBalance('');
      setError('');
    }
  }, [editAccount, isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance) || numBalance < 0) {
      setError('Please enter a valid balance');
      return;
    }
    if (!name.trim()) {
      setError('Please provide an account nickname (e.g. Salary Account)');
      return;
    }

    const finalBankName = isCustomBank ? (customBankInput.trim() || 'Bank Account') : bankName;

    if (editAccount) {
      editBankAccount(editAccount.id, {
        name: name.trim(),
        bankName: finalBankName,
        accountNumberMasked: accountNumberMasked.trim() ? accountNumberMasked.trim() : undefined,
        owner,
        currentBalance: numBalance,
      });
    } else {
      addBankAccount({
        name: name.trim(),
        bankName: finalBankName,
        accountNumberMasked: accountNumberMasked.trim() ? accountNumberMasked.trim() : undefined,
        owner,
        openingBalance: numBalance,
        currentBalance: numBalance,
      });
    }

    onClose(true);
  };

  const commonBanks = [
    'HDFC Bank',
    'ICICI Bank',
    'State Bank of India',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Federal Bank',
    'Bank of Baroda',
    'Punjab National Bank',
    'Canara Bank',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-200"
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
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editAccount ? 'Edit Bank Account' : 'Add Bank Account'}
              </h3>
              <p className="text-xs text-slate-500">Live multi-device synced account</p>
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
          {/* Account Nickname */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Account Nickname *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Primary Salary Account, Savings"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bank Selection with custom bank option */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Bank Name *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomBank(!isCustomBank)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {isCustomBank ? 'Choose from list' : '+ Custom Bank'}
              </button>
            </div>
            {isCustomBank ? (
              <input
                type="text"
                required
                placeholder="Type your bank or cooperative name"
                value={customBankInput}
                onChange={(e) => setCustomBankInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {commonBanks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Account Owner: Logged-in Profile or Joint */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Account Owner (Logged-in Profile or Joint) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([currentUser, 'Joint'] as const).map((o) => (
                <button
                  type="button"
                  key={o}
                  onClick={() => setOwner(o)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    owner === o
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {o === currentUser ? `${o} (Your Account)` : 'Joint Account'}
                </button>
              ))}
            </div>
          </div>

          {/* Balance (₹) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {editAccount ? 'Current Balance (₹) *' : 'Opening Balance (₹) *'}
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
                value={balance}
                onChange={(e) => {
                  setBalance(e.target.value);
                  setError('');
                }}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
              />
            </div>
          </div>

          {/* Optional Account Number Masked */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Last 4 Digits / Masked Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. ••4829"
              maxLength={8}
              value={accountNumberMasked}
              onChange={(e) => setAccountNumberMasked(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
            />
          </div>

          {/* Action buttons: Cancel and Save */}
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
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {editAccount ? 'Update Account' : 'Save Bank Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
