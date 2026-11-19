import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { DailyNote, NoteType } from '../../types/finance';
import { formatDateDDMMYYYY, getTodayISO } from '../../utils/formatters';
import { formatReminderTime12h, unlockNotificationAudio } from '../../utils/notifications';
import {
  X,
  Check,
  Bell,
  Calendar,
  CheckSquare,
  BookOpen,
  Cake,
  Heart,
  Sparkles,
  Clock,
  Repeat,
} from 'lucide-react';

interface AddEditNoteModalProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  editNote?: DailyNote | null;
  presetDate?: string;
  presetType?: NoteType;
}

const NOTE_TYPE_OPTIONS: Array<{
  id: NoteType;
  label: string;
  shortLabel: string;
  placeholder: string;
  icon: React.FC<{ className?: string }>;
  activeClass: string;
}> = [
  {
    id: 'task',
    label: 'Doing Matter / Task',
    shortLabel: 'Task',
    placeholder: 'e.g. Pay electricity bill, Call plumber',
    icon: CheckSquare,
    activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-xs',
  },
  {
    id: 'journal',
    label: 'Daily Journey Note',
    shortLabel: 'Daily Note',
    placeholder: 'e.g. Visited family, Evening walk notes',
    icon: BookOpen,
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
  },
  {
    id: 'birthday',
    label: 'Birthday',
    shortLabel: 'Birthday',
    placeholder: "e.g. Dona's Birthday, Amma's Birthday",
    icon: Cake,
    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs',
  },
  {
    id: 'wedding',
    label: 'Wedding Date',
    shortLabel: 'Wedding',
    placeholder: 'e.g. Anson & Dona Wedding Anniversary',
    icon: Heart,
    activeClass: 'bg-pink-600 text-white border-pink-600 shadow-xs',
  },
  {
    id: 'special_date',
    label: 'Special Date',
    shortLabel: 'Event',
    placeholder: 'e.g. Housewarming, Doctor Appointment',
    icon: Sparkles,
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-xs',
  },
];

export const AddEditNoteModal: React.FC<AddEditNoteModalProps> = ({
  isOpen,
  onClose,
  editNote,
  presetDate,
  presetType,
}) => {
  const { addDailyNote, editDailyNote, currentUser } = useFinance();

  const [type, setType] = useState<NoteType>('task');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayISO());
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderTime, setReminderTime] = useState<string>('09:00');
  const [remindDaysBefore, setRemindDaysBefore] = useState<number>(0);
  const [repeatYearly, setRepeatYearly] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    if (editNote) {
      setType(editNote.type);
      setTitle(editNote.title);
      setContent(editNote.content || '');
      setDate(editNote.date || getTodayISO());
      setReminderEnabled(Boolean(editNote.reminderEnabled));
      setReminderTime(editNote.reminderTime || (editNote.type === 'birthday' || editNote.type === 'wedding' ? '08:00' : '09:00'));
      setRemindDaysBefore(typeof editNote.remindDaysBefore === 'number' ? editNote.remindDaysBefore : 0);
      setRepeatYearly(Boolean(editNote.repeatYearly || editNote.type === 'birthday' || editNote.type === 'wedding'));
      setError('');
    } else {
      const initType: NoteType = presetType || 'task';
      const isSpecialYearly = initType === 'birthday' || initType === 'wedding';
      setType(initType);
      setTitle('');
      setContent('');
      setDate(presetDate || getTodayISO());
      setReminderEnabled(initType !== 'journal');
      setReminderTime(isSpecialYearly ? '08:00' : '09:00');
      setRemindDaysBefore(isSpecialYearly ? 1 : 0);
      setRepeatYearly(isSpecialYearly);
      setError('');
    }
  }, [isOpen, editNote, presetDate, presetType]);

  if (!isOpen) return null;

  const activeTypeConfig = NOTE_TYPE_OPTIONS.find((o) => o.id === type) || NOTE_TYPE_OPTIONS[0];
  const isSpecialType = type === 'birthday' || type === 'wedding' || type === 'special_date';

  const handleSelectType = (newType: NoteType) => {
    setType(newType);
    if (!editNote) {
      if (newType === 'birthday' || newType === 'wedding') {
        setRepeatYearly(true);
        setReminderEnabled(true);
        setReminderTime('08:00');
        setRemindDaysBefore(1);
      } else if (newType === 'special_date') {
        setReminderEnabled(true);
        setReminderTime('09:00');
        setRemindDaysBefore(1);
      } else if (newType === 'task') {
        setRepeatYearly(false);
        setReminderEnabled(true);
        setReminderTime('09:00');
        setRemindDaysBefore(0);
      } else {
        setRepeatYearly(false);
        setReminderEnabled(false);
        setRemindDaysBefore(0);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a title or matter to note');
      return;
    }
    if (!date) {
      setError('Please pick a date');
      return;
    }

    void unlockNotificationAudio();

    const payload = {
      title: title.trim(),
      content: content.trim(),
      type,
      date,
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime || '09:00' : undefined,
      remindDaysBefore: reminderEnabled ? remindDaysBefore : 0,
      repeatYearly: type === 'birthday' || type === 'wedding' ? true : repeatYearly,
    };

    if (editNote) {
      editDailyNote(editNote.id, payload);
    } else {
      addDailyNote({
        ...payload,
        completed: false,
        person: currentUser,
      });
    }

    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs">
      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12">
        <div
          className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onClose()}
                className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="Close window"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editNote ? 'Edit Note / Reminder' : 'Add Daily Note or Date'}
                </h3>
                <p className="text-xs text-slate-500">
                  Synced for Anson &amp; Dona with phone notifications
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose()}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Close
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Note Type Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Type *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {NOTE_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = type === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectType(opt.id)}
                      className={`min-h-[54px] py-2 px-1.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                        active
                          ? opt.activeClass
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="truncate leading-none">{opt.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {type === 'birthday'
                  ? 'Whose Birthday? *'
                  : type === 'wedding'
                  ? 'Wedding / Anniversary Title *'
                  : type === 'journal'
                  ? 'Daily Journey Title *'
                  : 'What to Do / Note Title *'}
              </label>
              <input
                type="text"
                required
                placeholder={activeTypeConfig.placeholder}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Date & Yearly Repeat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {type === 'birthday'
                    ? 'Birth Date *'
                    : type === 'wedding'
                    ? 'Wedding Date *'
                    : 'Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer min-h-[42px]">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-rose-500" />
                    <span>Repeat Every Year</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={type === 'birthday' || type === 'wedding' ? true : repeatYearly}
                    disabled={type === 'birthday' || type === 'wedding'}
                    onChange={(e) => setRepeatYearly(e.target.checked)}
                    className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Details / Journey Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Details / Daily Journey Note
              </label>
              <textarea
                rows={3}
                placeholder={
                  type === 'journal'
                    ? 'Write about your day, places visited, or important memories...'
                    : 'Add extra details, gift ideas, location, or checklist notes...'
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 resize-none"
              />
            </div>

            {/* Phone Notification Reminder Setup */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>Phone Reminder Notification</span>
                </span>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                />
              </label>

              {reminderEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Reminder Time</span>
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Notify Before Date
                    </label>
                    <select
                      value={remindDaysBefore}
                      onChange={(e) => setRemindDaysBefore(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value={0}>On the date only</option>
                      <option value={1}>1 day before &amp; on date</option>
                      <option value={3}>3 days before &amp; on date</option>
                      <option value={5}>5 days before &amp; on date</option>
                    </select>
                  </div>
                </div>
              )}

              {reminderEnabled && date && (
                <p className="text-[11px] text-amber-900 font-semibold">
                  Alert will ring with sound on{' '}
                  <strong>{formatDateDDMMYYYY(date)}</strong>
                  {remindDaysBefore > 0 ? ` (starting ${remindDaysBefore}d before)` : ''} at{' '}
                  <strong>{formatReminderTime12h(reminderTime || '09:00')}</strong>
                  {isSpecialType || repeatYearly ? ' every year' : ''}.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onClose()}
                className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{editNote ? 'Update Note' : 'Save Note & Reminder'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
