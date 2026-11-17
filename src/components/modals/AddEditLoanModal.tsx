import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Loan, LoanType, PaymentFrequency, Person } from '../../types/finance';
import { LOAN_TYPE_LABELS, formatDateDDMMYYYY, formatINR, getTodayISO } from '../../utils/formatters';
import {
  formatDateToISO,
  getLoanPaidAmount,
  getNextDueDateForLoan,
  getReminderWindowStart,
} from '../../utils/notifications';
import { X, Landmark, Check, Bell, Calendar, Coins } from 'lucide-react';

interface AddEditLoanModalProps {
  isOpen: boolean;
  onClose: (saved?: boolean, createdLoanId?: string) => void;
  editLoanData?: Loan | null;
  presetLoanType?: LoanType;
}

export const AddEditLoanModal: React.FC<AddEditLoanModalProps> = ({
  isOpen,
  onClose,
  editLoanData,
  presetLoanType,
}) => {
  const { addLoan, editLoan, bankAccounts, defaultBankAccount, currentUser, transactions } = useFinance();

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
  const [emiDueDate, setEmiDueDate] = useState<string>(getTodayISO());
  const [emiDueDay, setEmiDueDay] = useState<number>(new Date().getDate());
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('monthly');
  const [tenureMonths, setTenureMonths] = useState<string>('240');
  const [emisPaid, setEmisPaid] = useState<string>('0');
  const [lenderName, setLenderName] = useState<string>('HDFC Bank');
  const [linkedAccountId, setLinkedAccountId] = useState<string>('');

  // Gold Loan specific fields
  const [totalInterest, setTotalInterest] = useState<string>('');
  const [quarterlyInterest, setQuarterlyInterest] = useState<string>('');
  const [initialPaidAmount, setInitialPaidAmount] = useState<string>('0');
  const [manualInterestEdited, setManualInterestEdited] = useState<boolean>(false);

  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    if (editLoanData) {
      setName(editLoanData.name);
      setType(editLoanData.type);
      setOwner(editLoanData.owner);
      setOriginalAmount(String(editLoanData.originalAmount));
      setOutstandingPrincipal(String(editLoanData.outstandingPrincipal));
      setMonthlyEmi(String(editLoanData.monthlyEmi));
      setInterestRate(String(editLoanData.interestRate));
      setStartDate(editLoanData.startDate || getTodayISO());
      const fallbackDate = (() => {
        const now = new Date();
        const day = Math.min(28, Math.max(1, editLoanData.emiDueDay || 5));
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      })();
      setEmiDueDate(editLoanData.emiDueDate || fallbackDate);
      setEmiDueDay(editLoanData.emiDueDay || 5);
      setPaymentFrequency(
        editLoanData.paymentFrequency || (editLoanData.type === 'gold_loan' ? 'quarterly' : 'monthly')
      );
      setTenureMonths(String(editLoanData.tenureMonths || 12));
      setEmisPaid(String(editLoanData.emisPaid || 0));
      setLenderName(editLoanData.lenderName || '');
      setLinkedAccountId(editLoanData.linkedAccountId || defaultBankAccount?.id || '');
      setTotalInterest(editLoanData.totalInterest !== undefined ? String(editLoanData.totalInterest) : '');
      setQuarterlyInterest(editLoanData.quarterlyInterest !== undefined ? String(editLoanData.quarterlyInterest) : '');
      setInitialPaidAmount(editLoanData.initialPaidAmount !== undefined ? String(editLoanData.initialPaidAmount) : '0');
      setManualInterestEdited(true);
      setIsCustomType(false);
      setCustomTypeInput('');
      setError('');
    } else {
      const initialType: LoanType = presetLoanType || 'home_loan';
      const isGold = initialType === 'gold_loan';
      setName('');
      setType(initialType);
      setIsCustomType(false);
      setCustomTypeInput('');
      setOwner(currentUser);
      setOriginalAmount('');
      setOutstandingPrincipal('');
      setMonthlyEmi('');
      setInterestRate(isGold ? '9.0' : '8.5');
      setStartDate(getTodayISO());
      const nextMonthDefault = new Date();
      nextMonthDefault.setDate(nextMonthDefault.getDate() + 5);
      const defaultDueISO = formatDateToISO(nextMonthDefault);
      setEmiDueDate(defaultDueISO);
      setEmiDueDay(nextMonthDefault.getDate());
      setPaymentFrequency(isGold ? 'quarterly' : 'monthly');
      setTenureMonths(isGold ? '12' : '240');
      setEmisPaid('0');
      setLenderName(isGold ? 'SBI Gold Loan' : 'HDFC Bank');
      const defAcc = defaultBankAccount || bankAccounts.find((a) => a.owner === currentUser) || bankAccounts[0];
      setLinkedAccountId(defAcc?.id || '');
      setTotalInterest('');
      setQuarterlyInterest('');
      setInitialPaidAmount('0');
      setManualInterestEdited(false);
      setError('');
    }
  }, [editLoanData, presetLoanType, isOpen, currentUser, bankAccounts, defaultBankAccount]);

  // Auto-calculate Total Interest & Quarterly Interest for Gold Loans when amount, rate, or tenure changes
  useEffect(() => {
    if (!isOpen || type !== 'gold_loan' || manualInterestEdited) return;
    const amt = parseFloat(originalAmount);
    const rate = parseFloat(interestRate);
    const tenure = parseInt(tenureMonths, 10) || 12;
    if (!isNaN(amt) && amt > 0 && !isNaN(rate) && rate >= 0) {
      const years = Math.max(0.25, tenure / 12);
      const calcTotal = Math.round(amt * (rate / 100) * years);
      const calcQuarterly = Math.round((amt * (rate / 100)) / 4);
      setTotalInterest(String(calcTotal));
      setQuarterlyInterest(String(calcQuarterly));
      setMonthlyEmi(String(Math.round(calcQuarterly / 3)));
      if (!editLoanData) {
        setOutstandingPrincipal(String(amt));
      }
    }
  }, [isOpen, type, originalAmount, interestRate, tenureMonths, manualInterestEdited, editLoanData]);

  // Preview auto-calculated reminder dates
  const reminderPreview = useMemo(() => {
    const parsedDay = emiDueDate ? parseInt(emiDueDate.split('-')[2] || '1', 10) : emiDueDay;
    const previewLoan: Loan = {
      id: editLoanData?.id || 'preview-loan',
      name: name || 'Loan',
      type,
      owner,
      originalAmount: parseFloat(originalAmount) || 0,
      outstandingPrincipal: parseFloat(outstandingPrincipal) || parseFloat(originalAmount) || 0,
      monthlyEmi: parseFloat(monthlyEmi) || 0,
      interestRate: parseFloat(interestRate) || 0,
      startDate,
      emiDueDay: parsedDay || 1,
      emiDueDate,
      paymentFrequency,
      tenureMonths: parseInt(tenureMonths, 10) || 12,
      emisPaid: parseInt(emisPaid, 10) || 0,
      emisRemaining: 12,
      status: 'active',
    };
    const nextDue = getNextDueDateForLoan(previewLoan, editLoanData ? transactions : [], new Date());
    const remStart = getReminderWindowStart(nextDue);
    return {
      nextDueStr: formatDateDDMMYYYY(formatDateToISO(nextDue)),
      remStartStr: formatDateDDMMYYYY(formatDateToISO(remStart)),
    };
  }, [
    editLoanData,
    name,
    type,
    owner,
    originalAmount,
    outstandingPrincipal,
    monthlyEmi,
    interestRate,
    startDate,
    emiDueDay,
    emiDueDate,
    paymentFrequency,
    tenureMonths,
    emisPaid,
    transactions,
  ]);

  if (!isOpen) return null;

  const isGoldLoan = type === 'gold_loan' && !isCustomType;
  const inAppPaidForEdit = editLoanData
    ? Math.max(0, getLoanPaidAmount(editLoanData, transactions) - (editLoanData.initialPaidAmount || 0))
    : 0;

  const handleModeSwitch = (goldMode: boolean) => {
    setIsCustomType(false);
    if (goldMode) {
      setType('gold_loan');
      setPaymentFrequency('quarterly');
      if (!tenureMonths || tenureMonths === '240') setTenureMonths('12');
      if (!interestRate || interestRate === '8.5') setInterestRate('9.0');
      if (!lenderName || lenderName === 'HDFC Bank') setLenderName('SBI Gold Loan');
      setManualInterestEdited(false);
    } else {
      setType('home_loan');
      setPaymentFrequency('monthly');
      if (tenureMonths === '12') setTenureMonths('240');
      if (interestRate === '9.0') setInterestRate('8.5');
      if (lenderName === 'SBI Gold Loan') setLenderName('HDFC Bank');
    }
  };

  const handleEmiDateChange = (newDate: string) => {
    setEmiDueDate(newDate);
    const parts = newDate.split('-');
    if (parts.length === 3) {
      const dayNum = parseInt(parts[2], 10);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        setEmiDueDay(dayNum);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orig = parseFloat(originalAmount);
    const out = isGoldLoan
      ? parseFloat(outstandingPrincipal || originalAmount)
      : parseFloat(outstandingPrincipal);
    const rate = parseFloat(interestRate) || 0;
    const tenure = parseInt(tenureMonths, 10) || 12;
    const paid = parseInt(emisPaid, 10) || 0;

    if (isNaN(orig) || orig <= 0) {
      setError('Please enter a valid loan amount');
      return;
    }
    if (isNaN(out) || out < 0) {
      setError('Please enter a valid outstanding principal');
      return;
    }

    let finalMonthlyEmi = parseFloat(monthlyEmi);
    let finalTotalInterest = parseFloat(totalInterest);
    let finalQuarterlyInterest = parseFloat(quarterlyInterest);
    const finalInitialPaid = Math.max(0, parseFloat(initialPaidAmount) || 0);

    if (isGoldLoan) {
      if (isNaN(finalQuarterlyInterest) || finalQuarterlyInterest < 0) {
        finalQuarterlyInterest = Math.round((orig * (rate / 100)) / 4);
      }
      if (isNaN(finalTotalInterest) || finalTotalInterest < 0) {
        finalTotalInterest = Math.round(orig * (rate / 100) * Math.max(1, tenure / 12));
      }
      if (isNaN(finalMonthlyEmi) || finalMonthlyEmi <= 0) {
        finalMonthlyEmi = Math.max(1, Math.round(finalQuarterlyInterest / 3) || Math.round((orig * (rate / 100)) / 12));
      }
    } else {
      if (isNaN(finalMonthlyEmi) || finalMonthlyEmi <= 0) {
        setError('Please enter a valid monthly EMI amount');
        return;
      }
      if (isNaN(finalTotalInterest)) {
        finalTotalInterest = Math.max(0, Math.round(finalMonthlyEmi * tenure - orig));
      }
    }

    if (isNaN(tenure) || tenure <= 0) {
      setError('Please enter valid tenure months');
      return;
    }

    const remaining = Math.max(0, tenure - paid);
    const finalType = (isCustomType && customTypeInput.trim() ? 'other' : type) as LoanType;
    const derivedDueDay = emiDueDate ? parseInt(emiDueDate.split('-')[2] || String(emiDueDay), 10) || emiDueDay : emiDueDay;

    const payload: Omit<Loan, 'id'> = {
      name:
        isCustomType && customTypeInput.trim()
          ? `${name.trim()} (${customTypeInput.trim()})`
          : name.trim() || (isGoldLoan ? 'Gold Loan' : 'New Loan'),
      type: finalType,
      owner,
      originalAmount: orig,
      outstandingPrincipal: out,
      monthlyEmi: finalMonthlyEmi,
      interestRate: rate,
      startDate,
      emiDueDay: derivedDueDay,
      emiDueDate: emiDueDate || undefined,
      paymentFrequency,
      totalInterest: isNaN(finalTotalInterest) ? undefined : finalTotalInterest,
      quarterlyInterest: isGoldLoan && !isNaN(finalQuarterlyInterest) ? finalQuarterlyInterest : undefined,
      initialPaidAmount: isGoldLoan ? finalInitialPaid : undefined,
      tenureMonths: tenure,
      emisPaid: paid,
      emisRemaining: remaining,
      lenderName: lenderName.trim(),
      linkedAccountId: linkedAccountId || undefined,
      status: out <= 0 ? 'closed' : 'active',
    };

    if (editLoanData) {
      editLoan(editLoanData.id, payload);
      onClose(true, editLoanData.id);
    } else {
      const created = addLoan(payload);
      onClose(true, created.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12">
        <div
          className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Title and explicit Close button */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onClose()}
                className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                title="Close window"
              >
                <X className="w-5 h-5" />
              </button>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  isGoldLoan ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {isGoldLoan ? <Coins className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editLoanData
                    ? isGoldLoan
                      ? 'Edit Gold Loan'
                      : 'Edit Loan Account'
                    : isGoldLoan
                    ? 'Add Gold Loan'
                    : 'Add Loan / EMI'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isGoldLoan
                    ? 'Dedicated gold loan interest & EMI date reminders'
                    : 'Auto-calculates EMI schedule & phone reminders'}
                </p>
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

          {/* Regular Loan vs Gold Loan Setup Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => handleModeSwitch(false)}
              className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                !isGoldLoan
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Regular Loan / EMI</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch(true)}
              className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                isGoldLoan
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Gold Loan Setup</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Loan Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {isGoldLoan ? 'Gold Loan Name / Ornament *' : 'Loan Name *'}
              </label>
              <input
                type="text"
                required
                placeholder={isGoldLoan ? 'e.g. SBI Gold Loan - Chain & Bangles' : 'e.g. Prestige Apartment Home Loan'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Category & Owner */}
            <div className={`grid grid-cols-1 ${isGoldLoan ? '' : 'sm:grid-cols-2'} gap-3`}>
              {!isGoldLoan && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Loan Type *
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
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Loan Owner (Account ID) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Anson', 'Dona'] as const).map((o) => (
                    <button
                      type="button"
                      key={o}
                      onClick={() => setOwner(o)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        owner === o
                          ? o === 'Anson'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          owner === o ? 'bg-white' : o === 'Anson' ? 'bg-blue-600' : 'bg-emerald-600'
                        }`}
                      />
                      <span>{o}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isGoldLoan ? (
              /* DEDICATED GOLD LOAN FIELDS */
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    Gold Loan Interest &amp; Amount Setup
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    Auto-calculates interest
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Loan Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      required
                      placeholder="e.g. 200000"
                      value={originalAmount}
                      onChange={(e) => {
                        setOriginalAmount(e.target.value);
                        if (!editLoanData) setOutstandingPrincipal(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-extrabold text-slate-900 no-spinner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Interest Rate (% p.a.) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      required
                      placeholder="9.0"
                      value={interestRate}
                      onChange={(e) => {
                        setInterestRate(e.target.value);
                        setManualInterestEdited(false);
                      }}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-900 no-spinner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Total Interest (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      required
                      placeholder="0"
                      value={totalInterest}
                      onChange={(e) => {
                        setManualInterestEdited(true);
                        setTotalInterest(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-extrabold text-amber-900 no-spinner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Quarterly Interest (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      required
                      placeholder="0"
                      value={quarterlyInterest}
                      onChange={(e) => {
                        setManualInterestEdited(true);
                        setQuarterlyInterest(e.target.value);
                        const qVal = parseFloat(e.target.value);
                        if (!isNaN(qVal) && qVal > 0) {
                          setMonthlyEmi(String(Math.round(qVal / 3)));
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-extrabold text-amber-900 no-spinner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Paid Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder="0"
                      value={initialPaidAmount}
                      onChange={(e) => setInitialPaidAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-extrabold text-emerald-700 no-spinner"
                    />
                  </div>
                </div>

                {editLoanData && inAppPaidForEdit > 0 && (
                  <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                    + {formatINR(inAppPaidForEdit)} recorded via Pay EMI in app (Total Paid:{' '}
                    {formatINR((parseFloat(initialPaidAmount) || 0) + inAppPaidForEdit)})
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tenure (Months)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={tenureMonths}
                      onChange={(e) => {
                        setTenureMonths(e.target.value);
                        setManualInterestEdited(false);
                      }}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-800 no-spinner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Outstanding Principal (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={outstandingPrincipal}
                      onChange={(e) => setOutstandingPrincipal(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-900 no-spinner"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* REGULAR LOAN FIELDS */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Loan Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      required
                      placeholder="0"
                      value={originalAmount}
                      onChange={(e) => {
                        setOriginalAmount(e.target.value);
                        if (!editLoanData && !outstandingPrincipal) {
                          setOutstandingPrincipal(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 no-spinner"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 no-spinner"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 no-spinner"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 no-spinner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Total Tenure (Mo) *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      required
                      placeholder="240"
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 no-spinner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 no-spinner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>
              </>
            )}

            {/* EMI Date Picker & Payment Frequency (ALL Loan Types) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  EMI Due Date *
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={emiDueDate}
                    onChange={(e) => handleEmiDateChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Payment Schedule *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'monthly', label: 'Monthly' },
                      { id: 'quarterly', label: 'Quarterly' },
                      { id: 'yearly', label: 'Yearly' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentFrequency(opt.id)}
                      className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                        paymentFrequency === opt.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Auto-Calculated EMI Reminder Preview */}
            <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-xs flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-indigo-950">
                  Auto Reminder Active (All Accounts)
                </p>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  Next Due: <strong>{reminderPreview.nextDueStr}</strong> ({paymentFrequency}) · Reminders run{' '}
                  <strong>{reminderPreview.remStartStr}</strong> to <strong>{reminderPreview.nextDueStr}</strong> at{' '}
                  <strong>6:00 AM, 12:00 PM &amp; 10:00 PM</strong>.
                </p>
              </div>
            </div>

            {/* Lender & Linked Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Lender / Bank Name
                </label>
                <input
                  type="text"
                  placeholder="HDFC, SBI, Muthoot, etc."
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Linked Debit Account (All Accounts)
                </label>
                <select
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                >
                  <option value="">None / Manual</option>
                  {[...bankAccounts]
                    .sort((a, b) => (Boolean(b.isDefault) ? 1 : 0) - (Boolean(a.isDefault) ? 1 : 0))
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.isDefault ? '★ Default · ' : ''}{acc.bankName} - {acc.name} ({acc.owner})
                      </option>
                    ))}
                </select>
              </div>
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
                className={`flex-1 py-3 px-4 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 ${
                  isGoldLoan ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <Check className="w-4 h-4" />
                {editLoanData
                  ? isGoldLoan
                    ? 'Update Gold Loan'
                    : 'Update Loan'
                  : isGoldLoan
                  ? 'Save Gold Loan'
                  : 'Save Loan Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
