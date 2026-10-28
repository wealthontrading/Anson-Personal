import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Person } from '../../types/finance';
import {
  ShieldCheck,
  KeyRound,
  Download,
  Upload,
  RefreshCcw,
  Check,
  Lock,
  User,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    users,
    currentUser,
    switchUser,
    lockApp,
    updateUserPin,
    exportBackupJSON,
    importBackupJSON,
    resetToDemoData,
  } = useFinance();

  const [ansonPinInput, setAnsonPinInput] = useState<string>('');
  const [donaPinInput, setDonaPinInput] = useState<string>('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const handleUpdatePin = (person: Person, pin: string) => {
    if (pin.length !== 4 || isNaN(Number(pin))) {
      alert('PIN must be a 4-digit numeric code');
      return;
    }
    updateUserPin(person, pin);
    setPinSuccessMsg(`PIN for ${person} successfully updated!`);
    setTimeout(() => setPinSuccessMsg(''), 3000);
    if (person === 'Anson') setAnsonPinInput('');
    if (person === 'Dona') setDonaPinInput('');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const ok = importBackupJSON(content);
          if (ok) {
            setImportStatus('Backup data restored successfully!');
          } else {
            setImportStatus('Failed to restore backup: Invalid data format');
          }
        } catch {
          setImportStatus('Failed to read backup file');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Settings & Security
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage user profiles, 4-digit PIN locks, data backup, and persistent storage
        </p>
      </div>

      {pinSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{pinSuccessMsg}</span>
        </div>
      )}

      {/* User Profiles & Active Session */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">User Profiles & Access</h3>
          </div>
          <button
            onClick={lockApp}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Lock Screen Now</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {users.map((u) => {
            const isCurrent = currentUser === u.id;
            return (
              <div
                key={u.id}
                className={`p-4 rounded-2xl border transition ${
                  isCurrent
                    ? u.id === 'Anson'
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs ${
                        u.id === 'Anson' ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}
                    >
                      {u.id.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{u.name}</h4>
                      <p className="text-[11px] text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 shadow-xs">
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    PIN code: <strong className="font-mono text-slate-700">{u.pin}</strong>
                  </span>
                  {!isCurrent && (
                    <button
                      onClick={() => switchUser(u.id)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Switch to {u.id}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Change PIN Codes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <KeyRound className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">Change Security PINs</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Anson PIN */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Change Anson's PIN</h4>
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={4}
                placeholder="New 4-digit PIN"
                value={ansonPinInput}
                onChange={(e) => setAnsonPinInput(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest text-slate-900"
              />
              <button
                onClick={() => handleUpdatePin('Anson', ansonPinInput)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shrink-0 transition"
              >
                Update
              </button>
            </div>
          </div>

          {/* Dona PIN */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Change Dona's PIN</h4>
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={4}
                placeholder="New 4-digit PIN"
                value={donaPinInput}
                onChange={(e) => setDonaPinInput(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest text-slate-900"
              />
              <button
                onClick={() => handleUpdatePin('Dona', donaPinInput)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0 transition"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Backup & Restore */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <ShieldCheck className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">Data Persistence & Backups</h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          All financial data is safely stored locally in your browser and survives page refreshes and browser restarts. You can also download complete offline backups anytime.
        </p>

        {importStatus && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-xl">
            {importStatus}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={exportBackupJSON}
            className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download Offline Backup (.JSON)</span>
          </button>

          <label className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs">
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Restore Backup (.JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Reset to Demo Data */}
      <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-bold text-slate-900">Reset Demo Data</h3>
        </div>

        <p className="text-xs text-slate-500">
          Revert all accounts, transactions, and loans back to the original realistic seed data.
        </p>

        {showResetConfirm ? (
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between">
            <span className="text-xs text-rose-800 font-bold">
              Are you sure you want to clear all data?
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetToDemoData();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700"
              >
                Yes, Clear All
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Clear All Data (Start Fresh)</span>
          </button>
        )}
      </div>

    </div>
  );
};
