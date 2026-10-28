import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Person } from '../../types/finance';
import { User, Shield, Check, Lock, ArrowRight } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoggedIn, loginUser, users } = useFinance();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showPinInput, setShowPinInput] = useState<boolean>(false);

  if (isLoggedIn) return null;

  const handleSelectProfile = (person: Person) => {
    setSelectedPerson(person);
    setError('');
    const userProfile = users.find((u) => u.id === person);
    if (userProfile?.pin) {
      setShowPinInput(true);
      setPin('');
    } else {
      // No PIN required, log in directly
      loginUser(person);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
    const success = loginUser(selectedPerson, pin);
    if (!success) {
      setError('Incorrect 4-digit PIN. Please try again.');
      setPin('');
    }
  };

  const handleDirectLogin = (person: Person) => {
    // Allows immediate 1-tap entry without PIN roadblock if user wants easy access
    const userProfile = users.find((u) => u.id === person);
    const pinToUse = userProfile?.pin || undefined;
    loginUser(person, pinToUse);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center relative overflow-hidden">
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-slate-900 text-emerald-400 font-black text-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          ₹
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
          Anson & Dona
        </h2>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6">
          Family Expense Tracker
        </p>

        {!showPinInput ? (
          <div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-1 text-slate-900 font-bold text-sm">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>One-Time Device Sign In</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log in once to link this device to your profile. Transactions will automatically record to your account and lock out the other account to prevent errors.
              </p>
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-left">
              Select Your Profile
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {/* Anson Card */}
              <button
                type="button"
                onClick={() => handleSelectProfile('Anson')}
                className="group p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/40 text-left transition-all duration-150 shadow-2xs hover:shadow-md cursor-pointer flex flex-col items-start"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
                  A
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Anson</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Primary Earner & Loans</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                  <span>Sign In as Anson</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Dona Card */}
              <button
                type="button"
                onClick={() => handleSelectProfile('Dona')}
                className="group p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 text-left transition-all duration-150 shadow-2xs hover:shadow-md cursor-pointer flex flex-col items-start"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
                  D
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Dona</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Savings & Daily Budget</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  <span>Sign In as Dona</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Device will remember your login permanently</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Enter 4-Digit Security PIN
              </label>
              <input
                type="password"
                maxLength={4}
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-48 mx-auto text-center tracking-[0.5em] text-2xl font-bold py-3 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Default PIN: Anson: 1234 • Dona: 5678 (or Master: 9999)
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition cursor-pointer"
              >
                Confirm & Log In Permanently
              </button>

              <button
                type="button"
                onClick={() => selectedPerson && handleDirectLogin(selectedPerson)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 py-1"
              >
                Skip PIN (Quick 1-Tap Entry)
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPinInput(false);
                  setSelectedPerson(null);
                  setError('');
                }}
                className="text-xs text-slate-400 hover:text-slate-600 py-1"
              >
                ← Back to profile selection
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
