import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Person, Transaction, TransactionType } from '../../types/finance';
import {
  formatDateDDMMYYYY,
  formatINR,
  CATEGORY_DETAILS,
  INCOME_SOURCE_DETAILS,
} from '../../utils/formatters';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Image,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Landmark,
  X,
  FileSpreadsheet,
} from 'lucide-react';

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
    bankAccounts,
    exportTransactionsCSV,
  } = useFinance();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [personFilter, setPersonFilter] = useState<'all' | Person>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // all, this_month, last_month, custom
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Available unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = tx.title.toLowerCase().includes(query);
        const matchNotes = (tx.notes || '').toLowerCase().includes(query);
        const matchCategory = (tx.category || '').toLowerCase().includes(query);
        if (!matchTitle && !matchNotes && !matchCategory) return false;
      }

      // 2. Person filter
      if (personFilter !== 'all' && tx.person !== personFilter) {
        return false;
      }

      // 3. Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // 4. Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false;
      }

      // 5. Account filter
      if (accountFilter !== 'all') {
        if (accountFilter === 'cash') {
          if (tx.paymentMethod !== 'cash') return false;
        } else {
          const matchAccount = tx.fromAccountId === accountFilter || tx.toAccountId === accountFilter;
          if (!matchAccount) return false;
        }
      }

      // 6. Date filter
      if (dateFilter === 'this_month') {
        const now = new Date();
        const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!tx.date.startsWith(thisMonthStr)) return false;
      }

      return true;
    });
  }, [
    transactions,
    searchTerm,
    personFilter,
    typeFilter,
    categoryFilter,
    accountFilter,
    dateFilter,
  ]);

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    setDeleteConfirmId(null);
  };

  const getAccountLabel = (tx: Transaction) => {
    if (tx.paymentMethod === 'cash') {
      return `Cash in Hand (${tx.person})`;
    }
    const accId = tx.fromAccountId || tx.toAccountId;
    if (accId) {
      const acc = bankAccounts.find((a) => a.id === accId);
      return acc ? `${acc.bankName} (${acc.name})` : 'Bank A/C';
    }
    return 'Bank Account';
  };

  return (
    <div className="space-y-5 pb-12">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Transaction History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete records of family income, expenses, EMIs, and transfers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTransactionsCSV(filteredTransactions)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV / Excel</span>
          </button>
          <button
            onClick={onOpenQuickAction}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            + Add New
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, category, notes, or merchant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          {/* Person Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Person
            </label>
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
            >
              <option value="all">All (Family)</option>
              <option value="Anson">Anson Only</option>
              <option value="Dona">Dona Only</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="emi_payment">EMI Payment</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_DETAILS[c as keyof typeof CATEGORY_DETAILS]?.label || c}
                </option>
              ))}
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Account / Method
            </label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
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

          {/* Date Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Period
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>

        {/* Results indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <span>
            Showing <strong>{filteredTransactions.length}</strong> transactions
          </span>
          {(searchTerm || personFilter !== 'all' || typeFilter !== 'all' || categoryFilter !== 'all' || accountFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPersonFilter('all');
                setTypeFilter('all');
                setCategoryFilter('all');
                setAccountFilter('all');
                setDateFilter('all');
              }}
              className="text-blue-600 font-bold hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No transactions match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Person</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Account / Mode</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isEmi = tx.type === 'emi_payment';
                  const isTransfer = tx.type === 'transfer';
                  const isExpense = tx.type === 'expense';

                  const categoryLabel =
                    CATEGORY_DETAILS[tx.category as keyof typeof CATEGORY_DETAILS]?.label ||
                    INCOME_SOURCE_DETAILS[tx.category as keyof typeof INCOME_SOURCE_DETAILS]?.label ||
                    tx.category ||
                    '-';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Date (DD-MM-YYYY) */}
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-700">
                        {formatDateDDMMYYYY(tx.date)}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700'
                              : isExpense
                              ? 'bg-rose-50 text-rose-700'
                              : isEmi
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          <span className="capitalize">{tx.type.replace('_', ' ')}</span>
                        </span>
                      </td>

                      {/* Title & Notes */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">
                          {tx.title}
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-slate-400 truncate">
                            {tx.notes}
                          </div>
                        )}
                      </td>

                      {/* Person */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            tx.person === 'Anson'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {tx.person}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {categoryLabel}
                      </td>

                      {/* Account / Mode */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {getAccountLabel(tx)}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 whitespace-nowrap text-right font-black">
                        <span
                          className={
                            isIncome
                              ? 'text-emerald-600'
                              : isTransfer
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }
                        >
                          {formatINR(tx.amount)}
                        </span>
                      </td>

                      {/* Receipt */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {tx.receiptImage ? (
                          <button
                            onClick={() => onViewReceipt(tx.receiptImage!, tx.title)}
                            className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition inline-flex items-center gap-1 text-[10px] font-bold"
                            title="View receipt"
                          >
                            <Image className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {deleteConfirmId === tx.id ? (
                          <div className="inline-flex items-center gap-1.5 animate-in fade-in">
                            <span className="text-[10px] text-rose-600 font-bold">Delete?</span>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {tx.type === 'expense' && (
                              <button
                                onClick={() => onEditTransaction(tx)}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteConfirmId(tx.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
