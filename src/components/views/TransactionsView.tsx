import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Person, Transaction, TransactionType } from '../../types/finance';
import {
  formatDateDDMMYYYY,
  formatINR,
  getCategoryColor,
  CATEGORY_DETAILS,
  INCOME_SOURCE_DETAILS,
} from '../../utils/formatters';
import {
  Search,
  SlidersHorizontal,
  Download,
  Trash2,
  Edit2,
  Image,
  X,
  IndianRupee,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface TransactionsViewProps {
  onEditTransaction: (tx: Transaction) => void;
  onViewReceipt: (imgUrl: string, title: string) => void;
  onOpenQuickAction: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onEditTransaction,
  onViewReceipt,
  onOpenQuickAction,
}) => {
  const {
    transactions,
    deleteTransaction,
    clearAllTransactions,
    bankAccounts,
    categoryColors,
    exportTransactionsCSV,
  } = useFinance();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [personFilter, setPersonFilter] = useState<'all' | Person>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [deleteTargetTx, setDeleteTargetTx] = useState<Transaction | null>(null);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = tx.title.toLowerCase().includes(query);
        const matchNotes = (tx.notes || '').toLowerCase().includes(query);
        const matchCategory = (tx.category || '').toLowerCase().includes(query);
        if (!matchTitle && !matchNotes && !matchCategory) return false;
      }
      if (personFilter !== 'all' && tx.person !== personFilter) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
      if (accountFilter !== 'all') {
        if (accountFilter === 'cash') {
          if (tx.paymentMethod !== 'cash') return false;
        } else {
          const matchAccount = tx.fromAccountId === accountFilter || tx.toAccountId === accountFilter;
          if (!matchAccount) return false;
        }
      }
      if (dateFilter === 'this_month') {
        const now = new Date();
        const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!tx.date.startsWith(thisMonthStr)) return false;
      }
      return true;
    });
  }, [transactions, searchTerm, personFilter, typeFilter, categoryFilter, accountFilter, dateFilter]);

  const hasActiveFilters =
    searchTerm !== '' ||
    personFilter !== 'all' ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    accountFilter !== 'all' ||
    dateFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setPersonFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setAccountFilter('all');
    setDateFilter('all');
  };

  const handleConfirmDelete = (tx: Transaction) => {
    deleteTransaction(tx.id);
    setDeleteTargetTx(null);
  };

  const getAccountLabel = (tx: Transaction) => {
    if (tx.paymentMethod === 'cash') {
      return `Cash (${tx.person})`;
    }
    const accId = tx.fromAccountId || tx.toAccountId;
    if (accId) {
      const acc = bankAccounts.find((a) => a.id === accId);
      return acc ? acc.bankName : 'Bank';
    }
    return 'Bank';
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Transaction History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'record' : 'records'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportTransactionsCSV(filteredTransactions)}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {transactions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirmModal(true)}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenQuickAction}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setShowClearConfirmModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Clear All Transactions?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-5 leading-relaxed">
              This removes all income, expense, and transfer entries. Your bank accounts and loans stay safe.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="min-h-[44px] py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingAll}
                onClick={async () => {
                  setIsClearingAll(true);
                  await clearAllTransactions();
                  setIsClearingAll(false);
                  setShowClearConfirmModal(false);
                }}
                className="min-h-[44px] py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isClearingAll ? 'Clearing...' : 'Remove All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Quick Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, category or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              showFilters
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Fast Horizontal Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { label: 'All', active: typeFilter === 'all' && personFilter === 'all', onClick: () => { setTypeFilter('all'); setPersonFilter('all'); } },
            { label: 'Expenses', active: typeFilter === 'expense', onClick: () => setTypeFilter(typeFilter === 'expense' ? 'all' : 'expense') },
            { label: 'Income', active: typeFilter === 'income', onClick: () => setTypeFilter(typeFilter === 'income' ? 'all' : 'income') },
            { label: 'EMIs', active: typeFilter === 'emi_payment', onClick: () => setTypeFilter(typeFilter === 'emi_payment' ? 'all' : 'emi_payment') },
            { label: 'Transfers', active: typeFilter === 'transfer', onClick: () => setTypeFilter(typeFilter === 'transfer' ? 'all' : 'transfer') },
            { label: 'Anson', active: personFilter === 'Anson', onClick: () => setPersonFilter(personFilter === 'Anson' ? 'all' : 'Anson') },
            { label: 'Dona', active: personFilter === 'Dona', onClick: () => setPersonFilter(personFilter === 'Dona' ? 'all' : 'Dona') },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                btn.active
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Expandable Extra Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_DETAILS[c as keyof typeof CATEGORY_DETAILS]?.label || c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Account</label>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              >
                <option value="all">All Accounts</option>
                <option value="cash">Cash in Hand</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Period</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              >
                <option value="all">All Time</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-500">
              Showing <strong>{filteredTransactions.length}</strong> results
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Transactions List & Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <IndianRupee className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {transactions.length === 0
                ? 'Tap Add above to record your first income or expense.'
                : 'Try changing your search or clearing filters.'}
            </p>
            {transactions.length === 0 ? (
              <button
                type="button"
                onClick={onOpenQuickAction}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Entry</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Mobile Tap List */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';
                const categoryLabel =
                  CATEGORY_DETAILS[tx.category as keyof typeof CATEGORY_DETAILS]?.label ||
                  INCOME_SOURCE_DETAILS[tx.category as keyof typeof INCOME_SOURCE_DETAILS]?.label ||
                  tx.category ||
                  tx.type.replace('_', ' ');

                return (
                  <div key={tx.id} className="p-3.5 hover:bg-slate-50/70 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: isIncome
                                ? '#10b981'
                                : isTransfer
                                ? '#3b82f6'
                                : getCategoryColor(tx.category, categoryColors),
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {tx.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {formatDateDDMMYYYY(tx.date)} · {categoryLabel} · {tx.person}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-extrabold tabular-nums ${
                            isIncome
                              ? 'text-emerald-600'
                              : isTransfer
                              ? 'text-blue-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {isIncome ? `+${formatINR(tx.amount)}` : formatINR(tx.amount)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {getAccountLabel(tx)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100/80">
                      <span className="text-xs text-slate-400 truncate max-w-[180px]">
                        {tx.notes || ''}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {tx.receiptImage && (
                          <button
                            type="button"
                            onClick={() => onViewReceipt(tx.receiptImage!, tx.title)}
                            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <Image className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          aria-label="Edit transaction"
                          className="min-w-[36px] min-h-[36px] px-2.5 rounded-lg text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetTx(tx)}
                          aria-label="Delete transaction"
                          className="min-w-[36px] min-h-[36px] px-2.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Person</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    const isTransfer = tx.type === 'transfer';
                    const categoryLabel =
                      CATEGORY_DETAILS[tx.category as keyof typeof CATEGORY_DETAILS]?.label ||
                      INCOME_SOURCE_DETAILS[tx.category as keyof typeof INCOME_SOURCE_DETAILS]?.label ||
                      tx.category ||
                      tx.type.replace('_', ' ');

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 tabular-nums">
                          {formatDateDDMMYYYY(tx.date)}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 truncate">{tx.title}</div>
                          {tx.notes && <div className="text-[11px] text-slate-400 truncate">{tx.notes}</div>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-slate-700">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getCategoryColor(tx.category, categoryColors) }}
                            />
                            <span className="truncate max-w-[140px]">{categoryLabel}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-semibold">
                          {tx.person}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {getAccountLabel(tx)}
                        </td>
                        <td
                          className={`py-3 px-4 whitespace-nowrap text-right font-extrabold tabular-nums ${
                            isIncome
                              ? 'text-emerald-600'
                              : isTransfer
                              ? 'text-blue-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {isIncome ? `+${formatINR(tx.amount)}` : formatINR(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {tx.receiptImage && (
                              <button
                                type="button"
                                onClick={() => onViewReceipt(tx.receiptImage!, tx.title)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                                title="View Receipt"
                              >
                                <Image className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTargetTx(tx)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        transaction={deleteTargetTx}
        onCancelNo={() => setDeleteTargetTx(null)}
        onConfirmYes={handleConfirmDelete}
      />
    </div>
  );
};
