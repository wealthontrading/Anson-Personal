import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { BankAccount } from '../../types/finance';
import { formatINR, formatDateDDMMYYYY } from '../../utils/formatters';
import {
  Building2,
  Wallet,
  Plus,
  ArrowLeftRight,
  Edit2,
  Trash2,
  IndianRupee,
  Star,
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
}) => {
  const {
    bankAccounts,
    cashWallets,
    deleteBankAccount,
    setDefaultBankAccount,
    transactions,
  } = useFinance();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const ansonCash = cashWallets.find((w) => w.owner === 'Anson')?.balance || 0;
  const donaCash = cashWallets.find((w) => w.owner === 'Dona')?.balance || 0;
  const totalBank = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const totalCash = ansonCash + donaCash;

  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId);
  const accountTransactions = selectedAccountId
    ? transactions.filter(
        (tx) => tx.fromAccountId === selectedAccountId || tx.toAccountId === selectedAccountId
      )
    : [];

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Bank &amp; Cash Accounts
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 tabular-nums">
            Total Balance: <strong className="text-slate-900">{formatINR(totalBank + totalCash)}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTransfer}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            <span>Transfer</span>
          </button>
          <button
            type="button"
            onClick={onOpenAddAccount}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Bank</span>
          </button>
        </div>
      </div>

      {/* Bank Accounts Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Bank Accounts ({bankAccounts.length})
          </h3>
          <span className="text-xs font-bold text-slate-600 tabular-nums">
            {formatINR(totalBank)}
          </span>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-7 text-center">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">No Bank Accounts Yet</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
              Add your bank accounts for Anson, Dona, or Joint to track balances cleanly.
            </p>
            <button
              type="button"
              onClick={onOpenAddAccount}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Bank Account</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bankAccounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(isSelected ? null : acc.id)}
                  className={`bg-white rounded-2xl border p-4 transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/15'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{acc.bankName}</h4>
                          {acc.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold shrink-0">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {acc.name} · {acc.owner}
                          {acc.accountNumberMasked ? ` · ${acc.accountNumberMasked}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums mb-3">
                    {formatINR(acc.currentBalance)}
                  </p>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    {!acc.isDefault ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultBankAccount(acc.id);
                        }}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Star className="w-3 h-3" />
                        <span>Set Default</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 font-medium">
                        {isSelected ? 'Hide ledger' : 'Tap for ledger'}
                      </span>
                    )}

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onEditAccount(acc)}
                        aria-label="Edit account"
                        className="min-w-[36px] min-h-[36px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center justify-center transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {deletingId === acc.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              deleteBankAccount(acc.id);
                              setDeletingId(null);
                            }}
                            className="min-h-[34px] px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="min-h-[34px] px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(acc.id)}
                          aria-label="Delete account"
                          className="min-w-[36px] min-h-[36px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Selected Account Ledger */}
      {selectedAccount && (
        <section className="bg-white rounded-2xl border border-blue-200 p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {selectedAccount.bankName} — {selectedAccount.name}
              </h3>
              <p className="text-xs text-slate-500">
                {accountTransactions.length} transactions
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAccountId(null)}
              className="min-h-[36px] px-3 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>
          </div>

          {accountTransactions.length === 0 ? (
            <p className="py-6 text-center text-slate-400 text-xs">
              No transactions for this account yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {accountTransactions.map((tx) => {
                const isIncoming = tx.toAccountId === selectedAccount.id;
                return (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isIncoming ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{tx.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatDateDDMMYYYY(tx.date)} · {tx.person}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-extrabold tabular-nums shrink-0 ${
                        isIncoming ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isIncoming ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Cash Wallets Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Cash in Hand</h3>
          <span className="text-xs font-bold text-slate-600 tabular-nums">
            {formatINR(totalCash)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: "Anson's Cash", balance: ansonCash, tint: 'bg-blue-50 text-blue-600' },
            { name: "Dona's Cash", balance: donaCash, tint: 'bg-emerald-50 text-emerald-600' },
          ].map((wallet) => (
            <div
              key={wallet.name}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${wallet.tint}`}>
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">{wallet.name}</p>
                  <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                    {formatINR(wallet.balance)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenTransfer}
                className="min-h-[40px] px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
              >
                Transfer
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
