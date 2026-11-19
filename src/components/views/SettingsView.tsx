import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory, Person } from '../../types/finance';
import { CATEGORY_DETAILS, COLOR_PALETTE_OPTIONS, formatINR, getCategoryColor } from '../../utils/formatters';
import {
  buildFirstOfMonthCommitmentNotification,
  getNotificationPermission,
  isNotificationSupported,
  playNotificationSound,
  requestNotificationPermission,
  showPhoneNotification,
  unlockNotificationAudio,
} from '../../utils/notifications';
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
  Palette,
  Plus,
  Bell,
  Clock,
  Volume2,
  CalendarHeart,
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
    customCategories,
    categoryColors,
    setCategoryColor,
    addCustomCategory,
    notifyPartnerTransactions,
    setNotifyPartnerTransactions,
    notifyEmiReminders,
    setNotifyEmiReminders,
    notifyNoteReminders,
    setNotifyNoteReminders,
    notificationSoundEnabled,
    setNotificationSoundEnabled,
    pushInAppNotification,
    loans,
    transactions,
  } = useFinance();

  const [ansonPinInput, setAnsonPinInput] = useState<string>('');
  const [donaPinInput, setDonaPinInput] = useState<string>('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string>('');
  const [pinErrorMsg, setPinErrorMsg] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission()
  );

  // Category Color Customization state
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>('#f97316');
  const [categorySuccessMsg, setCategorySuccessMsg] = useState<string>('');

  const handleUpdatePin = (person: Person, pin: string) => {
    if (pin.length !== 4 || isNaN(Number(pin))) {
      setPinErrorMsg('PIN must be a 4-digit numeric code');
      setTimeout(() => setPinErrorMsg(''), 3000);
      return;
    }
    setPinErrorMsg('');
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

      {pinErrorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{pinErrorMsg}</span>
        </div>
      )}

      {/* Phone Notifications & EMI Reminders */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Phone Notifications &amp; EMI Reminders</h3>
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg self-start sm:self-auto ${
              notifPermission === 'granted'
                ? 'bg-emerald-50 text-emerald-700'
                : notifPermission === 'denied'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {notifPermission === 'granted'
              ? 'Phone Alerts Active'
              : notifPermission === 'denied'
              ? 'Blocked in Browser Settings'
              : notifPermission === 'unsupported'
              ? 'In-App Alerts Only'
              : 'Permission Not Enabled'}
          </span>
        </div>

        {isNotificationSupported() && notifPermission !== 'granted' && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              {notifPermission === 'denied'
                ? 'Notifications are currently blocked by your phone browser. Enable them in browser Site Settings to receive alerts.'
                : 'Enable notifications on your phone so you receive alerts whenever your partner adds an item and for upcoming EMIs.'}
            </p>
            {notifPermission === 'default' && (
              <button
                type="button"
                onClick={async () => {
                  const res = await requestNotificationPermission();
                  setNotifPermission(res);
                }}
                className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition cursor-pointer"
              >
                Enable Phone Alerts
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {/* Partner Transaction Notification Toggle */}
          <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
            <div>
              <p className="text-xs font-bold text-slate-900">
                Notify when partner adds a transaction
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sends a notification with the item &amp; amount to the other phone whenever Anson or Dona logs an entry.
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifyPartnerTransactions}
              onChange={(e) => setNotifyPartnerTransactions(e.target.checked)}
              className="w-5 h-5 accent-slate-900 rounded cursor-pointer shrink-0"
            />
          </label>

          {/* EMI Reminder Toggle */}
          <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-900">
                  EMI Due Date &amp; 1st-of-Month Commitment Reminders
                </p>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
                <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>Reminds 5 days before &amp; due date at <strong>6:00 AM</strong>, <strong>12:00 PM</strong> &amp; <strong>10:00 PM</strong>, plus a <strong>1st of every month</strong> Monthly Commitment alert for all accounts.</span>
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifyEmiReminders}
              onChange={(e) => setNotifyEmiReminders(e.target.checked)}
              className="w-5 h-5 accent-indigo-600 rounded cursor-pointer shrink-0"
            />
          </label>

          {/* Daily Notes, Birthdays & Task Completion Notification Toggle */}
          <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
            <div>
              <div className="flex items-center gap-1.5">
                <CalendarHeart className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-slate-900">
                  Daily Notes, Birthdays &amp; Task Completion Alerts
                </p>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sends phone reminders for daily matters, birthdays &amp; wedding dates, and alerts both phones when a task or note is completed.
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifyNoteReminders}
              onChange={(e) => setNotifyNoteReminders(e.target.checked)}
              className="w-5 h-5 accent-amber-600 rounded cursor-pointer shrink-0"
            />
          </label>

          {/* Notification Sound Toggle */}
          <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
            <div>
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-slate-900">
                  Play Nice Chime Sound on Notifications
                </p>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Plays a pleasant harmonic bell sound for partner entries and EMI reminders.
              </p>
            </div>
            <input
              type="checkbox"
              checked={notificationSoundEnabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                setNotificationSoundEnabled(enabled);
                if (enabled) {
                  void unlockNotificationAudio().then(() => playNotificationSound('system', true));
                }
              }}
              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer shrink-0"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={async () => {
              await unlockNotificationAudio();
              if (notifPermission === 'default') {
                const res = await requestNotificationPermission();
                setNotifPermission(res);
              }
              await showPhoneNotification({
                title: `New Expense added by ${currentUser === 'Anson' ? 'Dona' : 'Anson'}`,
                body: `Groceries — ${formatINR(850)} (Test Alert)`,
                tag: `test-tx-${Date.now()}`,
                kind: 'transaction',
                onInAppNotify: pushInAppNotification,
              });
            }}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
          >
            Test Transaction Alert
          </button>

          <button
            type="button"
            onClick={async () => {
              await unlockNotificationAudio();
              if (notifPermission === 'default') {
                const res = await requestNotificationPermission();
                setNotifPermission(res);
              }
              const sampleLoan = loans.find((l) => l.status === 'active');
              await showPhoneNotification({
                title: sampleLoan
                  ? `EMI Reminder (6:00 AM): ${sampleLoan.name}`
                  : 'EMI Reminder (6:00 AM): Loan Installment',
                body: sampleLoan
                  ? `${formatINR(sampleLoan.monthlyEmi)} due on the ${sampleLoan.emiDueDay}th (6:00 AM / 12:00 PM / 10:00 PM schedule).`
                  : 'Upcoming EMI reminder — reminds 5 days before due date at 6:00 AM, 12:00 PM & 10:00 PM.',
                tag: `test-emi-${Date.now()}`,
                kind: 'emi_reminder',
                onInAppNotify: pushInAppNotification,
              });
            }}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
          >
            Test EMI Reminder
          </button>

          <button
            type="button"
            onClick={async () => {
              await unlockNotificationAudio();
              if (notifPermission === 'default') {
                const res = await requestNotificationPermission();
                setNotifPermission(res);
              }
              const { title, body } = buildFirstOfMonthCommitmentNotification(loans, transactions, new Date());
              await showPhoneNotification({
                title,
                body,
                tag: `test-first-of-month-${Date.now()}`,
                kind: 'emi_reminder',
                onInAppNotify: pushInAppNotification,
              });
            }}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer"
          >
            Test 1st-of-Month Alert
          </button>

          <button
            type="button"
            onClick={async () => {
              await unlockNotificationAudio();
              if (notifPermission === 'default') {
                const res = await requestNotificationPermission();
                setNotifPermission(res);
              }
              await showPhoneNotification({
                title: `Task Completed by ${currentUser}`,
                body: 'Daily matter completed — great job! (Test Completion Alert)',
                tag: `test-note-done-${Date.now()}`,
                kind: 'note_completed',
                onInAppNotify: pushInAppNotification,
              });
            }}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer"
          >
            Test Task Done Alert
          </button>

          <button
            type="button"
            onClick={async () => {
              await unlockNotificationAudio();
              await playNotificationSound('emi_reminder', true);
            }}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Test Chime Sound</span>
          </button>
        </div>
      </div>

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
                    Security PIN: <strong className="font-mono text-slate-700">••••</strong>
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

      {/* Category Colors & Customization */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Expense Category Colors & Customization</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            Synced live to all charts & transaction lists
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Assign custom colors to any expense category. Changes update immediately across your dashboard charts, budget progress bars, and transaction records.
        </p>

        {categorySuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{categorySuccessMsg}</span>
          </div>
        )}

        {/* Categories Grid with Color Swatches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Preset Categories */}
          {(Object.keys(CATEGORY_DETAILS) as ExpenseCategory[]).map((cat) => {
            const details = CATEGORY_DETAILS[cat];
            const currentColor = getCategoryColor(cat, categoryColors);
            const isEditing = editingCategoryKey === cat;

            return (
              <div
                key={cat}
                className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 border border-black/10 shadow-2xs"
                      style={{ backgroundColor: currentColor }}
                    />
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {details.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCategoryKey(isEditing ? null : cat)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition"
                  >
                    {isEditing ? 'Close' : 'Change Color'}
                  </button>
                </div>

                {isEditing && (
                  <div className="pt-2 border-t border-slate-200 animate-in fade-in duration-150">
                    <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Select Palette Color:
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {COLOR_PALETTE_OPTIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCategoryColor(cat, c);
                            setCategorySuccessMsg(`Color for ${details.label} updated!`);
                            setTimeout(() => setCategorySuccessMsg(''), 2500);
                          }}
                          className={`w-5 h-5 rounded-full border transition-transform ${
                            currentColor === c
                              ? 'scale-125 ring-2 ring-slate-900 ring-offset-1 border-white'
                              : 'border-slate-300 hover:scale-110'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* User Custom Categories */}
          {customCategories.map((c) => {
            const currentColor = getCategoryColor(c.name, categoryColors);
            const isEditing = editingCategoryKey === c.name;

            return (
              <div
                key={c.id}
                className="p-3 rounded-2xl border border-rose-200/80 bg-rose-50/30 hover:bg-rose-50/50 transition flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 border border-black/10 shadow-2xs"
                      style={{ backgroundColor: currentColor }}
                    />
                    <span className="text-xs font-bold text-rose-950 truncate">
                      🏷️ {c.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCategoryKey(isEditing ? null : c.name)}
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 px-2 py-0.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 transition"
                  >
                    {isEditing ? 'Close' : 'Change Color'}
                  </button>
                </div>

                {isEditing && (
                  <div className="pt-2 border-t border-rose-200 animate-in fade-in duration-150">
                    <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Select Palette Color:
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {COLOR_PALETTE_OPTIONS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            setCategoryColor(c.name, col);
                            setCategorySuccessMsg(`Color for ${c.name} updated!`);
                            setTimeout(() => setCategorySuccessMsg(''), 2500);
                          }}
                          className={`w-5 h-5 rounded-full border transition-transform ${
                            currentColor === col
                              ? 'scale-125 ring-2 ring-slate-900 ring-offset-1 border-white'
                              : 'border-slate-300 hover:scale-110'
                          }`}
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add New Custom Category with Color */}
        <div className="pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Add New Custom Category & Color
          </h4>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              placeholder="e.g. Vacation, Subscriptions, Fitness"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto">
              {COLOR_PALETTE_OPTIONS.slice(0, 8).map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setNewCatColor(col)}
                  className={`w-5 h-5 rounded-full border transition-transform shrink-0 ${
                    newCatColor === col ? 'scale-125 ring-2 ring-slate-900 border-white' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newCatName.trim()) return;
                addCustomCategory(newCatName.trim(), 'expense', newCatColor);
                setCategorySuccessMsg(`Category "${newCatName.trim()}" created!`);
                setTimeout(() => setCategorySuccessMsg(''), 2500);
                setNewCatName('');
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shrink-0"
            >
              Add Category
            </button>
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
