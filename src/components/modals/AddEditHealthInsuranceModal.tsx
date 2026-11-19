import React, { useEffect, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { HealthInsurancePolicy, PaymentFrequency } from '../../types/finance';
import { formatDateDDMMYYYY, formatINR, getTodayISO } from '../../utils/formatters';
import { formatDateToISO, getReminderWindowStart, parseLocalDateISO } from '../../utils/notifications';
import { Bell, Check, HeartPulse, IndianRupee, ShieldCheck, X } from 'lucide-react';

interface AddEditHealthInsuranceModalProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  editPolicy?: HealthInsurancePolicy | null;
}

export const AddEditHealthInsuranceModal: React.FC<AddEditHealthInsuranceModalProps> = ({
  isOpen,
  onClose,
  editPolicy,
}) => {
  const { bankAccounts, defaultBankAccount, addHealthInsurance, editHealthInsurance } = useFinance();

  const [policyName, setPolicyName] = useState<string>('');
  const [insurer, setInsurer] = useState<string>('');
  const [policyNumber, setPolicyNumber] = useState<string>('');
  const [owner, setOwner] = useState<'Family' | 'Anson' | 'Dona'>('Family');
  const [coveredMembers, setCoveredMembers] = useState<string>('Anson & Dona');
  const [sumInsured, setSumInsured] = useState<string>('');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('monthly');
  const [monthlyEmi, setMonthlyEmi] = useState<string>('');
  const [annualPremium, setAnnualPremium] = useState<string>('');
  const [emiDueDate, setEmiDueDate] = useState<string>(getTodayISO());
  const [startDate, setStartDate] = useState<string>(getTodayISO());
  const [renewalDate, setRenewalDate] = useState<string>('');
  const [linkedAccountId, setLinkedAccountId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'expired'>('active');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Exclude Joint savings accounts from payment selectors
  const spendingAccounts = bankAccounts
    .filter((a) => a.owner !== 'Joint')
    .sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)));

  useEffect(() => {
    if (!isOpen) return;
    if (editPolicy) {
      setPolicyName(editPolicy.policyName || '');
      setInsurer(editPolicy.insurer || '');
      setPolicyNumber(editPolicy.policyNumber || '');
      setOwner(editPolicy.owner || 'Family');
      setCoveredMembers(editPolicy.coveredMembers || 'Anson & Dona');
      setSumInsured(editPolicy.sumInsured ? String(editPolicy.sumInsured) : '');
      setPaymentFrequency(editPolicy.paymentFrequency || 'monthly');
      setMonthlyEmi(editPolicy.monthlyEmi ? String(editPolicy.monthlyEmi) : '');
      setAnnualPremium(editPolicy.annualPremium ? String(editPolicy.annualPremium) : '');
      setEmiDueDate(editPolicy.emiDueDate || getTodayISO());
      setStartDate(editPolicy.startDate || getTodayISO());
      setRenewalDate(editPolicy.renewalDate || '');
      setLinkedAccountId(editPolicy.linkedAccountId || defaultBankAccount?.id || '');
      setStatus(editPolicy.status || 'active');
      setNotes(editPolicy.notes || '');
      setError('');
    } else {
      const today = getTodayISO();
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setPolicyName('');
      setInsurer('');
      setPolicyNumber('');
      setOwner('Family');
      setCoveredMembers('Anson & Dona');
      setSumInsured('');
      setPaymentFrequency('monthly');
      setMonthlyEmi('');
      setAnnualPremium('');
      setEmiDueDate(today);
      setStartDate(today);
      setRenewalDate(formatDateToISO(nextYear));
      setLinkedAccountId(defaultBankAccount?.id || spendingAccounts[0]?.id || '');
      setStatus('active');
      setNotes('');
      setError('');
    }
  }, [editPolicy, isOpen, defaultBankAccount]);

  if (!isOpen) return null;

  const parsedMonthly = parseFloat(monthlyEmi) || 0;
  const computedAnnual =
    parseFloat(annualPremium) > 0
      ? parseFloat(annualPremium)
      : parsedMonthly > 0
      ? Math.round(parsedMonthly * 12)
      : 0;

  const parsedDueDt = parseLocalDateISO(emiDueDate);
  const reminderStartDt = parsedDueDt ? getReminderWindowStart(parsedDueDt) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!policyName.trim()) {
      setError('Please enter a health insurance policy name.');
      return;
    }
    if (!insurer.trim()) {
      setError('Please enter the insurance company / provider name.');
      return;
    }

    const numMonthly = parseFloat(monthlyEmi);
    if (isNaN(numMonthly) || numMonthly <= 0) {
      setError('Please enter a valid monthly EMI amount greater than 0.');
      return;
    }

    const numSumInsured = parseFloat(sumInsured) || 0;
    const numAnnual = parseFloat(annualPremium) || Math.round(numMonthly * 12);
    const dueDt = parseLocalDateISO(emiDueDate);
    const derivedDueDay = dueDt ? dueDt.getDate() : 1;

    const payload: Omit<HealthInsurancePolicy, 'id' | 'createdAt'> = {
      policyName: policyName.trim(),
      insurer: insurer.trim(),
      policyNumber: policyNumber.trim() || undefined,
      coveredMembers: coveredMembers.trim() || owner,
      sumInsured: numSumInsured,
      monthlyEmi: Math.round(numMonthly),
      annualPremium: Math.round(numAnnual),
      paymentFrequency,
      emiDueDay: derivedDueDay,
      emiDueDate: emiDueDate || undefined,
      startDate: startDate || getTodayISO(),
      renewalDate: renewalDate || undefined,
      owner,
      linkedAccountId: linkedAccountId || undefined,
      status,
      notes: notes.trim() || undefined,
    };

    if (editPolicy) {
      editHealthInsurance(editPolicy.id, payload);
    } else {
      addHealthInsurance(payload);
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
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {editPolicy ? 'Edit Health Insurance Policy' : 'Add Health Insurance EMI'}
                </h3>
                <p className="text-xs text-slate-500">
                  Set up monthly health insurance EMI &amp; automatic reminders
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
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
            {/* Policy Name & Insurer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Policy Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Family Health Optima"
                  value={policyName}
                  onChange={(e) => {
                    setPolicyName(e.target.value);
                    setError('');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Insurance Provider *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Star Health, HDFC ERGO"
                  value={insurer}
                  onChange={(e) => {
                    setInsurer(e.target.value);
                    setError('');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Owner & Covered Members */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Plan For
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Family', 'Anson', 'Dona'] as const).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        setOwner(o);
                        if (!editPolicy) {
                          setCoveredMembers(o === 'Family' ? 'Anson & Dona' : o);
                        }
                      }}
                      className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        owner === o
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Covered Members
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anson, Dona, Parents"
                  value={coveredMembers}
                  onChange={(e) => setCoveredMembers(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Payment Frequency */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                EMI Payment Schedule
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'monthly', label: 'Monthly EMI' },
                    { id: 'quarterly', label: 'Quarterly' },
                    { id: 'yearly', label: 'Yearly' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPaymentFrequency(item.id)}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      paymentFrequency === item.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly EMI & Sum Insured */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Monthly EMI Amount (₹) *
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    required
                    placeholder="e.g. 1850"
                    value={monthlyEmi}
                    onChange={(e) => {
                      setMonthlyEmi(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {parsedMonthly > 0 && (
                  <p className="text-[11px] text-teal-700 font-semibold mt-1">
                    Yearly est.: {formatINR(computedAnnual)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Sum Insured / Coverage (₹)
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="e.g. 1000000"
                    value={sumInsured}
                    onChange={(e) => setSumInsured(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* EMI Due Date & Auto Reminder Preview */}
            <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-teal-900 mb-1">
                    EMI Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={emiDueDate}
                    onChange={(e) => setEmiDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-teal-900 mb-1">
                    Annual Premium (Optional ₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder={parsedMonthly > 0 ? String(Math.round(parsedMonthly * 12)) : 'Auto calculated'}
                    value={annualPremium}
                    onChange={(e) => setAnnualPremium(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              {parsedDueDt && reminderStartDt && (
                <div className="flex items-start gap-2 text-[11px] text-teal-800 font-medium">
                  <Bell className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    Auto phone reminders from{' '}
                    <strong>{formatDateDDMMYYYY(formatDateToISO(reminderStartDt))}</strong> to{' '}
                    <strong>{formatDateDDMMYYYY(emiDueDate)}</strong> at 6:00 AM, 12:00 PM &amp; 10:00 PM.
                  </span>
                </div>
              )}
            </div>

            {/* Policy Number & Linked Bank Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Policy Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. P/181114/01/2025"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Default Bank Account
                </label>
                <select
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select when paying</option>
                  {spendingAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.isDefault ? '★ ' : ''}[{acc.owner}] {acc.bankName} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start Date, Renewal Date & Status */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Renewal Date
                </label>
                <input
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'expired')}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Notes / Hospital Cashless Details
              </label>
              <input
                type="text"
                placeholder="Agent contact, TPA number, or claim notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Buttons */}
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
                className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editPolicy ? 'Save Changes' : 'Save Health Policy'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
