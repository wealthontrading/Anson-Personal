import {
  BorrowLendRecord,
  DailyNote,
  HealthInsurancePolicy,
  Loan,
  PaymentFrequency,
  Person,
  Transaction,
} from '../types/finance';
import { CATEGORY_DETAILS, INCOME_SOURCE_DETAILS, formatDateDDMMYYYY, formatINR, formatMonthName } from './formatters';

export type EmiReminderSlotId = '06:00' | '12:00' | '22:00';

export interface EmiReminderSlot {
  id: EmiReminderSlotId;
  hour: number;
  minute: number;
  label: string;
}

export const EMI_REMINDER_SLOTS: EmiReminderSlot[] = [
  { id: '06:00', hour: 6, minute: 0, label: '6:00 AM' },
  { id: '12:00', hour: 12, minute: 0, label: '12:00 PM' },
  { id: '22:00', hour: 22, minute: 0, label: '10:00 PM' },
];

export type AppNotificationKind =
  | 'transaction'
  | 'emi_reminder'
  | 'note_reminder'
  | 'note_completed'
  | 'system';

export interface AppNotificationPayload {
  id: string;
  title: string;
  body: string;
  kind: AppNotificationKind;
  createdAt: number;
}

const DEVICE_ID_KEY = 'anson_dona_device_id_v1';
const EMI_REMINDER_LOG_KEY = 'anson_dona_emi_slot_log_v1';
const NOTE_REMINDER_LOG_KEY = 'anson_dona_note_rem_log_v1';
const SOUND_ENABLED_KEY = 'anson_dona_notif_sound_v1';

// ==========================================
// WEB AUDIO HARMONIC NOTIFICATION CHIME
// ==========================================
let sharedAudioCtx: AudioContext | null = null;
let audioListenersAttached = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return sharedAudioCtx;
}

export function isNotificationSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(SOUND_ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabledStored(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  } catch {}
}

export async function unlockNotificationAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {}
  }
}

export function setupAudioUnlockListeners(): void {
  if (typeof window === 'undefined' || audioListenersAttached) return;
  audioListenersAttached = true;

  const unlock = () => {
    void unlockNotificationAudio();
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
}

// Initialize listeners passively on module load in browser
if (typeof window !== 'undefined') {
  setupAudioUnlockListeners();
}

export async function playNotificationSound(
  kind: AppNotificationKind = 'system',
  forcePlay = false
): Promise<void> {
  if (!forcePlay && !isNotificationSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime;

    // Gentle crystal chime melodies (sine + soft triangle overtone, zero harshness)
    const notes: Array<{ freq: number; delay: number; duration: number; gain: number }> =
      kind === 'emi_reminder'
        ? [
            // Warm 3-note ascending bell: G5 -> B5 -> D6
            { freq: 783.99, delay: 0, duration: 0.28, gain: 0.14 },
            { freq: 987.77, delay: 0.12, duration: 0.3, gain: 0.14 },
            { freq: 1174.66, delay: 0.24, duration: 0.48, gain: 0.16 },
          ]
        : kind === 'note_completed'
        ? [
            // Bright celebratory completion chime: C6 -> E6 -> G6
            { freq: 1046.5, delay: 0, duration: 0.2, gain: 0.14 },
            { freq: 1318.51, delay: 0.09, duration: 0.22, gain: 0.14 },
            { freq: 1567.98, delay: 0.18, duration: 0.45, gain: 0.16 },
          ]
        : kind === 'note_reminder'
        ? [
            // Warm calendar reminder bell: F5 -> A5 -> C6
            { freq: 698.46, delay: 0, duration: 0.25, gain: 0.14 },
            { freq: 880.0, delay: 0.12, duration: 0.28, gain: 0.14 },
            { freq: 1046.5, delay: 0.24, duration: 0.45, gain: 0.15 },
          ]
        : kind === 'transaction'
        ? [
            // Crisp pleasant 2-note chime: C6 -> G6
            { freq: 1046.5, delay: 0, duration: 0.24, gain: 0.14 },
            { freq: 1567.98, delay: 0.11, duration: 0.42, gain: 0.15 },
          ]
        : [
            // Soft chime: A5 -> E6
            { freq: 880.0, delay: 0, duration: 0.24, gain: 0.13 },
            { freq: 1318.51, delay: 0.11, duration: 0.38, gain: 0.14 },
          ];

    for (const n of notes) {
      const start = now + n.delay;

      // Primary warm sine tone
      const oscMain = ctx.createOscillator();
      const gainMain = ctx.createGain();
      oscMain.type = 'sine';
      oscMain.frequency.setValueAtTime(n.freq, start);

      gainMain.gain.setValueAtTime(0.0001, start);
      gainMain.gain.linearRampToValueAtTime(n.gain, start + 0.015);
      gainMain.gain.exponentialRampToValueAtTime(0.0001, start + n.duration);

      oscMain.connect(gainMain);
      gainMain.connect(ctx.destination);
      oscMain.start(start);
      oscMain.stop(start + n.duration + 0.02);

      // Subtle harmonic shimmer (1 octave higher, very soft)
      const oscHarm = ctx.createOscillator();
      const gainHarm = ctx.createGain();
      oscHarm.type = 'triangle';
      oscHarm.frequency.setValueAtTime(n.freq * 2, start);

      gainHarm.gain.setValueAtTime(0.0001, start);
      gainHarm.gain.linearRampToValueAtTime(n.gain * 0.18, start + 0.012);
      gainHarm.gain.exponentialRampToValueAtTime(0.0001, start + n.duration * 0.65);

      oscHarm.connect(gainHarm);
      gainHarm.connect(ctx.destination);
      oscHarm.start(start);
      oscHarm.stop(start + n.duration + 0.02);
    }
  } catch {
    // Audio playback blocked or unavailable in current environment
  }
}

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `dev-session-${Date.now()}`;
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

export async function showPhoneNotification(options: {
  title: string;
  body: string;
  tag?: string;
  kind?: AppNotificationKind;
  onInAppNotify?: (payload: AppNotificationPayload) => void;
}): Promise<void> {
  const { title, body, tag, kind = 'system', onInAppNotify } = options;

  // 1. Always notify inside the active app UI
  if (onInAppNotify) {
    onInAppNotify({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      kind,
      createdAt: Date.now(),
    });
  }

  // 2. Play nice chime sound when sound notifications are enabled
  void playNotificationSound(kind);

  // 3. Gentle phone vibration when available
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([120, 60, 120]);
    } catch {}
  }

  // 4. OS / Browser Push Notification (ServiceWorker first for Android/PWA compatibility)
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const notifOptions: NotificationOptions = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: tag || `ad-finance-${Date.now()}`,
  };

  try {
    if ('serviceWorker' in navigator) {
      const existingReg = await navigator.serviceWorker.getRegistration();
      const readyReg =
        existingReg ||
        (await Promise.race<ServiceWorkerRegistration | undefined>([
          navigator.serviceWorker.ready,
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 800)),
        ]));

      if (readyReg && typeof readyReg.showNotification === 'function') {
        await readyReg.showNotification(title, notifOptions);
        return;
      }
    }
  } catch {
    // Fallback to standard Notification API below
  }

  try {
    new Notification(title, notifOptions);
  } catch {
    // Ignore environments where window.Notification constructor is disallowed
  }
}

export function formatTransactionNotification(tx: Transaction): { title: string; body: string } {
  const typeLabel =
    tx.type === 'income'
      ? 'Income'
      : tx.type === 'transfer'
      ? 'Transfer'
      : tx.type === 'emi_payment'
      ? 'EMI Payment'
      : 'Expense';

  const catLabel =
    (tx.category && CATEGORY_DETAILS[tx.category as keyof typeof CATEGORY_DETAILS]?.label) ||
    (tx.category && INCOME_SOURCE_DETAILS[tx.category as keyof typeof INCOME_SOURCE_DETAILS]?.label) ||
    tx.category ||
    '';

  const title = `New ${typeLabel} added by ${tx.person}`;
  const body = `${tx.title} — ${formatINR(tx.amount)}${catLabel ? ` (${catLabel})` : ''}`;
  return { title, body };
}

function getLocalTodayISO(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ==========================================
// EMI DATE, FREQUENCY & REMINDER CALCULATOR
// ==========================================
export function parseLocalDateISO(iso?: string): Date | null {
  if (!iso || typeof iso !== 'string') return null;
  const parts = iso.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const dt = new Date(y, m, d);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

export function formatDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getLoanFrequency(loan: Loan): PaymentFrequency {
  if (loan.paymentFrequency === 'monthly' || loan.paymentFrequency === 'quarterly' || loan.paymentFrequency === 'yearly') {
    return loan.paymentFrequency;
  }
  return loan.type === 'gold_loan' ? 'quarterly' : 'monthly';
}

export function getFrequencyStepMonths(freq: PaymentFrequency): number {
  if (freq === 'yearly') return 12;
  if (freq === 'quarterly') return 3;
  return 1;
}

export function addMonthsClamped(baseDate: Date, monthsToAdd: number, anchorDay: number): Date {
  const targetMonthIndex = baseDate.getMonth() + monthsToAdd;
  const temp = new Date(baseDate.getFullYear(), targetMonthIndex, 1);
  const y = temp.getFullYear();
  const m = temp.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(Math.max(1, anchorDay), daysInMonth));
}

export function getLoanQuarterlyInterest(loan: Loan): number {
  if (typeof loan.quarterlyInterest === 'number' && loan.quarterlyInterest > 0) {
    return loan.quarterlyInterest;
  }
  const basePrincipal = loan.outstandingPrincipal > 0 ? loan.outstandingPrincipal : loan.originalAmount;
  if (basePrincipal > 0 && loan.interestRate > 0) {
    return Math.round((basePrincipal * (loan.interestRate / 100)) / 4);
  }
  if (typeof loan.totalInterest === 'number' && loan.totalInterest > 0) {
    return Math.round(loan.totalInterest / 4);
  }
  return Math.round((loan.monthlyEmi || 0) * 3);
}

export function getLoanTotalInterest(loan: Loan): number {
  if (typeof loan.totalInterest === 'number' && loan.totalInterest > 0) {
    return loan.totalInterest;
  }
  const basePrincipal = loan.originalAmount || loan.outstandingPrincipal;
  if (basePrincipal > 0 && loan.interestRate > 0) {
    const years = Math.max(1, (loan.tenureMonths || 12) / 12);
    if (loan.type === 'gold_loan') {
      return Math.round(basePrincipal * (loan.interestRate / 100) * years);
    }
    const totalPayable = (loan.monthlyEmi || 0) * (loan.tenureMonths || 12);
    return Math.max(0, Math.round(totalPayable - basePrincipal));
  }
  return 0;
}

export function getLoanScheduledPaymentAmount(loan: Loan, overrideFreq?: PaymentFrequency): number {
  const freq = overrideFreq || getLoanFrequency(loan);
  if (loan.type === 'gold_loan') {
    const qInt = getLoanQuarterlyInterest(loan);
    if (freq === 'quarterly') return qInt || loan.monthlyEmi;
    if (freq === 'yearly') return (qInt ? qInt * 4 : getLoanTotalInterest(loan)) || loan.monthlyEmi * 12;
    return Math.round((qInt ? qInt / 3 : loan.monthlyEmi) || 0);
  }
  if (freq === 'quarterly') return Math.round((loan.monthlyEmi || 0) * 3);
  if (freq === 'yearly') return Math.round((loan.monthlyEmi || 0) * 12);
  return Math.round(loan.monthlyEmi || 0);
}

export function getLoanPeriodInterestEstimate(loan: Loan, freq: PaymentFrequency): number {
  const basePrincipal = loan.outstandingPrincipal > 0 ? loan.outstandingPrincipal : loan.originalAmount;
  if (loan.type === 'gold_loan') {
    const qInt = getLoanQuarterlyInterest(loan);
    if (freq === 'quarterly') return qInt;
    if (freq === 'yearly') return qInt * 4;
    return Math.round(qInt / 3);
  }
  const monthlyRate = (loan.interestRate || 0) / 100 / 12;
  const months = getFrequencyStepMonths(freq);
  if (basePrincipal > 0 && monthlyRate > 0) {
    return Math.round(basePrincipal * monthlyRate * months);
  }
  return 0;
}

export function getLoanPaidAmount(loan: Loan, transactions: Transaction[]): number {
  const fromTx = transactions
    .filter((tx) => tx.type === 'emi_payment' && tx.loanId === loan.id)
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  return (loan.initialPaidAmount || 0) + fromTx;
}

export function isLoanCyclePaid(
  loan: Loan,
  dueDate: Date,
  transactions: Transaction[],
  freq: PaymentFrequency = getLoanFrequency(loan)
): boolean {
  const dueMonthStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
  const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();

  return transactions.some((tx) => {
    if (tx.type !== 'emi_payment' || tx.loanId !== loan.id) return false;
    if (freq === 'monthly' && (tx.date || '').startsWith(dueMonthStr)) return true;

    const txDt = parseLocalDateISO(tx.date);
    if (!txDt) return false;
    const txMidnight = new Date(txDt.getFullYear(), txDt.getMonth(), txDt.getDate()).getTime();
    const diffDaysFromDue = Math.round((txMidnight - dueMidnight) / 86400000);

    if (freq === 'monthly') {
      return diffDaysFromDue >= -12 && diffDaysFromDue <= 12;
    }
    if (freq === 'quarterly') {
      return diffDaysFromDue >= -45 && diffDaysFromDue <= 25;
    }
    return diffDaysFromDue >= -90 && diffDaysFromDue <= 30;
  });
}

export function getNextDueDateForLoan(
  loan: Loan,
  transactions: Transaction[] = [],
  now: Date = new Date()
): Date {
  const freq = getLoanFrequency(loan);
  const stepMonths = getFrequencyStepMonths(freq);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const parsedDue = parseLocalDateISO(loan.emiDueDate);
  const rawDueDay = Math.max(1, Math.min(31, Number(loan.emiDueDay) || parsedDue?.getDate() || 1));

  let candidate: Date;
  if (parsedDue) {
    candidate = new Date(parsedDue.getFullYear(), parsedDue.getMonth(), parsedDue.getDate());
  } else {
    const daysInCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    candidate = new Date(now.getFullYear(), now.getMonth(), Math.min(rawDueDay, daysInCurrent));
  }

  let guard = 0;
  while (guard < 240) {
    const candidateMidnight = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
    const diffFromToday = Math.round((candidateMidnight.getTime() - todayMidnight.getTime()) / 86400000);
    const paid = isLoanCyclePaid(loan, candidateMidnight, transactions, freq);

    // If due date is in the future (or today) and unpaid -> this is the next due date
    if (diffFromToday >= 0 && !paid) {
      return candidateMidnight;
    }
    // If due date passed slightly (up to 5 days ago) and still unpaid, advance only if already paid or > 0 days past?
    // Advancing once today passes ensures upcoming reminder date always stays fresh; overdue is handled separately.
    candidate = addMonthsClamped(candidateMidnight, stepMonths, rawDueDay);
    guard++;
  }

  return candidate;
}

export function getReminderWindowStart(dueDate: Date): Date {
  const start = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  start.setDate(start.getDate() - 5);
  return start;
}

export function getActiveEmiSlot(now: Date = new Date()): EmiReminderSlot | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 22 * 60) return EMI_REMINDER_SLOTS[2]; // 10:00 PM
  if (mins >= 12 * 60) return EMI_REMINDER_SLOTS[1]; // 12:00 PM
  if (mins >= 6 * 60) return EMI_REMINDER_SLOTS[0]; // 6:00 AM
  return null;
}

export function getMsUntilNextEmiSlot(now: Date = new Date()): number {
  const candidates = EMI_REMINDER_SLOTS.map((slot) => {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), slot.hour, slot.minute, 2, 0);
    if (dt.getTime() <= now.getTime()) {
      dt.setDate(dt.getDate() + 1);
    }
    return dt.getTime() - now.getTime();
  });
  return Math.min(...candidates);
}

export interface EligibleEmiInfo {
  loan: Loan;
  daysUntilDue: number;
  dueDate: Date;
  dueDateStr: string;
  dueDay: number;
  targetMonthStr: string;
  scheduledAmount: number;
  frequency: PaymentFrequency;
}

export function getEligibleEmiReminders(
  loans: Loan[],
  transactions: Transaction[],
  now: Date = new Date()
): EligibleEmiInfo[] {
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const results: EligibleEmiInfo[] = [];

  loans.forEach((loan) => {
    if (loan.status === 'closed') return;
    const frequency = getLoanFrequency(loan);
    const nextDue = getNextDueDateForLoan(loan, transactions, now);
    const diffDays = Math.round((nextDue.getTime() - todayMidnight.getTime()) / 86400000);

    if (diffDays >= 0 && diffDays <= 5) {
      const alreadyPaid = isLoanCyclePaid(loan, nextDue, transactions, frequency);
      if (!alreadyPaid) {
        const y = nextDue.getFullYear();
        const m = nextDue.getMonth();
        const targetMonthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
        results.push({
          loan,
          daysUntilDue: diffDays,
          dueDate: nextDue,
          dueDateStr: formatDateDDMMYYYY(formatDateToISO(nextDue)),
          dueDay: nextDue.getDate(),
          targetMonthStr,
          scheduledAmount: getLoanScheduledPaymentAmount(loan, frequency),
          frequency,
        });
      }
    }
  });

  return results;
}

function readEmiLog(): Record<string, number> {
  try {
    const raw = localStorage.getItem(EMI_REMINDER_LOG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeEmiLog(log: Record<string, number>, todayISO: string): void {
  try {
    // Keep only entries from today to prevent localStorage bloat
    const pruned: Record<string, number> = {};
    for (const [k, v] of Object.entries(log)) {
      if (k.includes(`_${todayISO}_`)) {
        pruned[k] = v;
      }
    }
    localStorage.setItem(EMI_REMINDER_LOG_KEY, JSON.stringify(pruned));
  } catch {}
}

export async function checkAndTriggerEmiReminders(params: {
  loans: Loan[];
  transactions: Transaction[];
  enabled: boolean;
  onInAppNotify?: (payload: AppNotificationPayload) => void;
}): Promise<number> {
  const { loans, transactions, enabled, onInAppNotify } = params;
  if (!enabled) return 0;

  const now = new Date();
  const activeSlot = getActiveEmiSlot(now);
  if (!activeSlot) return 0;

  const eligible = getEligibleEmiReminders(loans, transactions, now);
  if (eligible.length === 0) return 0;

  const todayISO = getLocalTodayISO(now);
  const log = readEmiLog();
  let sentCount = 0;

  for (const item of eligible) {
    const dedupKey = `${item.loan.id}_${todayISO}_${activeSlot.id}`;
    if (log[dedupKey]) continue;

    log[dedupKey] = Date.now();
    sentCount += 1;

    const kindLabel = item.loan.type === 'gold_loan' ? 'Gold Loan' : 'EMI';
    const title =
      item.daysUntilDue === 0
        ? `${kindLabel} Due Today (${activeSlot.label}): ${item.loan.name}`
        : `${kindLabel} Due in ${item.daysUntilDue} ${item.daysUntilDue === 1 ? 'day' : 'days'} (${activeSlot.label})`;

    const body =
      item.daysUntilDue === 0
        ? `${formatINR(item.scheduledAmount)} (${item.frequency}) for ${item.loan.name} (${item.loan.owner}) is due today (${item.dueDateStr}).`
        : `${item.loan.name} (${item.loan.owner}) — ${formatINR(item.scheduledAmount)} (${item.frequency}) due on ${item.dueDateStr}.`;

    await showPhoneNotification({
      title,
      body,
      tag: `emi-${dedupKey}`,
      kind: 'emi_reminder',
      onInAppNotify,
    });
  }

  if (sentCount > 0) {
    writeEmiLog(log, todayISO);
  }

  return sentCount;
}

// ==========================================
// SEPARATE LOAN COMMITMENTS (MONTHLY / QUARTERLY / YEARLY)
// & 1ST OF EVERY MONTH ALL-ACCOUNTS NOTIFICATION
// ==========================================

const FIRST_OF_MONTH_COMMITMENT_LOG_KEY = 'anson_dona_first_of_month_emi_v1';

export interface FrequencyCommitmentGroup {
  total: number;
  count: number;
  loans: Loan[];
}

export interface LoanCommitmentBreakdown {
  monthly: FrequencyCommitmentGroup;
  quarterly: FrequencyCommitmentGroup;
  yearly: FrequencyCommitmentGroup;
  dueThisMonthTotal: number;
  dueThisMonthCount: number;
  monthlyByOwner: {
    Anson: number;
    Dona: number;
  };
}

export function calculateLoanCommitments(
  loans: Loan[],
  transactions: Transaction[] = [],
  now: Date = new Date()
): LoanCommitmentBreakdown {
  const activeLoans = loans.filter((l) => l.status !== 'closed');

  const monthlyLoans: Loan[] = [];
  const quarterlyLoans: Loan[] = [];
  const yearlyLoans: Loan[] = [];

  let monthlyTotal = 0;
  let quarterlyTotal = 0;
  let yearlyTotal = 0;
  let dueThisMonthTotal = 0;
  let dueThisMonthCount = 0;
  let ansonMonthly = 0;
  let donaMonthly = 0;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  activeLoans.forEach((loan) => {
    const freq = getLoanFrequency(loan);
    const scheduledAmt = getLoanScheduledPaymentAmount(loan, freq);

    if (freq === 'monthly') {
      monthlyLoans.push(loan);
      monthlyTotal += scheduledAmt;
      if (loan.owner === 'Anson') ansonMonthly += scheduledAmt;
      if (loan.owner === 'Dona') donaMonthly += scheduledAmt;
      dueThisMonthTotal += scheduledAmt;
      dueThisMonthCount += 1;
    } else if (freq === 'quarterly') {
      quarterlyLoans.push(loan);
      quarterlyTotal += scheduledAmt;
      const nextDue = getNextDueDateForLoan(loan, transactions, now);
      if (nextDue.getFullYear() === currentYear && nextDue.getMonth() === currentMonth) {
        dueThisMonthTotal += scheduledAmt;
        dueThisMonthCount += 1;
      }
    } else {
      yearlyLoans.push(loan);
      yearlyTotal += scheduledAmt;
      const nextDue = getNextDueDateForLoan(loan, transactions, now);
      if (nextDue.getFullYear() === currentYear && nextDue.getMonth() === currentMonth) {
        dueThisMonthTotal += scheduledAmt;
        dueThisMonthCount += 1;
      }
    }
  });

  return {
    monthly: { total: monthlyTotal, count: monthlyLoans.length, loans: monthlyLoans },
    quarterly: { total: quarterlyTotal, count: quarterlyLoans.length, loans: quarterlyLoans },
    yearly: { total: yearlyTotal, count: yearlyLoans.length, loans: yearlyLoans },
    dueThisMonthTotal,
    dueThisMonthCount,
    monthlyByOwner: {
      Anson: ansonMonthly,
      Dona: donaMonthly,
    },
  };
}

export function buildFirstOfMonthCommitmentNotification(
  loans: Loan[],
  transactions: Transaction[] = [],
  now: Date = new Date()
): { title: string; body: string; hasCommitments: boolean } {
  const breakdown = calculateLoanCommitments(loans, transactions, now);
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = formatMonthName(ym);

  const hasMonthly = breakdown.monthly.count > 0;
  const hasAny =
    breakdown.monthly.count > 0 || breakdown.quarterly.count > 0 || breakdown.yearly.count > 0;

  if (!hasAny) {
    return {
      title: `Monthly Loan Commitment (${monthLabel})`,
      body: 'No active loan commitments scheduled across Anson & Dona accounts this month.',
      hasCommitments: false,
    };
  }

  const title = `Monthly Commitment Reminder — ${monthLabel}`;
  const parts: string[] = [];

  if (hasMonthly) {
    parts.push(
      `Monthly: ${formatINR(breakdown.monthly.total)} (${breakdown.monthly.count} ${
        breakdown.monthly.count === 1 ? 'loan' : 'loans'
      })`
    );
  }
  if (breakdown.quarterly.count > 0) {
    parts.push(`Quarterly: ${formatINR(breakdown.quarterly.total)}/qtr`);
  }
  if (breakdown.yearly.count > 0) {
    parts.push(`Yearly: ${formatINR(breakdown.yearly.total)}/yr`);
  }

  const ownerParts: string[] = [];
  if (breakdown.monthlyByOwner.Anson > 0) {
    ownerParts.push(`Anson ${formatINR(breakdown.monthlyByOwner.Anson)}`);
  }
  if (breakdown.monthlyByOwner.Dona > 0) {
    ownerParts.push(`Dona ${formatINR(breakdown.monthlyByOwner.Dona)}`);
  }

  const ownerSuffix = ownerParts.length > 0 ? ` · All Accounts (${ownerParts.join(', ')})` : ' · All Accounts';

  return {
    title,
    body: `${parts.join(' | ')}${ownerSuffix}`,
    hasCommitments: true,
  };
}

export async function checkAndTriggerFirstOfMonthCommitmentNotification(params: {
  loans: Loan[];
  transactions: Transaction[];
  enabled: boolean;
  onInAppNotify?: (payload: AppNotificationPayload) => void;
}): Promise<boolean> {
  const { loans, transactions, enabled, onInAppNotify } = params;
  if (!enabled || loans.length === 0) return false;

  const now = new Date();
  // Only auto-trigger on the 1st day of the month (from 6:00 AM onwards)
  if (now.getDate() !== 1) return false;
  if (now.getHours() < 6) return false;

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  try {
    const lastSentMonth = localStorage.getItem(FIRST_OF_MONTH_COMMITMENT_LOG_KEY);
    if (lastSentMonth === monthKey) return false;
  } catch {}

  const { title, body, hasCommitments } = buildFirstOfMonthCommitmentNotification(loans, transactions, now);
  if (!hasCommitments) return false;

  try {
    localStorage.setItem(FIRST_OF_MONTH_COMMITMENT_LOG_KEY, monthKey);
  } catch {}

  await showPhoneNotification({
    title,
    body,
    tag: `first-of-month-emi-${monthKey}`,
    kind: 'emi_reminder',
    onInAppNotify,
  });

  return true;
}

// ==========================================
// DAILY NOTES, JOURNEY & SPECIAL DATE REMINDERS
// ==========================================

export function formatReminderTime12h(time24?: string): string {
  if (!time24 || !time24.includes(':')) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function doesNoteAppearOnDate(note: DailyNote, dateISO: string): boolean {
  if (!note.date || !dateISO) return false;
  if (note.date === dateISO) return true;
  if (note.repeatYearly || note.type === 'birthday' || note.type === 'wedding') {
    const noteParts = note.date.split('-');
    const targetParts = dateISO.split('-');
    if (noteParts.length === 3 && targetParts.length === 3) {
      // Handle Feb 29 on non-leap years as Feb 28
      if (noteParts[1] === '02' && noteParts[2] === '29') {
        const y = parseInt(targetParts[0], 10);
        const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
        if (!isLeap && targetParts[1] === '02' && targetParts[2] === '28') {
          return true;
        }
      }
      return noteParts[1] === targetParts[1] && noteParts[2] === targetParts[2];
    }
  }
  return false;
}

export function getNextOccurrenceForNote(note: DailyNote, now: Date = new Date()): Date | null {
  const parsed = parseLocalDateISO(note.date);
  if (!parsed) return null;
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const isYearly = Boolean(note.repeatYearly || note.type === 'birthday' || note.type === 'wedding');
  if (!isYearly) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  const month = parsed.getMonth();
  const day = parsed.getDate();

  const buildForYear = (yr: number) => {
    const daysInMonth = new Date(yr, month + 1, 0).getDate();
    return new Date(yr, month, Math.min(day, daysInMonth));
  };

  let candidate = buildForYear(now.getFullYear());
  if (candidate.getTime() < todayMidnight.getTime()) {
    candidate = buildForYear(now.getFullYear() + 1);
  }
  return candidate;
}

export function getDaysUntilNextNoteDate(note: DailyNote, now: Date = new Date()): number {
  const nextDt = getNextOccurrenceForNote(note, now);
  if (!nextDt) return 9999;
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((nextDt.getTime() - todayMidnight.getTime()) / 86400000);
}

export function getYearsCountForNote(note: DailyNote, referenceDate: Date = new Date()): number | null {
  const parsed = parseLocalDateISO(note.date);
  if (!parsed) return null;
  const diff = referenceDate.getFullYear() - parsed.getFullYear();
  return diff > 0 ? diff : null;
}

export function formatNoteCompletedNotification(
  note: DailyNote,
  completedBy: Person
): { title: string; body: string } {
  const label =
    note.type === 'birthday'
      ? 'Birthday'
      : note.type === 'wedding'
      ? 'Wedding Event'
      : note.type === 'special_date'
      ? 'Event'
      : note.type === 'journal'
      ? 'Daily Note'
      : 'Task';

  return {
    title: `${label} Completed by ${completedBy}`,
    body: `${note.title}${note.date ? ` (${formatDateDDMMYYYY(note.date)})` : ''} is marked done!`,
  };
}

export function formatNewNoteNotification(note: DailyNote): { title: string; body: string } {
  const label =
    note.type === 'birthday'
      ? 'Birthday Reminder'
      : note.type === 'wedding'
      ? 'Wedding Date'
      : note.type === 'special_date'
      ? 'Special Date'
      : note.type === 'journal'
      ? 'Daily Journey Note'
      : 'Daily Task';

  return {
    title: `New ${label} added by ${note.person}`,
    body: `${note.title} — ${formatDateDDMMYYYY(note.date)}${
      note.reminderTime ? ` at ${formatReminderTime12h(note.reminderTime)}` : ''
    }`,
  };
}

function readNoteLog(): Record<string, number> {
  try {
    const raw = localStorage.getItem(NOTE_REMINDER_LOG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeNoteLog(log: Record<string, number>, todayISO: string): void {
  try {
    const pruned: Record<string, number> = {};
    for (const [k, v] of Object.entries(log)) {
      if (k.endsWith(`_${todayISO}`)) {
        pruned[k] = v;
      }
    }
    localStorage.setItem(NOTE_REMINDER_LOG_KEY, JSON.stringify(pruned));
  } catch {}
}

export async function checkAndTriggerNoteReminders(params: {
  notes: DailyNote[];
  enabled: boolean;
  onInAppNotify?: (payload: AppNotificationPayload) => void;
}): Promise<number> {
  const { notes, enabled, onInAppNotify } = params;
  if (!enabled || notes.length === 0) return 0;

  const now = new Date();
  const todayISO = getLocalTodayISO(now);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const log = readNoteLog();
  let sentCount = 0;

  for (const note of notes) {
    if (!note.reminderEnabled) continue;

    const isYearlySpecial = Boolean(
      note.repeatYearly || note.type === 'birthday' || note.type === 'wedding'
    );
    // Completed one-time tasks don't keep reminding; yearly special dates always remind every year
    if (note.completed && !isYearlySpecial) continue;

    const nextDt = getNextOccurrenceForNote(note, now);
    if (!nextDt) continue;

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((nextDt.getTime() - todayMidnight.getTime()) / 86400000);
    const leadDays = typeof note.remindDaysBefore === 'number' ? note.remindDaysBefore : isYearlySpecial ? 1 : 0;

    if (diffDays < 0 || diffDays > leadDays) continue;

    // Check configured reminder time (default 08:00 for special dates, 09:00 for tasks/notes)
    const defaultTime = isYearlySpecial ? '08:00' : '09:00';
    const timeStr = note.reminderTime || defaultTime;
    const [hStr, mStr] = timeStr.split(':');
    const targetMins = (parseInt(hStr, 10) || 8) * 60 + (parseInt(mStr, 10) || 0);
    if (currentMins < targetMins) continue;

    const dedupKey = `${note.id}_${todayISO}`;
    if (log[dedupKey]) continue;

    log[dedupKey] = Date.now();
    sentCount += 1;

    const nextDateFormatted = formatDateDDMMYYYY(formatDateToISO(nextDt));
    const yearsCount = isYearlySpecial ? getYearsCountForNote(note, nextDt) : null;

    let title = '';
    let body = '';

    if (note.type === 'birthday') {
      title =
        diffDays === 0
          ? `Birthday Today: ${note.title}`
          : `Upcoming Birthday in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
      body =
        diffDays === 0
          ? `Wish ${note.title} a happy birthday today!${yearsCount ? ` (${yearsCount} years)` : ''}`
          : `${note.title} is on ${nextDateFormatted}${yearsCount ? ` (${yearsCount} years)` : ''}.`;
    } else if (note.type === 'wedding') {
      title =
        diffDays === 0
          ? `Wedding Anniversary Today: ${note.title}`
          : `Wedding Date in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
      body =
        diffDays === 0
          ? `Happy Anniversary! ${note.title}${yearsCount ? ` — ${yearsCount} years` : ''}.`
          : `${note.title} is on ${nextDateFormatted}${yearsCount ? ` (${yearsCount} years)` : ''}.`;
    } else if (note.type === 'special_date') {
      title =
        diffDays === 0
          ? `Special Date Today: ${note.title}`
          : `Upcoming Event in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
      body = `${note.title} — ${nextDateFormatted}${note.content ? ` · ${note.content}` : ''}`;
    } else {
      title =
        diffDays === 0
          ? `Daily Reminder: ${note.title}`
          : `Upcoming Task in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
      body = note.content
        ? `${note.content} (${nextDateFormatted})`
        : `Scheduled for ${nextDateFormatted}${note.reminderTime ? ` at ${formatReminderTime12h(note.reminderTime)}` : ''}.`;
    }

    await showPhoneNotification({
      title,
      body,
      tag: `note-${dedupKey}`,
      kind: 'note_reminder',
      onInAppNotify,
    });
  }

  if (sentCount > 0) {
    writeNoteLog(log, todayISO);
  }

  return sentCount;
}

// ==========================================
// HEALTH INSURANCE EMI REMINDERS
// ==========================================

const INSURANCE_REMINDER_LOG_KEY = 'anson_dona_health_ins_rem_v1';
const BORROW_LEND_REMINDER_LOG_KEY = 'anson_dona_borrow_lend_rem_v1';

export function getInsuranceScheduledAmount(policy: HealthInsurancePolicy): number {
  const freq = policy.paymentFrequency || 'monthly';
  if (freq === 'yearly') {
    return Math.round(policy.annualPremium || policy.monthlyEmi * 12 || 0);
  }
  if (freq === 'quarterly') {
    return Math.round(policy.monthlyEmi * 3 || (policy.annualPremium ? policy.annualPremium / 4 : 0));
  }
  return Math.round(policy.monthlyEmi || 0);
}

export function getInsuranceMonthlyEquivalent(policy: HealthInsurancePolicy): number {
  const freq = policy.paymentFrequency || 'monthly';
  if (freq === 'yearly') {
    return Math.round((policy.annualPremium || policy.monthlyEmi * 12 || 0) / 12);
  }
  if (freq === 'quarterly') {
    return Math.round(policy.monthlyEmi || (policy.annualPremium ? policy.annualPremium / 12 : 0));
  }
  return Math.round(policy.monthlyEmi || 0);
}

export function isInsuranceCyclePaid(
  policy: HealthInsurancePolicy,
  dueDate: Date,
  transactions: Transaction[]
): boolean {
  const freq = policy.paymentFrequency || 'monthly';
  const dueMonthStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
  const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();

  return transactions.some((tx) => {
    if (tx.insurancePolicyId !== policy.id) return false;
    if (freq === 'monthly' && (tx.date || '').startsWith(dueMonthStr)) return true;

    const txDt = parseLocalDateISO(tx.date);
    if (!txDt) return false;
    const txMidnight = new Date(txDt.getFullYear(), txDt.getMonth(), txDt.getDate()).getTime();
    const diffDaysFromDue = Math.round((txMidnight - dueMidnight) / 86400000);

    if (freq === 'monthly') return diffDaysFromDue >= -12 && diffDaysFromDue <= 12;
    if (freq === 'quarterly') return diffDaysFromDue >= -45 && diffDaysFromDue <= 25;
    return diffDaysFromDue >= -90 && diffDaysFromDue <= 30;
  });
}

export function getNextDueDateForInsurance(
  policy: HealthInsurancePolicy,
  transactions: Transaction[] = [],
  now: Date = new Date()
): Date {
  const freq = policy.paymentFrequency || 'monthly';
  const stepMonths = getFrequencyStepMonths(freq);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const parsedDue = parseLocalDateISO(policy.emiDueDate);
  const rawDueDay = Math.max(1, Math.min(31, Number(policy.emiDueDay) || parsedDue?.getDate() || 1));

  let candidate: Date;
  if (parsedDue) {
    candidate = new Date(parsedDue.getFullYear(), parsedDue.getMonth(), parsedDue.getDate());
  } else {
    const daysInCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    candidate = new Date(now.getFullYear(), now.getMonth(), Math.min(rawDueDay, daysInCurrent));
  }

  let guard = 0;
  while (guard < 240) {
    const candidateMidnight = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
    const diffFromToday = Math.round((candidateMidnight.getTime() - todayMidnight.getTime()) / 86400000);
    const paid = isInsuranceCyclePaid(policy, candidateMidnight, transactions);

    if (diffFromToday >= 0 && !paid) {
      return candidateMidnight;
    }
    candidate = addMonthsClamped(candidateMidnight, stepMonths, rawDueDay);
    guard++;
  }

  return candidate;
}

export interface EligibleInsuranceReminder {
  policy: HealthInsurancePolicy;
  daysUntilDue: number;
  dueDate: Date;
  dueDateStr: string;
  scheduledAmount: number;
}

export function getEligibleInsuranceReminders(
  policies: HealthInsurancePolicy[],
  transactions: Transaction[],
  now: Date = new Date()
): EligibleInsuranceReminder[] {
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const results: EligibleInsuranceReminder[] = [];

  policies.forEach((policy) => {
    if (policy.status === 'expired') return;
    const nextDue = getNextDueDateForInsurance(policy, transactions, now);
    const diffDays = Math.round((nextDue.getTime() - todayMidnight.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays <= 5) {
      if (!isInsuranceCyclePaid(policy, nextDue, transactions)) {
        results.push({
          policy,
          daysUntilDue: diffDays,
          dueDate: nextDue,
          dueDateStr: formatDateDDMMYYYY(formatDateToISO(nextDue)),
          scheduledAmount: getInsuranceScheduledAmount(policy),
        });
      }
    }
  });

  return results;
}

function readLocalLog(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalLog(key: string, log: Record<string, number>, todayISO: string): void {
  try {
    const pruned: Record<string, number> = {};
    for (const [k, v] of Object.entries(log)) {
      if (k.includes(todayISO)) {
        pruned[k] = v;
      }
    }
    localStorage.setItem(key, JSON.stringify(pruned));
  } catch {}
}

export async function checkAndTriggerInsuranceReminders(params: {
  policies: HealthInsurancePolicy[];
  transactions: Transaction[];
  enabled: boolean;
  onInAppNotify?: (payload: AppNotificationPayload) => void;
}): Promise<number> {
  const { policies, transactions, enabled, onInAppNotify } = params;
  if (!enabled || policies.length === 0) return 0;

  const now = new Date();
  const activeSlot = getActiveEmiSlot(now);
  if (!activeSlot) return 0;

  const eligible = getEligibleInsuranceReminders(policies, transactions, now);
  if (eligible.length === 0) return 0;

  const todayISO = getLocalTodayISO(now);
  const log = readLocalLog(INSURANCE_REMINDER_LOG_KEY);
  let sentCount = 0;

  for (const item of eligible) {
    const dedupKey = `${item.policy.id}_${todayISO}_${activeSlot.id}`;
    if (log[dedupKey]) continue;

    log[dedupKey] = Date.now();
    sentCount += 1;

    const title =
      item.daysUntilDue === 0
        ? `Health Insurance EMI Due Today (${activeSlot.label}): ${item.policy.policyName}`
        : `Health Insurance EMI in ${item.daysUntilDue} ${item.daysUntilDue === 1 ? 'day' : 'days'} (${activeSlot.label})`;

    const body =
      item.daysUntilDue === 0
        ? `${formatINR(item.scheduledAmount)} for ${item.policy.policyName} (${item.policy.insurer}) is due today (${item.dueDateStr}).`
        : `${item.policy.policyName} (${item.policy.insurer}) — ${formatINR(item.scheduledAmount)} due on ${item.dueDateStr}.`;

    await showPhoneNotification({
      title,
      body,
      tag: `health-ins-${dedupKey}`,
      kind: 'emi_reminder',
      onInAppNotify,
    });
  }

  if (sentCount > 0) {
    writeLocalLog(INSURANCE_REMINDER_LOG_KEY, log, todayISO);
  }

  return sentCount;
}

// ==========================================
// BORROWING & LENDING DUE DATE REMINDERS
// ==========================================

export async function checkAndTriggerBorrowLendReminders(params: {
  records: BorrowLendRecord[];
  enabled: boolean;
  onInAppNotify?: (payload: AppNotificationPayload) => void;
}): Promise<number> {
  const { records, enabled, onInAppNotify } = params;
  if (!enabled || records.length === 0) return 0;

  const now = new Date();
  // Remind from 8:00 AM onwards
  if (now.getHours() < 8) return 0;

  const todayISO = getLocalTodayISO(now);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const log = readLocalLog(BORROW_LEND_REMINDER_LOG_KEY);
  let sentCount = 0;

  for (const rec of records) {
    if (rec.status === 'settled' || !rec.reminderEnabled || !rec.dueDate) continue;
    const remaining = Math.max(0, rec.amount - (rec.paidAmount || 0));
    if (remaining <= 0) continue;

    const dueDt = parseLocalDateISO(rec.dueDate);
    if (!dueDt) continue;
    const dueMidnight = new Date(dueDt.getFullYear(), dueDt.getMonth(), dueDt.getDate());
    const diffDays = Math.round((dueMidnight.getTime() - todayMidnight.getTime()) / 86400000);

    // Remind 1 day before and on due date
    if (diffDays < 0 || diffDays > 1) continue;

    const dedupKey = `${rec.id}_${todayISO}`;
    if (log[dedupKey]) continue;

    log[dedupKey] = Date.now();
    sentCount += 1;

    const isLend = rec.type === 'lend';
    const title = isLend
      ? diffDays === 0
        ? `Money Return Due Today from ${rec.personName}`
        : `Money Return Tomorrow from ${rec.personName}`
      : diffDays === 0
      ? `Repayment Due Today to ${rec.personName}`
      : `Repayment Due Tomorrow to ${rec.personName}`;

    const body = isLend
      ? `${formatINR(remaining)} pending to receive from ${rec.personName} (${formatDateDDMMYYYY(rec.dueDate)}).`
      : `${formatINR(remaining)} pending to pay back to ${rec.personName} (${formatDateDDMMYYYY(rec.dueDate)}).`;

    await showPhoneNotification({
      title,
      body,
      tag: `borrow-lend-${dedupKey}`,
      kind: 'note_reminder',
      onInAppNotify,
    });
  }

  if (sentCount > 0) {
    writeLocalLog(BORROW_LEND_REMINDER_LOG_KEY, log, todayISO);
  }

  return sentCount;
}

