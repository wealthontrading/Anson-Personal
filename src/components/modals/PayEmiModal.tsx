import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Person } from '../../types/finance';
import { formatINR, getTodayISO } from '../../utils/formatters';
import { X, Landmark, Check, AlertCircle } from 'lucide-react';

interface PayEmiModalProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  presetLoanId?: string;
}

export const PayEmiModal: React.FC<PayEmiModalProps> = ({
  isOpen,
  onClose,
  presetLoanId,
}) => {
  const { loans, bankAccounts, recordEmiPayment, currentUser } = useFinance();

  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paidBy, setPaidBy] = useState<Person>(currentUser);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'cash'>('bank');
  const [accountId, setAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayISO());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const activeLoans = loans.filter((l) => l.status === 'active');

  useEffect(() => {
    if (presetLoanId) {
      setSelectedLoanId(presetLoanId);
    } else if (activeLoans.length > 0 && !selectedLoanId) {
      setSelectedLoanId(activeLoans[0].id);
    }
  }, [presetLoanId, activeLoans, selectedLoanId]);

  useEffect(() => {
    const loan = activeLoans.find((l) => l.id === selectedLoanId);
    if (loan) {
      setAmount(String(loan.monthlyEmi));
      setPaidBy(currentUser);
      const defAcc =
        bankAccounts.find((a) => a.id === loan.linkedAccountId) ||
        bankAccounts.find((a) => a.owner === currentUser) ||
        bankAccounts.find((a) => a.owner === 'Joint') ||
        bankAccounts[0];
      if (defAcc) setAccountId(defAcc.id);
    }
  }, [selectedLoanId, activeLoans, bankAccounts, currentUser]);

  if (!isOpen) return null;

  const currentLoan = activeLoans.find((l) => l.id === selectedLoanId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid EMI amount');
      return;
    }
    if (!selectedLoanId) {
      setError('Please select an active loan to pay');
      return;
    }
    if (paymentMethod === 'bank' && !accountId) {
      setError('Please select the payment bank account');
      return;
    }

    recordEmiPayment({
      loanId: selectedLoanId,
      amount: numAmount,
      paidBy: currentUser,
      paymentMethod,
      accountId: paymentMethod === 'bank' ? accountId : undefined,
      date,
      notes: notes.trim(),
    });

    onClose(true);
  };

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
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Record EMI Payment</h3>
              <p className="text-xs text-slate-500">Live multi-device synced loan installment</p>
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

        {activeLoans.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Landmark className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">No Active Loans Found</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
              Add a loan in the EMIs section first to start tracking monthly installments.
            </p>
            <button
              type="button"
              onClick={() => onClose()}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Select Loan */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Select Active Loan *
              </label>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {activeLoans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.owner}) • EMI: ₹{l.monthlyEmi.toLocaleString('en-IN')} (Outst: ₹{l.outstandingPrincipal.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            {/* Loan Quick Info Card */}
            {currentLoan && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/60 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-indigo-950">{currentLoan.name}</p>
                  <p className="text-[11px] text-indigo-700">
                    Remaining: {currentLoan.emisRemaining} EMIs • Outstanding: {formatINR(currentLoan.outstandingPrincipal)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                    Due Day: {currentLoan.emiDueDay}th
                  </span>
                </div>
              </div>
            )}

            {/* Amount & Paid By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Installment Amount (₹) *
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
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Paid By (Logged-in Account)
                </label>
                <div className="py-2.5 px-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{currentUser}</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    Account Locked
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method & Bank Account */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Paid From *
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    paymentMethod === 'bank'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Bank Account
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    paymentMethod === 'cash'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cash Wallet ({paidBy})
                </button>
              </div>

              {paymentMethod === 'bank' && (
                <div>
                  {bankAccounts.length === 0 ? (
                    <div className="p-2 text-xs text-amber-800 bg-amber-50 rounded-xl">
                      No bank accounts found. Please use Cash or add a bank account first.
                    </div>
                  ) : (
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    >
                      {bankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankName} - {acc.name} ({acc.owner}) • Bal: ₹{acc.currentBalance.toLocaleString('en-IN')}
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
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Month installment #14"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Action buttons: Cancel and Record EMI */}
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
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Record EMI Payment
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  </div>
);
};
