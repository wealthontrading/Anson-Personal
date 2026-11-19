import React, { useMemo, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { DailyNote, NoteType } from '../../types/finance';
import { formatDateDDMMYYYY, getTodayISO } from '../../utils/formatters';
import {
  doesNoteAppearOnDate,
  formatDateToISO,
  formatReminderTime12h,
  getDaysUntilNextNoteDate,
  getNextOccurrenceForNote,
  getYearsCountForNote,
  parseLocalDateISO,
  unlockNotificationAudio,
} from '../../utils/notifications';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Bell,
  Cake,
  Heart,
  Sparkles,
  BookOpen,
  CheckSquare,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  X,
  Clock,
  Send,
} from 'lucide-react';

interface DailyNotesViewProps {
  onOpenAddNote: (presetDate?: string, presetType?: NoteType) => void;
  onEditNote: (note: DailyNote) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const NOTE_META: Record<
  NoteType,
  { label: string; badgeBg: string; badgeText: string; dotColor: string; icon: React.FC<{ className?: string }> }
> = {
  task: {
    label: 'Task',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    dotColor: 'bg-indigo-500',
    icon: CheckSquare,
  },
  journal: {
    label: 'Daily Journey',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
    icon: BookOpen,
  },
  birthday: {
    label: 'Birthday',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    dotColor: 'bg-rose-500',
    icon: Cake,
  },
  wedding: {
    label: 'Wedding Date',
    badgeBg: 'bg-pink-50',
    badgeText: 'text-pink-700',
    dotColor: 'bg-pink-500',
    icon: Heart,
  },
  special_date: {
    label: 'Special Date',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    dotColor: 'bg-amber-500',
    icon: Sparkles,
  },
};

export const DailyNotesView: React.FC<DailyNotesViewProps> = ({
  onOpenAddNote,
  onEditNote,
}) => {
  const {
    dailyNotes,
    addDailyNote,
    deleteDailyNote,
    toggleDailyNoteComplete,
    currentUser,
  } = useFinance();

  const todayISO = getTodayISO();
  const [subView, setSubView] = useState<'calendar' | 'journey' | 'special'>('calendar');
  const [selectedDateISO, setSelectedDateISO] = useState<string>(todayISO);
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Quick inline composer for the selected day
  const [quickText, setQuickText] = useState<string>('');
  const [quickType, setQuickType] = useState<'task' | 'journal'>('task');
  const [quickReminderTime, setQuickReminderTime] = useState<string>('09:00');

  // Journey filter
  const [journeyFilter, setJourneyFilter] = useState<'all' | 'pending' | 'completed' | 'journal' | 'special'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete confirmation modal target
  const [deleteTarget, setDeleteTarget] = useState<DailyNote | null>(null);

  // Build 42-cell calendar grid for viewMonth
  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.year, viewMonth.month, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const prevMonthDays = new Date(viewMonth.year, viewMonth.month, 0).getDate();

    const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];

    // Leading days from previous month
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dt = new Date(viewMonth.year, viewMonth.month - 1, d);
      cells.push({ iso: formatDateToISO(dt), day: d, inMonth: false });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(viewMonth.year, viewMonth.month, d);
      cells.push({ iso: formatDateToISO(dt), day: d, inMonth: true });
    }
    // Trailing days to complete weeks
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const needed = 7 - remainder;
      for (let d = 1; d <= needed; d++) {
        const dt = new Date(viewMonth.year, viewMonth.month + 1, d);
        cells.push({ iso: formatDateToISO(dt), day: d, inMonth: false });
      }
    }
    return cells;
  }, [viewMonth]);

  const monthTitle = useMemo(() => {
    return new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [viewMonth]);

  const selectedDateLabel = useMemo(() => {
    const parsed = parseLocalDateISO(selectedDateISO);
    if (!parsed) return formatDateDDMMYYYY(selectedDateISO);
    return parsed.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDateISO]);

  // Notes appearing on selected day (including yearly repeating birthdays/weddings!)
  const selectedDayNotes = useMemo(() => {
    return dailyNotes
      .filter((n) => doesNoteAppearOnDate(n, selectedDateISO))
      .sort((a, b) => {
        const aSpec = a.type === 'birthday' || a.type === 'wedding' || a.type === 'special_date' ? 0 : 1;
        const bSpec = b.type === 'birthday' || b.type === 'wedding' || b.type === 'special_date' ? 0 : 1;
        if (aSpec !== bSpec) return aSpec - bSpec;
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.reminderTime || '99:99').localeCompare(b.reminderTime || '99:99');
      });
  }, [dailyNotes, selectedDateISO]);

  // Special dates (Birthdays, Wedding Dates, Special Dates) sorted by upcoming countdown
  const specialDatesList = useMemo(() => {
    const now = new Date();
    return dailyNotes
      .filter((n) => n.type === 'birthday' || n.type === 'wedding' || n.type === 'special_date' || n.repeatYearly)
      .map((n) => {
        const nextDate = getNextOccurrenceForNote(n, now);
        const daysLeft = getDaysUntilNextNoteDate(n, now);
        const years = nextDate ? getYearsCountForNote(n, nextDate) : null;
        return { note: n, nextDate, daysLeft, years };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [dailyNotes]);

  // All Days Journey grouped chronologically by date
  const journeyGrouped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = dailyNotes.filter((n) => {
      if (journeyFilter === 'pending' && n.completed) return false;
      if (journeyFilter === 'completed' && !n.completed) return false;
      if (journeyFilter === 'journal' && n.type !== 'journal') return false;
      if (
        journeyFilter === 'special' &&
        n.type !== 'birthday' &&
        n.type !== 'wedding' &&
        n.type !== 'special_date'
      ) {
        return false;
      }
      if (q) {
        const matchTitle = (n.title || '').toLowerCase().includes(q);
        const matchContent = (n.content || '').toLowerCase().includes(q);
        const matchDate = (n.date || '').includes(q);
        return matchTitle || matchContent || matchDate;
      }
      return true;
    });

    const groups = new Map<string, DailyNote[]>();
    filtered.forEach((n) => {
      const key = n.date || todayISO;
      const list = groups.get(key) || [];
      list.push(n);
      groups.set(key, list);
    });

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [dailyNotes, journeyFilter, searchQuery, todayISO]);

  // Summary counts
  const todayPendingCount = useMemo(
    () =>
      dailyNotes.filter(
        (n) => doesNoteAppearOnDate(n, todayISO) && !n.completed && (n.type === 'task' || n.type === 'journal')
      ).length,
    [dailyNotes, todayISO]
  );
  const completedCount = useMemo(() => dailyNotes.filter((n) => n.completed).length, [dailyNotes]);
  const upcomingSpecialIn30 = useMemo(
    () => specialDatesList.filter((item) => item.daysLeft >= 0 && item.daysLeft <= 30),
    [specialDatesList]
  );

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    void unlockNotificationAudio();
    addDailyNote({
      title: quickText.trim(),
      content: '',
      type: quickType,
      date: selectedDateISO,
      reminderEnabled: quickType === 'task',
      reminderTime: quickType === 'task' ? quickReminderTime : undefined,
      remindDaysBefore: 0,
      repeatYearly: false,
      completed: false,
      person: currentUser,
    });
    setQuickText('');
  };

  const handleStepMonth = (delta: number) => {
    setViewMonth((prev) => {
      const nextDt = new Date(prev.year, prev.month + delta, 1);
      return { year: nextDt.getFullYear(), month: nextDt.getMonth() };
    });
  };

  const handleJumpToday = () => {
    const now = new Date();
    setViewMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDateISO(todayISO);
  };

  const handleToggleComplete = (note: DailyNote) => {
    void unlockNotificationAudio();
    toggleDailyNoteComplete(note.id);
  };

  const renderNoteCard = (note: DailyNote, contextDateISO?: string) => {
    const meta = NOTE_META[note.type] || NOTE_META.task;
    const Icon = meta.icon;
    const isSpecial = note.type === 'birthday' || note.type === 'wedding' || note.type === 'special_date';
    const refDt = parseLocalDateISO(contextDateISO || note.date) || new Date();
    const yearsCount = isSpecial && (note.repeatYearly || note.type === 'birthday' || note.type === 'wedding')
      ? getYearsCountForNote(note, refDt)
      : null;

    return (
      <div
        key={note.id}
        className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
          note.completed
            ? 'bg-emerald-50/40 border-emerald-200/70'
            : isSpecial
            ? 'bg-rose-50/40 border-rose-200/80'
            : 'bg-white border-slate-200/90'
        }`}
      >
        {/* Complete Checkbox Button (Triggers Phone Notification + Chime!) */}
        <button
          type="button"
          onClick={() => handleToggleComplete(note)}
          aria-label={note.completed ? 'Mark as not done' : 'Mark as completed'}
          title={note.completed ? 'Completed (tap to undo)' : 'Tap to complete & notify phone'}
          className={`mt-0.5 shrink-0 min-w-[32px] min-h-[32px] rounded-xl flex items-center justify-center transition cursor-pointer ${
            note.completed
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-700'
          }`}
        >
          {note.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </button>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${meta.badgeBg} ${meta.badgeText}`}
            >
              <Icon className="w-3 h-3" />
              <span>{meta.label}</span>
            </span>

            {yearsCount && (
              <span className="text-[10px] font-extrabold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                {yearsCount} {note.type === 'wedding' ? 'Yrs Anniversary' : 'Yrs'}
              </span>
            )}

            {note.reminderEnabled && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md">
                <Bell className="w-2.5 h-2.5" />
                <span>
                  {note.reminderTime ? formatReminderTime12h(note.reminderTime) : 'Reminder ON'}
                  {note.remindDaysBefore ? ` · -${note.remindDaysBefore}d` : ''}
                </span>
              </span>
            )}

            <span className="text-[10px] font-semibold text-slate-400">{note.person}</span>
          </div>

          <p
            className={`text-sm font-bold mt-1 leading-snug ${
              note.completed ? 'line-through text-slate-400' : 'text-slate-900'
            }`}
          >
            {note.title}
          </p>

          {note.content && (
            <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
              {note.content}
            </p>
          )}

          {note.completed && note.completedBy && (
            <p className="text-[11px] font-semibold text-emerald-700 mt-1.5">
              Completed by {note.completedBy}
            </p>
          )}
        </div>

        {/* Edit & Delete Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEditNote(note)}
            aria-label="Edit note"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(note)}
            aria-label="Delete note"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Daily Notes &amp; Journey Calendar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track daily matters, all-days journey diary, birthdays &amp; wedding dates with phone alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAddNote(selectedDateISO, 'task')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Note / Task</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAddNote(selectedDateISO, 'birthday')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Cake className="w-4 h-4" />
            <span>Birthday / Wedding</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Strip */}
      <div className="grid grid-cols-3 gap-3 tabular-nums">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4">
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Today Pending</p>
          <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">{todayPendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4">
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{completedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4">
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Special Dates</p>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5">{specialDatesList.length}</p>
        </div>
      </div>

      {/* Upcoming Special Dates Highlight Banner (within 30 days) */}
      {upcomingSpecialIn30.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-rose-950">
                Upcoming Celebrations &amp; Special Dates
              </p>
              <p className="text-xs text-rose-800 mt-0.5">
                {upcomingSpecialIn30
                  .slice(0, 3)
                  .map((item) => {
                    const when =
                      item.daysLeft === 0
                        ? 'Today!'
                        : item.daysLeft === 1
                        ? 'Tomorrow'
                        : `in ${item.daysLeft}d`;
                    return `${item.note.title} (${when})`;
                  })
                  .join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSubView('special')}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition cursor-pointer shrink-0"
          >
            View All Dates
          </button>
        </div>
      )}

      {/* Sub-View Switcher */}
      <div className="grid grid-cols-3 sm:inline-flex p-1 bg-slate-200/70 rounded-2xl">
        {(
          [
            { id: 'calendar', label: 'Calendar' },
            { id: 'journey', label: 'All Days Journey' },
            { id: 'special', label: 'Birthdays & Dates' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubView(tab.id)}
            className={`min-h-[40px] px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              subView === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =========================================
          TAB 1: INTERACTIVE CALENDAR + DAY PANEL
         ========================================= */}
      {subView === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Calendar Card */}
          <section className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
            {/* Month Header */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{monthTitle}</h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleJumpToday}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleStepMonth(-1)}
                  aria-label="Previous month"
                  className="min-w-[34px] min-h-[34px] rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepMonth(1)}
                  aria-label="Next month"
                  className="min-w-[34px] min-h-[34px] rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-[11px] font-bold uppercase text-slate-400 py-1">
                  {w}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((cell) => {
                const dayNotes = dailyNotes.filter((n) => doesNoteAppearOnDate(n, cell.iso));
                const hasSpecial = dayNotes.some(
                  (n) => n.type === 'birthday' || n.type === 'wedding' || n.type === 'special_date'
                );
                const hasPendingTask = dayNotes.some((n) => n.type === 'task' && !n.completed);
                const hasJournal = dayNotes.some((n) => n.type === 'journal');
                const allDone =
                  dayNotes.length > 0 &&
                  dayNotes.every((n) => n.completed || n.type === 'birthday' || n.type === 'wedding') &&
                  dayNotes.some((n) => n.completed);

                const isSelected = cell.iso === selectedDateISO;
                const isToday = cell.iso === todayISO;

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelectedDateISO(cell.iso)}
                    className={`min-h-[52px] sm:min-h-[60px] p-1.5 rounded-2xl border flex flex-col items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : isToday
                        ? 'bg-indigo-50/90 text-indigo-950 border-indigo-300 font-extrabold'
                        : hasSpecial && cell.inMonth
                        ? 'bg-rose-50/60 text-slate-900 border-rose-200/80 hover:bg-rose-50'
                        : allDone && cell.inMonth
                        ? 'bg-emerald-50/50 text-slate-900 border-emerald-200/80 hover:bg-emerald-50'
                        : cell.inMonth
                        ? 'bg-white text-slate-800 border-slate-100 hover:bg-slate-50'
                        : 'bg-slate-50/50 text-slate-300 border-transparent'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold tabular-nums leading-none mt-0.5">
                      {cell.day}
                    </span>

                    {/* Visual indicators */}
                    <div className="flex items-center justify-center gap-1 min-h-[10px]">
                      {hasSpecial && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-rose-400' : 'bg-rose-500'
                          }`}
                          title="Birthday / Wedding / Special Date"
                        />
                      )}
                      {hasPendingTask && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-amber-300' : 'bg-indigo-500'
                          }`}
                          title="Pending Task"
                        />
                      )}
                      {hasJournal && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                          }`}
                          title="Daily Journey Note"
                        />
                      )}
                      {allDone && !hasPendingTask && !hasJournal && !hasSpecial && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-emerald-400' : 'bg-emerald-500'
                          }`}
                          title="Completed"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Pending Task</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Daily Journey / Done</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Birthday / Wedding / Event</span>
              </span>
            </div>
          </section>

          {/* Selected Day Panel */}
          <section className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  {selectedDateISO === todayISO ? 'Today' : 'Selected Day'}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {selectedDateLabel}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenAddNote(selectedDateISO, 'task')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add</span>
              </button>
            </div>

            {/* Fast Quick-Add Bar for the Selected Date */}
            <form onSubmit={handleQuickAdd} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickType('task')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    quickType === 'task'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Doing Matter
                </button>
                <button
                  type="button"
                  onClick={() => setQuickType('journal')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    quickType === 'journal'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Daily Journey
                </button>
                {quickType === 'task' && (
                  <div className="ml-auto flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <input
                      type="time"
                      aria-label="Quick reminder time"
                      value={quickReminderTime}
                      onChange={(e) => setQuickReminderTime(e.target.value)}
                      className="text-[11px] font-bold text-slate-800 outline-hidden bg-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={
                    quickType === 'task'
                      ? 'Quick add matter to do & remind...'
                      : 'Write a quick daily journey note...'
                  }
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  aria-label="Save quick note"
                  className="min-w-[38px] min-h-[38px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </form>

            {/* List of Notes & Events for Selected Date */}
            {selectedDayNotes.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No notes or events on this date</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                  Use the quick box above or add a birthday, wedding date, or task reminder.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenAddNote(selectedDateISO, 'birthday')}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Cake className="w-3.5 h-3.5" />
                  <span>Add Birthday / Wedding on this Day</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDayNotes.map((n) => renderNoteCard(n, selectedDateISO))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =========================================
          TAB 2: ALL DAYS JOURNEY TIMELINE
         ========================================= */}
      {subView === 'journey' && (
        <section className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search daily notes, tasks, memories, or dates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'journal', label: 'Journey' },
                  { id: 'special', label: 'Special Dates' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setJourneyFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    journeyFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {journeyGrouped.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center">
              <BookOpen className="w-9 h-9 text-slate-300 mx-auto mb-2.5" />
              <h4 className="text-sm font-bold text-slate-900">Your Daily Journey Starts Here</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Record daily tasks, doing matters, life notes, birthdays, and wedding anniversaries across every day.
              </p>
              <button
                type="button"
                onClick={() => onOpenAddNote(todayISO, 'journal')}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Write Today's First Note</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {journeyGrouped.map(([dateKey, items]) => {
                const parsed = parseLocalDateISO(dateKey);
                const prettyDate = parsed
                  ? parsed.toLocaleDateString('en-US', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : formatDateDDMMYYYY(dateKey);

                return (
                  <div
                    key={dateKey}
                    className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDateISO(dateKey);
                          const p = parseLocalDateISO(dateKey);
                          if (p) setViewMonth({ year: p.getFullYear(), month: p.getMonth() });
                          setSubView('calendar');
                        }}
                        className="flex items-center gap-2 text-left group cursor-pointer"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                        <span className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
                          {prettyDate}
                        </span>
                        {dateKey === todayISO && (
                          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                            Today
                          </span>
                        )}
                      </button>
                      <span className="text-[11px] font-bold text-slate-400">
                        {items.filter((i) => i.completed).length}/{items.length} done
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {items.map((n) => renderNoteCard(n, dateKey))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================
          TAB 3: BIRTHDAYS, WEDDING & SPECIAL DATES
         ========================================= */}
      {subView === 'special' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Birthdays, Wedding Dates &amp; Important Days ({specialDatesList.length})
              </h3>
              <p className="text-xs text-slate-500">
                Yearly automatic phone notifications with sound before and on the celebration date
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAddNote(todayISO, 'birthday')}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Cake className="w-3.5 h-3.5" />
                <span>+ Birthday</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAddNote(todayISO, 'wedding')}
                className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>+ Wedding Date</span>
              </button>
            </div>
          </div>

          {specialDatesList.length === 0 ? (
            <div className="bg-rose-50/40 rounded-3xl border border-dashed border-rose-300 p-8 text-center">
              <Cake className="w-9 h-9 text-rose-400 mx-auto mb-2.5" />
              <h4 className="text-sm font-bold text-slate-900">No Birthdays or Wedding Dates Saved Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Save family birthdays, wedding anniversaries, and special dates once — your calendar highlights them every year and sends phone alerts automatically.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenAddNote(todayISO, 'birthday')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Cake className="w-4 h-4" />
                  <span>Add Birthday</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAddNote(todayISO, 'wedding')}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Heart className="w-4 h-4" />
                  <span>Add Wedding Date</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {specialDatesList.map(({ note, nextDate, daysLeft, years }) => {
                const meta = NOTE_META[note.type] || NOTE_META.special_date;
                const Icon = meta.icon;
                const nextDateISO = nextDate ? formatDateToISO(nextDate) : note.date;

                return (
                  <div
                    key={note.id}
                    className="bg-white rounded-2xl border border-rose-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${meta.badgeBg} ${meta.badgeText}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-extrabold text-slate-900 truncate">{note.title}</h4>
                            {years && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                                {years} {note.type === 'wedding' ? 'Yrs' : 'Yrs Old'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Original Date: <strong>{formatDateDDMMYYYY(note.date)}</strong>
                          </p>
                          {note.content && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{note.content}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditNote(note)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(note)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600">
                        Next: <strong>{formatDateDDMMYYYY(nextDateISO)}</strong>
                        {note.reminderEnabled && note.reminderTime && (
                          <span className="text-amber-700 font-semibold">
                            {' '}· {formatReminderTime12h(note.reminderTime)}
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg tabular-nums ${
                          daysLeft === 0
                            ? 'bg-rose-600 text-white'
                            : daysLeft <= 7
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {daysLeft === 0
                          ? 'Today!'
                          : daysLeft === 1
                          ? 'Tomorrow'
                          : `In ${daysLeft} days`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Delete Confirmation Yes/No Popup */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
          onClick={() => setDeleteTarget(null)}
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
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Delete this note?</h3>
            <p className="text-xs text-slate-500 mt-1">
              "{deleteTarget.title}" ({formatDateDDMMYYYY(deleteTarget.date)}) will be permanently removed from your calendar and reminders.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDailyNote(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
