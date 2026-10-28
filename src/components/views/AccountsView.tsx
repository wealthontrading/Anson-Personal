import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { BankAccount, Person } from '../../types/finance';
import { formatINR, formatDateDDMMYYYY } from '../../utils/formatters';
import {
  Building2,
  Wallet,
  Plus,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface AccountsViewProps {
  onOpenAddAccount: () => void;
  onEditAccount: (account: BankAccount) => void;
  onOpenTransfer: () => void;
  onOpenQuickIncome: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  onOpenAddAccount,
  onEditAccount,
  onOpenTransfer,
  onOpenQuickIncome,
}) => {
  const {
    bankAccounts,
    cashWallets,
    deleteBankAccount,
    transactions,
    currentSummary,
  } = useFinance();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Group bank accounts by owner
  const ansonAccounts = bankAccounts.filter((a) => a.owner === 'Anson');
  const donaAccounts = bankAccounts.filter((a) => a.owner === 'Dona');
  const jointAccounts = bankAccounts.filter((a) => a.owner === 'Joint');

  const ansonCash = cashWallets.find((w) => w.owner === 'Anson')?.balance || 0;
  const donaCash = cashWallets.find((w) => w.owner === 'Dona')?.balance || 0;

  // Selected account transactions
  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId);
  const accountTransactions = selectedAccountId
    ? transactions.filter(
        (tx) => tx.fromAccountId === selectedAccountId || tx.toAccountId === selectedAccountId
      )
    : [];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Bank Accounts & Cash Wallets
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage personal and joint bank accounts and physical cash in hand
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTransfer}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer Funds</span>
          </button>
          <button
            onClick={onOpenAddAccount}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Bank Account</span>
          </button>
        </div>
      </div>

      {/* Cash In Hand Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Physical Cash In Hand
          </h3>
          <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200/60">
            Total Cash: {formatINR(ansonCash + donaCash)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Anson Cash */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Anson's Cash Wallet</h4>
                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                    Personal
                  </span>
                </div>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {formatINR(ansonCash)}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenTransfer}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Withdraw / Deposit
            </button>
          </div>

          {/* Dona Cash */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Dona's Cash Wallet</h4>
                  <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                    Personal
                  </span>
                </div>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {formatINR(donaCash)}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenTransfer}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Withdraw / Deposit
            </button>
          </div>
        </div>
      </div>

      {/* Bank Accounts Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Bank Accounts ({bankAccounts.length})
          </h3>
          <span className="text-xs font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/60">
            Total Bank Balance: {formatINR(bankAccounts.reduce((s, a) => s + a.currentBalance, 0))}
          </span>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">No Bank Accounts Added Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Add your personal or joint bank accounts (e.g. SBI, HDFC, ICICI, Federal Bank) to track balances and transactions.
            </p>
            <button
              type="button"
              onClick={onOpenAddAccount}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Your First Bank Account</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => {
            const isAnson = acc.owner === 'Anson';
            const isDona = acc.owner === 'Dona';
            const isJoint = acc.owner === 'Joint';
            const isSelected = selectedAccountId === acc.id;

            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccountId(isSelected ? null : acc.id)}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Top Bar of card */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{acc.bankName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {acc.accountNumberMasked || '•••• Bank A/C'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                      isAnson
                        ? 'bg-blue-50 text-blue-700'
                        : isDona
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {acc.owner}
                  </span>
                </div>

                <div className="my-3">
                  <p className="text-[11px] font-medium text-slate-500">{acc.name}</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    {formatINR(acc.currentBalance)}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {isSelected ? 'Click to hide ledger' : 'Click to view ledger'}
                  </span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEditAccount(acc)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Account"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {bankAccounts.length > 1 && (
                      <button
                        onClick={() => deleteBankAccount(acc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Selected Account Transaction History Modal/Card */}
      {selectedAccount && (
        <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ledger for {selectedAccount.bankName} - {selectedAccount.name}
              </h3>
              <p className="text-xs text-slate-500">
                {accountTransactions.length} transactions associated with this account
              </p>
            </div>
            <button
              onClick={() => setSelectedAccountId(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              Close Ledger
            </button>
          </div>

          {accountTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No transactions linked directly to this account yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {accountTransactions.map((tx) => {
                const isIncoming = tx.toAccountId === selectedAccount.id;
                return (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{tx.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDateDDMMYYYY(tx.date)} • By {tx.person}
                      </p>
                    </div>
                    <span
                      className={`font-black ${
                        isIncoming ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatINR(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
