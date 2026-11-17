import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Person } from '../../types/finance';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoggedIn, loginUser } = useFinance();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showPinInput, setShowPinInput] = useState<boolean>(false);

  if (isLoggedIn) return null;

  const handleSelectProfile = (person: Person) => {
    setSelectedPerson(person);
    setError('');
    setShowPinInput(true);
    setPin('');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
    if (!pin || pin.trim().length !== 4) {
      setError('Please enter your 4-digit password');
      return;
    }
    const success = loginUser(selectedPerson, pin.trim());
    if (!success) {
      setError('Wrong password. Please try again.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm">
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-200/80 text-center my-auto">
          {/* Simple Brand Mark */}
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-emerald-400 font-black text-2xl flex items-center justify-center mx-auto mb-3.5">
            ₹
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Anson & Dona
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Family Expense Tracker
          </p>

          {!showPinInput ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-600">
                Tap your name to sign in
              </p>

              <div className="grid grid-cols-1 gap-3">
                {/* Anson Button */}
                <button
                  type="button"
                  onClick={() => handleSelectProfile('Anson')}
                  className="w-full min-h-[68px] px-4 py-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 bg-white flex items-center justify-between transition active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                      A
                    </div>
                    <div>
                      <span className="block text-base font-bold text-slate-900">Anson</span>
                      <span className="block text-xs text-slate-500">Sign in with password</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* Dona Button */}
                <button
                  type="button"
                  onClick={() => handleSelectProfile('Dona')}
                  className="w-full min-h-[68px] px-4 py-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 bg-white flex items-center justify-between transition active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                      D
                    </div>
                    <div>
                      <span className="block text-base font-bold text-slate-900">Dona</span>
                      <span className="block text-xs text-slate-500">Sign in with password</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 pt-2">
                Your profile stays signed in on this device
              </p>
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-5">
              <div className="flex items-center justify-center gap-3 bg-slate-50 py-3 px-4 rounded-2xl border border-slate-200/70">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                    selectedPerson === 'Anson' ? 'bg-blue-600' : 'bg-emerald-600'
                  }`}
                >
                  {selectedPerson?.[0]}
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500">Signing in as</p>
                  <p className="text-base font-bold text-slate-900">{selectedPerson}</p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Enter 4-digit password
                </label>
                <div className="relative max-w-[200px] mx-auto">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={4}
                    autoFocus
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                      setError('');
                    }}
                    className="w-full text-center tracking-[0.45em] text-2xl font-bold py-3 pl-8 pr-4 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 tabular-nums transition"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="submit"
                  className="w-full min-h-[48px] py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition active:scale-[0.98] cursor-pointer"
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPinInput(false);
                    setSelectedPerson(null);
                    setError('');
                  }}
                  className="w-full min-h-[44px] text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Choose different person</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
