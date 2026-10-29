import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ShieldCheck, Lock, UserCheck, AlertCircle } from 'lucide-react';
import { Person } from '../../types/finance';

export const PinLockModal: React.FC = () => {
  const { isLocked, unlockWithPin, currentUser, switchUser, users } = useFinance();
  const [pinInput, setPinInput] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setError('');
      if (nextPin.length === 4) {
        setTimeout(() => {
          const success = unlockWithPin(nextPin);
          if (!success) {
            setError('Incorrect PIN. Please try again.');
            setPinInput('');
          }
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPinInput('');
    setError('');
  };

  const activeUserProfile = users.find((u) => u.id === currentUser);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Brand Icon & Heading */}
        <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg mb-4">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 text-center tracking-tight">
          Anson & Dona Finances
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-6 text-center">
          Family Financial Security & Privacy Lock
        </p>

        {/* User Switcher Buttons */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl mb-6 w-full">
          {(['Anson', 'Dona'] as Person[]).map((person) => {
            const isSelected = currentUser === person;
            return (
              <button
                key={person}
                onClick={() => {
                  switchUser(person);
                  setPinInput('');
                  setError('');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    person === 'Anson' ? 'bg-blue-600' : 'bg-emerald-600'
                  }`}
                />
                {person}
              </button>
            );
          })}
        </div>

        {/* PIN Indicators */}
        <div className="flex items-center justify-center gap-4 my-3">
          {[0, 1, 2, 3].map((idx) => {
            const filled = pinInput.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  filled
                    ? 'bg-slate-900 scale-110 shadow-sm'
                    : 'bg-slate-200 border border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium my-2">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 font-semibold text-xl transition flex items-center justify-center border border-slate-200/60 shadow-xs"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-500 font-medium text-xs transition flex items-center justify-center"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 font-semibold text-xl transition flex items-center justify-center border border-slate-200/60 shadow-xs"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-500 font-medium text-xs transition flex items-center justify-center"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  </div>
);
};
