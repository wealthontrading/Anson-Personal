import React, { useMemo, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { BorrowLendRecord, BorrowLendType } from '../../types/finance';
import { formatDateDDMMYYYY, formatINR, getTodayISO } from '../../utils/formatters';
import { parseLocalDateISO } from '../../utils/notifications';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  Edit2,
  HandCoins,
  IndianRupee,
  Phone,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface BorrowLendViewProps {
  onOpenAddRecord: (type: BorrowLendType) => void;
  onEditRecord: (record: BorrowLendRecord) => void;
}

type FilterTab = 'all' | 'lend' | 'borrow' | 'settled';

export const BorrowLendView: React.FC<BorrowLendViewProps> = ({
  onOpenAddRecord,
  onEditRecord,
}) => {
  const {
    currentUser,
    borrowLendRecords,
    bankAccounts,
    defaultBankAccount,
    deleteBorrowLendRecord,
    recordBorrowLendRepayment,
  } = useFinance();

  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [personFilter, setPersonFilter] = useState<'All' | 'Anson' | 'Dona'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<BorrowLendRecord | null>(null);

  // Repayment Modal State
  const [repayRecord, setRepayRecord] = useState<BorrowLendRecord | null>(null);
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [repayDate, setRepayDate] = useState<string>(getTodayISO());
  const [repayNotes, setRepayNotes] = useState<string>('');
  const [repayRecordInAccounts, setRepayRecordInAccounts] = useState<boolean>(false);
  const [repayMethod, setRepayMethod] = useState<'bank' | 'cash'>('bank');
  const [repayAccountId, setRepayAccountId] = useState<string>('');
  const [repayError, setRepayError] = useState<string>('');

  const spendingAccounts = useMemo(
    () =>
      bankAccounts
        .filter((a) => a.owner !== 'Joint')
        .sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))),
    [bankAccounts]
  );

  const summary = useMemo(() => {
    let toReceive = 0;
    let lendPeople = 0;
    let toPay = 0;
    let borrowPeople = 0;
    let settledCount = 0;

    borrowLendRecords.forEach((rec) => {
      if (personFilter !== 'All' && rec.handledBy !== personFilter) return;
      const remaining = Math.max(0, rec.amount - (rec.paidAmount || 0));
      if (rec.status === 'settled' || remaining === 0) {
        settledCount += 1;
      } else if (rec.type === 'lend') {
        toReceive += remaining;
        lendPeople += 1;
      } else {
        toPay += remaining;
        borrowPeople += 1;
      }
    });

    return {
      toReceive,
      lendPeople,
      toPay,
      borrowPeople,
      netPosition: toReceive - toPay,
      settledCount,
    };
  }, [borrowLendRecords, personFilter]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return borrowLendRecords
      .filter((rec) => {
        if (personFilter !== 'All' && rec.handledBy !== personFilter) return false;
        const remaining = Math.max(0, rec.amount - (rec.paidAmount || 0));
        const isSettled = rec.status === 'settled' || remaining === 0;

        if (filterTab === 'lend') return rec.type === 'lend' && !isSettled;
        if (filterTab === 'borrow') return rec.type === 'borrow' && !isSettled;
        if (filterTab === 'settled') return isSettled;
        return true;
      })
      .filter((rec) => {
        if (!q) return true;
        return (
          rec.personName.toLowerCase().includes(q) ||
          (rec.notes || '').toLowerCase().includes(q) ||
          (rec.phone || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aSettled = a.status === 'settled' ? 1 : 0;
        const bSettled = b.status === 'settled' ? 1 : 0;
        if (aSettled !== bSettled) return aSettled - bSettled;
        return (b.date || '').localeCompare(a.date || '');
      });
  }, [borrowLendRecords, filterTab, personFilter, searchQuery]);

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const openRepayModal = (rec: BorrowLendRecord) => {
    const remaining = Math.max(0, rec.amount - (rec.paidAmount || 0));
    setRepayRecord(rec);
    setRepayAmount(String(remaining));
    setRepayDate(getTodayISO());
    setRepayNotes('');
    setRepayRecordInAccounts(false);
    setRepayMethod(spendingAccounts.length > 0 ? 'bank' : 'cash');
    setRepayAccountId(defaultBankAccount?.id || spendingAccounts[0]?.id || '');
    setRepayError('');
  };

  const handleConfirmRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayRecord) return;
    const remaining = Math.max(0, repayRecord.amount - (repayRecord.paidAmount || 0));
    const numAmt = parseFloat(repayAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setRepayError('Please enter a valid amount greater than 0.');
      return;
    }
    if (numAmt > remaining) {
      setRepayError(`Amount cannot exceed the remaining balance (${formatINR(remaining)}).`);
      return;
    }
    if (repayRecordInAccounts && repayMethod === 'bank' && !repayAccountId) {
      setRepayError('Please select a bank account or switch to Cash.');
      return;
    }

    recordBorrowLendRepayment({
      recordId: repayRecord.id,
      amount: Math.round(numAmt),
      date: repayDate,
      recordedBy: currentUser,
      notes: repayNotes.trim(),
      recordInAccounts: repayRecordInAccounts,
      paymentMethod: repayMethod,
      accountId: repayMethod === 'bank' ? repayAccountId : undefined,
    });

    setRepayRecord(null);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-slate-900" />
            <span>Borrow &amp; Lend Money</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track money lent to others (to receive) and money borrowed (to pay back)
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAddRecord('lend')}
            className="min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Lend Money</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAddRecord('borrow')}
            className="min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Borrow Money</span>
          </button>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 sm:p-5">
          <p className="text-xs font-semibold text-emerald-700">Lending · To Receive</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1 tabular-nums">
            {formatINR(summary.toReceive)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Pending from <strong>{summary.lendPeople}</strong>{' '}
            {summary.lendPeople === 1 ? 'person' : 'people'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200/80 p-4 sm:p-5">
          <p className="text-xs font-semibold text-rose-700">Borrowing · To Pay Back</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1 tabular-nums">
            {formatINR(summary.toPay)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Pending to <strong>{summary.borrowPeople}</strong>{' '}
            {summary.borrowPeople === 1 ? 'person' : 'people'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">Net Position</p>
          <p
            className={`text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums ${
              summary.netPosition >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {summary.netPosition > 0 ? '+' : ''}
            {formatINR(summary.netPosition)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {summary.netPosition >= 0
              ? 'More to receive than pay back'
              : 'More to pay back than receive'}{' '}
            · {summary.settledCount} settled
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Filter Tabs */}
          <div className="grid grid-cols-2 sm:inline-flex p-1 bg-slate-100 rounded-xl gap-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'lend', label: `Lending (${summary.lendPeople})` },
                { id: 'borrow', label: `Borrowing (${summary.borrowPeople})` },
                { id: 'settled', label: `Settled (${summary.settledCount})` },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  filterTab === t.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search person or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Person filter */}
            <select
              aria-label="Filter by member"
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value as 'All' | 'Anson' | 'Dona')}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="All">Both</option>
              <option value="Anson">Anson</option>
              <option value="Dona">Dona</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <HandCoins className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            {borrowLendRecords.length === 0
              ? 'No Borrowing or Lending Records Yet'
              : 'No Matching Records Found'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 mb-5">
            Keep track of money you lend to friends/relatives or borrow from others, record partial repayments, and get due-date reminders.
          </p>
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenAddRecord('lend')}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Add Lending Entry</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAddRecord('borrow')}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Add Borrowing Entry</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecords.map((rec) => {
            const isLend = rec.type === 'lend';
            const remaining = Math.max(0, rec.amount - (rec.paidAmount || 0));
            const isSettled = rec.status === 'settled' || remaining === 0;
            const progressPct =
              rec.amount > 0 ? Math.min(100, Math.round(((rec.paidAmount || 0) / rec.amount) * 100)) : 0;

            const dueDt = parseLocalDateISO(rec.dueDate);
            const diffDays = dueDt
              ? Math.round(
                  (new Date(dueDt.getFullYear(), dueDt.getMonth(), dueDt.getDate()).getTime() -
                    todayMidnight.getTime()) /
                    86400000
                )
              : null;

            return (
              <div
                key={rec.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 ${
                  isSettled
                    ? 'border-slate-200/80 opacity-85'
                    : isLend
                    ? 'border-emerald-200/80'
                    : 'border-rose-200/80'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 mb-1">
                        <span
                          className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg inline-flex items-center gap-1 ${
                            isLend
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/70'
                          }`}
                        >
                          {isLend ? (
                            <>
                              <ArrowUpRight className="w-3 h-3" /> LENT · To Receive
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft className="w-3 h-3" /> BORROWED · To Pay
                            </>
                          )}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                          {rec.handledBy}
                        </span>
                        {isSettled && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Settled
                          </span>
                        )}
                        {!isSettled && diffDays !== null && diffDays <= 2 && (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                              diffDays < 0
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {diffDays < 0
                              ? `Overdue ${Math.abs(diffDays)}d`
                              : diffDays === 0
                              ? 'Due Today'
                              : `Due in ${diffDays}d`}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 truncate">
                        {rec.personName}
                      </h3>

                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {isLend ? 'Given' : 'Taken'}: {formatDateDDMMYYYY(rec.date)}
                        </span>
                        {rec.phone && (
                          <a
                            href={`tel:${rec.phone}`}
                            className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {rec.phone}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditRecord(rec)}
                        aria-label="Edit record"
                        className="min-w-[36px] min-h-[36px] rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(rec)}
                        aria-label="Delete record"
                        className="min-w-[36px] min-h-[36px] rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts & Progress */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 tabular-nums">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500">Total</p>
                        <p className="text-sm font-extrabold text-slate-900">{formatINR(rec.amount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500">
                          {isLend ? 'Received' : 'Repaid'}
                        </p>
                        <p className="text-sm font-extrabold text-emerald-700">
                          {formatINR(rec.paidAmount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500">Balance</p>
                        <p
                          className={`text-sm font-extrabold ${
                            isSettled ? 'text-slate-400' : isLend ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {formatINR(remaining)}
                        </p>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isSettled ? 'bg-emerald-500' : isLend ? 'bg-emerald-600' : 'bg-rose-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Due date & Notes */}
                  <div className="space-y-1 text-xs text-slate-600">
                    {rec.dueDate && (
                      <p>
                        {isLend ? 'Expected return' : 'Repayment due'}:{' '}
                        <strong className="text-slate-900">{formatDateDDMMYYYY(rec.dueDate)}</strong>
                      </p>
                    )}
                    {rec.notes && <p className="text-slate-500 italic">{rec.notes}</p>}
                  </div>

                  {/* Recent Partial Repayment Log */}
                  {rec.payments && rec.payments.length > 0 && (
                    <div className="border-t border-slate-100 pt-2 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Repayment History
                      </p>
                      {rec.payments.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-[11px] text-slate-600 tabular-nums"
                        >
                          <span className="truncate">
                            {formatDateDDMMYYYY(p.date)} · {p.recordedBy}
                            {p.notes ? ` (${p.notes})` : ''}
                          </span>
                          <span className="font-bold text-emerald-700 shrink-0 ml-2">
                            {formatINR(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Button */}
                {!isSettled && (
                  <button
                    type="button"
                    onClick={() => openRepayModal(rec)}
                    className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer ${
                      isLend
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isLend ? 'Record Return / Settle' : 'Record Repayment / Settle'} ({formatINR(remaining)})
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Record Repayment / Return Modal */}
      {repayRecord && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setRepayRecord(null)}
        >
          <div className="min-h-full flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12">
            <div
              className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {repayRecord.type === 'lend' ? 'Record Money Returned' : 'Record Repayment Paid'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {repayRecord.personName} · Pending:{' '}
                    {formatINR(Math.max(0, repayRecord.amount - (repayRecord.paidAmount || 0)))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRepayRecord(null)}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {repayError && (
                <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                  {repayError}
                </div>
              )}

              <form onSubmit={handleConfirmRepay} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      required
                      value={repayAmount}
                      onChange={(e) => {
                        setRepayAmount(e.target.value);
                        setRepayError('');
                      }}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={repayDate}
                      onChange={(e) => setRepayDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GPay / Cash"
                      value={repayNotes}
                      onChange={(e) => setRepayNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Optional Bank/Cash Balance Sync */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={repayRecordInAccounts}
                      onChange={(e) => setRepayRecordInAccounts(e.target.checked)}
                      className="w-4 h-4 accent-slate-900 mt-0.5"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-800">
                        Also update Bank / Cash balance
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {repayRecord.type === 'lend'
                          ? 'Adds returned money to your Bank or Cash wallet.'
                          : 'Deducts repayment from your Bank or Cash wallet.'}
                      </span>
                    </div>
                  </label>

                  {repayRecordInAccounts && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRepayMethod('bank')}
                          className={`py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                            repayMethod === 'bank'
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          Bank Account
                        </button>
                        <button
                          type="button"
                          onClick={() => setRepayMethod('cash')}
                          className={`py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                            repayMethod === 'cash'
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          Cash ({currentUser})
                        </button>
                      </div>
                      {repayMethod === 'bank' && spendingAccounts.length > 0 && (
                        <select
                          value={repayAccountId}
                          onChange={(e) => setRepayAccountId(e.target.value)}
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

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setRepayRecord(null)}
                    className="w-1/3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Payment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Yes/No Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-slate-900">Delete Entry?</h3>
            <p className="text-xs text-slate-600 mt-1.5">
              Are you sure you want to delete the {deleteTarget.type === 'lend' ? 'lending' : 'borrowing'} record for{' '}
              <strong>{deleteTarget.personName}</strong> ({formatINR(deleteTarget.amount)})?
            </p>
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[44px] py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                No, Keep It
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBorrowLendRecord(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="min-h-[44px] py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
