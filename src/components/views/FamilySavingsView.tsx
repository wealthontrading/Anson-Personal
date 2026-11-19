import React, { useMemo, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { BankAccount, Transaction } from '../../types/finance';
import { formatDateDDMMYYYY, formatINR } from '../../utils/formatters';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import {
  PiggyBank,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Edit2,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  X,
  ArrowLeftRight,
} from 'lucide-react';

interface FamilySavingsViewProps {
  onOpenAddJointAccount: () => void;
  onEditAccount: (account: BankAccount) => void;
  onOpenTransferToSavings: (toAccountId?: string, title?: string) => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const FamilySavingsView: React.FC<FamilySavingsViewProps> = ({
  onOpenAddJointAccount,
  onEditAccount,
  onOpenTransferToSavings,
  onEditTransaction,
}) => {
  const {
    jointSavingsAccounts,
    familySavingsBalance,
    bankAccounts,
    transactions,
    deleteBankAccount,
    deleteTransaction,
  } = useFinance();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [deleteTargetAccount, setDeleteTargetAccount] = useState<BankAccount | null>(null);
  const [deleteTargetTx, setDeleteTargetTx] = useState<Transaction | null>(null);

  const jointAccountIds = useMemo(
    () => new Set(jointSavingsAccounts.map((a) => a.id)),
    [jointSavingsAccounts]
  );

  // All transactions involving any Joint savings account
  const savingsTransactions = useMemo(() => {
    return transactions.filter(
      (tx) =>
        (tx.toAccountId && jointAccountIds.has(tx.toAccountId)) ||
        (tx.fromAccountId && jointAccountIds.has(tx.fromAccountId))
    );
  }, [transactions, jointAccountIds]);

  // Calculate total deposits contributed by Anson vs Dona into Joint savings
  const contributionStats = useMemo(() => {
    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let ansonSaved = 0;
    let donaSaved = 0;

    savingsTransactions.forEach((tx) => {
      const toJoint = Boolean(tx.toAccountId && jointAccountIds.has(tx.toAccountId));
      const fromJoint = Boolean(tx.fromAccountId && jointAccountIds.has(tx.fromAccountId));

      if (toJoint && !fromJoint) {
        totalDeposited += tx.amount;
        if (tx.person === 'Anson') ansonSaved += tx.amount;
        if (tx.person === 'Dona') donaSaved += tx.amount;
      } else if (fromJoint && !toJoint) {
        totalWithdrawn += tx.amount;
      }
    });

    return { totalDeposited, totalWithdrawn, ansonSaved, donaSaved };
  }, [savingsTransactions, jointAccountIds]);

  const selectedAccount = jointSavingsAccounts.find((a) => a.id === selectedAccountId);
  const selectedAccountTx = selectedAccountId
    ? savingsTransactions.filter(
        (tx) => tx.toAccountId === selectedAccountId || tx.fromAccountId === selectedAccountId
      )
    : [];

  const getAccountName = (id?: string) => {
    if (!id) return undefined;
    const acc = bankAccounts.find((a) => a.id === id);
    return acc ? `${acc.bankName} (${acc.owner})` : undefined;
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Family Savings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Joint savings money — kept separate from Family &amp; Individual spending and expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {jointSavingsAccounts.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onOpenTransferToSavings(
                  jointSavingsAccounts[0].id,
                  `Deposit to ${jointSavingsAccounts[0].bankName} Savings`
                )
              }
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Save Money</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddJointAccount}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Joint Account</span>
          </button>
        </div>
      </div>

      {/* Total Family Savings Hero Card */}
      <section className="bg-white rounded-3xl border border-emerald-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-lg mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Protected Savings · Excluded from Spending &amp; Expenses</span>
            </div>
            <p className="text-xs font-semibold text-slate-500">Total Family Savings (Joint)</p>
            <p className="text-3xl sm:text-4xl font-extrabold text-emerald-700 tracking-tight mt-1 tabular-nums">
              {formatINR(familySavingsBalance)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              Across <strong className="text-slate-700">{jointSavingsAccounts.length}</strong> joint savings account
              {jointSavingsAccounts.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 self-start">
            <PiggyBank className="w-6 h-6" />
          </div>
        </div>

        {/* Partner Contributions Summary */}
        <div className="grid grid-cols-3 gap-3 pt-4 tabular-nums">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Anson Saved</p>
            <p className="text-sm sm:text-lg font-extrabold text-blue-600 mt-0.5 truncate">
              {formatINR(contributionStats.ansonSaved)}
            </p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Dona Saved</p>
            <p className="text-sm sm:text-lg font-extrabold text-emerald-600 mt-0.5 truncate">
              {formatINR(contributionStats.donaSaved)}
            </p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Total Deposits</p>
            <p className="text-sm sm:text-lg font-extrabold text-slate-900 mt-0.5 truncate">
              {formatINR(contributionStats.totalDeposited)}
            </p>
          </div>
        </div>
      </section>

      {/* Joint Savings Accounts List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Joint Savings Accounts ({jointSavingsAccounts.length})
          </h3>
          <span className="text-xs font-bold text-emerald-700 tabular-nums">
            {formatINR(familySavingsBalance)}
          </span>
        </div>

        {jointSavingsAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-emerald-300 p-7 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <PiggyBank className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">No Joint Savings Account Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Add your Joint bank account here to track Family Savings separately from Anson &amp; Dona's spending balances and daily expenses.
            </p>
            <button
              type="button"
              onClick={onOpenAddJointAccount}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Joint Savings Account</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {jointSavingsAccounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(isSelected ? null : acc.id)}
                  className={`bg-white rounded-2xl border p-4 transition cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/15'
                      : 'border-slate-200/90 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{acc.bankName}</h4>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                            Joint Savings
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {acc.name}
                          {acc.accountNumberMasked ? ` · ${acc.accountNumberMasked}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-2xl font-extrabold text-emerald-700 tracking-tight tabular-nums mb-3">
                    {formatINR(acc.currentBalance)}
                  </p>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTransferToSavings(acc.id, `Deposit to ${acc.bankName} Savings`);
                      }}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Transfer to Save</span>
                    </button>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onEditAccount(acc)}
                        aria-label="Edit joint account"
                        className="min-w-[36px] min-h-[36px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center justify-center transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetAccount(acc)}
                        aria-label="Delete joint account"
                        className="min-w-[36px] min-h-[36px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Selected Joint Account Ledger */}
      {selectedAccount && (
        <section className="bg-white rounded-2xl border border-emerald-200 p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {selectedAccount.bankName} — {selectedAccount.name} Ledger
              </h3>
              <p className="text-xs text-slate-500">{selectedAccountTx.length} entries</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAccountId(null)}
              className="min-h-[36px] px-3 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>
          </div>

          {selectedAccountTx.length === 0 ? (
            <p className="py-6 text-center text-slate-400 text-xs">
              No transfers or deposits recorded for this joint savings account yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {selectedAccountTx.map((tx) => {
                const isDeposit = tx.toAccountId === selectedAccount.id;
                return (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDeposit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isDeposit ? (
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpFromLine className="w-3.5 h-3.5" />
                        )}
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
                        isDeposit ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isDeposit ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Savings Deposit & Transfer History */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Savings Activity ({savingsTransactions.length})
          </h3>
          {jointSavingsAccounts.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onOpenTransferToSavings(
                  jointSavingsAccounts[0].id,
                  `Deposit to ${jointSavingsAccounts[0].bankName} Savings`
                )
              }
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              + Add Deposit
            </button>
          )}
        </div>

        {savingsTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No savings transfers recorded yet. Tap <strong>Save Money</strong> above to transfer funds from your personal bank or cash into Family Savings.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {savingsTransactions.map((tx) => {
              const isDeposit = Boolean(tx.toAccountId && jointAccountIds.has(tx.toAccountId));
              const fromLabel =
                getAccountName(tx.fromAccountId) ||
                (tx.fromCashPerson ? `${tx.fromCashPerson} Cash` : undefined);
              const toLabel =
                getAccountName(tx.toAccountId) ||
                (tx.toCashPerson ? `${tx.toCashPerson} Cash` : undefined);

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isDeposit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDownToLine className="w-4 h-4" />
                      ) : (
                        <ArrowUpFromLine className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{tx.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {formatDateDDMMYYYY(tx.date)} · {tx.person}
                        {fromLabel && toLabel ? ` · ${fromLabel} → ${toLabel}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-sm font-extrabold tabular-nums ${
                        isDeposit ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isDeposit ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditTransaction(tx)}
                      aria-label="Edit savings transfer"
                      className="min-w-[32px] min-h-[32px] rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetTx(tx)}
                      aria-label="Delete savings transfer"
                      className="min-w-[32px] min-h-[32px] rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Joint Account Yes/No Confirmation Popup */}
      {deleteTargetAccount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
          onClick={() => setDeleteTargetAccount(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetAccount(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Delete Joint Savings Account?</h3>
            <p className="text-xs text-slate-500 mt-1">
              {deleteTargetAccount.bankName} — {deleteTargetAccount.name} ({formatINR(deleteTargetAccount.currentBalance)}) will be removed from Family Savings.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTargetAccount(null)}
                className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBankAccount(deleteTargetAccount.id);
                  if (selectedAccountId === deleteTargetAccount.id) setSelectedAccountId(null);
                  setDeleteTargetAccount(null);
                }}
                className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Savings Transaction Yes/No Confirmation Popup */}
      <DeleteConfirmModal
        transaction={deleteTargetTx}
        onCancelNo={() => setDeleteTargetTx(null)}
        onConfirmYes={(tx) => {
          deleteTransaction(tx.id);
          setDeleteTargetTx(null);
        }}
      />
    </div>
  );
};
