import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { BankAccount } from '../../types/finance';
import { X, Building2, Check, Plus, IndianRupee } from 'lucide-react';

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
    const cleanBalance = balance.replace(/[^0-9.]/g, '');
    const numBalance = cleanBalance === '' ? 0 : parseFloat(cleanBalance);
    if (isNaN(numBalance) || numBalance < 0) {
      setError('Please enter a valid balance (0 or higher)');
      return;
    }

    const finalBankName = isCustomBank ? (customBankInput.trim() || 'Bank Account') : bankName;
    const finalName = name.trim() || `${finalBankName} Account`;

    if (editAccount) {
      editBankAccount(editAccount.id, {
        name: finalName,
        bankName: finalBankName,
        accountNumberMasked: accountNumberMasked.trim() ? accountNumberMasked.trim() : undefined,
        owner,
        currentBalance: numBalance,
      });
    } else {
      addBankAccount({
        name: finalName,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12">
        <div 
          className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200"
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
              Account Nickname <span className="text-[11px] font-normal text-slate-400 lowercase">(optional, defaults to bank name)</span>
            </label>
            <input
              type="text"
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

          {/* Account Owner: Anson, Dona, or Joint (both IDs selectable) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Account Owner (Choose ID) *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Anson', 'Dona', 'Joint'] as const).map((o) => {
                const isSelected = owner === o;
                return (
                  <button
                    type="button"
                    key={o}
                    onClick={() => setOwner(o)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? o === 'Anson'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : o === 'Dona'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected
                          ? 'bg-white'
                          : o === 'Anson'
                          ? 'bg-blue-600'
                          : o === 'Dona'
                          ? 'bg-emerald-600'
                          : 'bg-indigo-600'
                      }`}
                    />
                    <span>{o === 'Joint' ? 'Joint' : o}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Select whether this account belongs to Anson, Dona, or is a Joint account for both.
            </p>
          </div>

          {/* Balance (₹) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {editAccount ? 'Current Balance (₹)' : 'Opening Balance (₹)'} <span className="text-[11px] font-normal text-slate-400 lowercase">(optional, defaults to 0)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <IndianRupee className="w-4 h-4 stroke-[2.5]" />
              </span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
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
  </div>
);
};
