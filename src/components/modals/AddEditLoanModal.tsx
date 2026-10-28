import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Loan, LoanType, Person } from '../../types/finance';
import { LOAN_TYPE_LABELS, getTodayISO } from '../../utils/formatters';
import { X, Landmark, Check, Plus } from 'lucide-react';

interface AddEditLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  editLoanData?: Loan | null;
}

export const AddEditLoanModal: React.FC<AddEditLoanModalProps> = ({
  isOpen,
  onClose,
  editLoanData,
}) => {
  const { addLoan, editLoan, bankAccounts, currentUser } = useFinance();

  const [name, setName] = useState<string>('');
  const [type, setType] = useState<LoanType>('home_loan');
  const [isCustomType, setIsCustomType] = useState<boolean>(false);
  const [customTypeInput, setCustomTypeInput] = useState<string>('');
  const [owner, setOwner] = useState<Person>(currentUser);
  const [originalAmount, setOriginalAmount] = useState<string>('');
  const [outstandingPrincipal, setOutstandingPrincipal] = useState<string>('');
  const [monthlyEmi, setMonthlyEmi] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('8.5');
  const [startDate, setStartDate] = useState<string>(getTodayISO());
  const [emiDueDay, setEmiDueDay] = useState<number>(5);
  const [tenureMonths, setTenureMonths] = useState<string>('240');
  const [emisPaid, setEmisPaid] = useState<string>('0');
  const [lenderName, setLenderName] = useState<string>('HDFC Bank');
  const [linkedAccountId, setLinkedAccountId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (editLoanData) {
      setName(editLoanData.name);
      setType(editLoanData.type);
      setOwner(editLoanData.owner);
      setOriginalAmount(String(editLoanData.originalAmount));
      setOutstandingPrincipal(String(editLoanData.outstandingPrincipal));
      setMonthlyEmi(String(editLoanData.monthlyEmi));
      setInterestRate(String(editLoanData.interestRate));
      setStartDate(editLoanData.startDate);
      setEmiDueDay(editLoanData.emiDueDay);
      setTenureMonths(String(editLoanData.tenureMonths));
      setEmisPaid(String(editLoanData.emisPaid));
      setLenderName(editLoanData.lenderName || '');
      setLinkedAccountId(editLoanData.linkedAccountId || '');
      setIsCustomType(false);
      setCustomTypeInput('');
    } else {
      setName('');
      setType('home_loan');
      setIsCustomType(false);
      setCustomTypeInput('');
      setOwner(currentUser);
      setOriginalAmount('');
      setOutstandingPrincipal('');
      setMonthlyEmi('');
      setInterestRate('8.5');
      setStartDate(getTodayISO());
      setEmiDueDay(5);
      setTenureMonths('240');
      setEmisPaid('0');
      setLenderName('HDFC Bank');
      const defAcc = bankAccounts.find((a) => a.owner === currentUser) || bankAccounts[0];
      setLinkedAccountId(defAcc?.id || '');
      setError('');
    }
  }, [editLoanData, isOpen, currentUser, bankAccounts]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orig = parseFloat(originalAmount);
    const out = parseFloat(outstandingPrincipal);
    const emi = parseFloat(monthlyEmi);
    const rate = parseFloat(interestRate);
    const tenure = parseInt(tenureMonths, 10);
    const paid = parseInt(emisPaid, 10);

    if (isNaN(orig) || orig <= 0) {
      setError('Please enter a valid original loan amount');
      return;
    }
    if (isNaN(out) || out < 0) {
      setError('Please enter a valid outstanding principal');
      return;
    }
    if (isNaN(emi) || emi <= 0) {
      setError('Please enter a valid monthly EMI amount');
      return;
    }
    if (isNaN(tenure) || tenure <= 0) {
      setError('Please enter valid tenure months');
      return;
    }

    const remaining = Math.max(0, tenure - (isNaN(paid) ? 0 : paid));
    const finalType = (isCustomType && customTypeInput.trim() ? 'other' : type) as LoanType;

    if (editLoanData) {
      editLoan(editLoanData.id, {
        name: isCustomType && customTypeInput.trim() ? `${name.trim()} (${customTypeInput.trim()})` : name.trim() || 'Loan',
        type: finalType,
        owner,
        originalAmount: orig,
        outstandingPrincipal: out,
        monthlyEmi: emi,
        interestRate: isNaN(rate) ? 0 : rate,
        startDate,
        emiDueDay,
        tenureMonths: tenure,
        emisPaid: isNaN(paid) ? 0 : paid,
        emisRemaining: remaining,
        lenderName: lenderName.trim(),
        linkedAccountId: linkedAccountId || undefined,
        status: out <= 0 ? 'closed' : 'active',
      });
    } else {
      addLoan({
        name: isCustomType && customTypeInput.trim() ? `${name.trim()} (${customTypeInput.trim()})` : name.trim() || 'New Loan',
        type: finalType,
        owner,
        originalAmount: orig,
        outstandingPrincipal: out,
        monthlyEmi: emi,
        interestRate: isNaN(rate) ? 0 : rate,
        startDate,
        emiDueDay,
        tenureMonths: tenure,
        emisPaid: isNaN(paid) ? 0 : paid,
        emisRemaining: remaining,
        lenderName: lenderName.trim(),
        linkedAccountId: linkedAccountId || undefined,
        status: 'active',
      });
    }

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
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editLoanData ? 'Edit Loan Account' : 'Add Loan / EMI'}
              </h3>
              <p className="text-xs text-slate-500">Live multi-device synced loan profile</p>
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
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Loan Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Prestige Apartment Home Loan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Loan Category / Type *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomType(!isCustomType)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {isCustomType ? 'Standard' : '+ Custom Type'}
                </button>
              </div>
              {isCustomType ? (
                <input
                  type="text"
                  placeholder="e.g. Equipment Loan, Family Loan"
                  value={customTypeInput}
                  onChange={(e) => setCustomTypeInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              ) : (
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as LoanType)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {(Object.keys(LOAN_TYPE_LABELS) as LoanType[]).map((t) => (
                    <option key={t} value={t}>
                      {LOAN_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Loan Owner *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Anson', 'Dona'] as Person[]).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setOwner(p)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      owner === p
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Original Loan Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                placeholder="0"
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Outstanding Principal (₹) *
              </label>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                placeholder="0"
                value={outstandingPrincipal}
                onChange={(e) => setOutstandingPrincipal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Monthly EMI (₹) *
              </label>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                placeholder="0"
                value={monthlyEmi}
                onChange={(e) => setMonthlyEmi(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Interest Rate (%) *
              </label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                required
                placeholder="0"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Due Day of Month *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                inputMode="numeric"
                required
                value={emiDueDay}
                onChange={(e) => setEmiDueDay(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Total Tenure (Months) *
              </label>
              <input
                type="number"
                inputMode="numeric"
                required
                placeholder="0"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                EMIs Paid So Far *
              </label>
              <input
                type="number"
                inputMode="numeric"
                required
                placeholder="0"
                value={emisPaid}
                onChange={(e) => setEmisPaid(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 no-spinner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Lender / Bank Name
              </label>
              <input
                type="text"
                placeholder="HDFC, SBI, Axis, etc."
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Linked Debit Account
              </label>
              <select
                value={linkedAccountId}
                onChange={(e) => setLinkedAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              >
                <option value="">None / Manual</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.name} ({acc.owner})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons: Cancel and Save */}
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
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {editLoanData ? 'Update Loan' : 'Save Loan Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
