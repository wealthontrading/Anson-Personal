import React from 'react';
import { Transaction } from '../../types/finance';
import { formatDateDDMMYYYY, formatINR } from '../../utils/formatters';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  transaction: Transaction | null;
  onConfirmYes: (tx: Transaction) => void;
  onCancelNo: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  transaction,
  onConfirmYes,
  onCancelNo,
}) => {
  if (!transaction) return null;

  const typeLabel =
    transaction.type === 'income'
      ? 'Income'
      : transaction.type === 'transfer'
      ? 'Transfer'
      : transaction.type === 'emi_payment'
      ? 'EMI Payment'
      : 'Expense';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
      onClick={onCancelNo}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-tx-title"
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onCancelNo}
            aria-label="Close popup"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 id="delete-tx-title" className="text-lg font-extrabold text-slate-900">
          Delete this transaction?
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Your bank or cash balance will automatically adjust back.
        </p>

        <div className="my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {typeLabel} · {transaction.person}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
              {formatDateDDMMYYYY(transaction.date)}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 truncate">{transaction.title}</p>
          <p className="text-base font-extrabold text-rose-600 tabular-nums">
            {formatINR(transaction.amount)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancelNo}
            className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition cursor-pointer"
          >
            No
          </button>
          <button
            type="button"
            onClick={() => onConfirmYes(transaction)}
            className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition cursor-pointer"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};
