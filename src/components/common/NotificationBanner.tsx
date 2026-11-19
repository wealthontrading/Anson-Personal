import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Bell, CalendarHeart, CheckCircle2, Landmark, X } from 'lucide-react';

export const NotificationBanner: React.FC = () => {
  const { inAppNotifications, dismissInAppNotification } = useFinance();

  if (inAppNotifications.length === 0) return null;

  return (
    <div
      className="fixed top-16 right-3 left-3 sm:left-auto sm:w-96 z-50 space-y-2 pointer-events-none"
      aria-live="polite"
    >
      {inAppNotifications.map((notif) => {
        const isEmi = notif.kind === 'emi_reminder';
        const isNoteReminder = notif.kind === 'note_reminder';
        const isNoteCompleted = notif.kind === 'note_completed';

        const iconBg = isEmi
          ? 'bg-indigo-500 text-white'
          : isNoteReminder
          ? 'bg-amber-500 text-white'
          : isNoteCompleted
          ? 'bg-emerald-500 text-white'
          : 'bg-emerald-500 text-white';

        return (
          <div
            key={notif.id}
            className="pointer-events-auto bg-slate-900 text-white rounded-2xl p-3.5 shadow-xl border border-slate-700/80 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              {isEmi ? (
                <Landmark className="w-4 h-4" />
              ) : isNoteReminder ? (
                <CalendarHeart className="w-4 h-4" />
              ) : isNoteCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-white leading-snug">{notif.title}</p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{notif.body}</p>
            </div>

            <button
              type="button"
              onClick={() => dismissInAppNotification(notif.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
