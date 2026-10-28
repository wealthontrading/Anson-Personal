import { ExpenseCategory, IncomeSource, LoanType, TransactionType } from '../types/finance';

/**
 * Formats a number to Indian Rupee (₹) representation.
 * Example: 150000 -> ₹1,50,000
 */
export function formatINR(amount: number, showDecimals: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const numStr = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return `${isNegative ? '-₹' : '₹'}${numStr}`;
}


/**
 * Formats an ISO date string (YYYY-MM-DD or ISO timestamp) to DD-MM-YYYY format.
 * Example: "2026-10-26" -> "26-10-2026"
 */
export function formatDateDDMMYYYY(dateInput: string | Date): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    // If it's already in DD-MM-YYYY or something similar
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
      const parts = dateInput.split('T')[0].split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
        }
        return dateInput;
      }
    }
    return String(dateInput);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Returns current date in YYYY-MM-DD for HTML input[type="date"]
 */
export function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthName(monthStr: string): string {
  // monthStr: "2026-10"
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export const CATEGORY_DETAILS: Record<ExpenseCategory, { label: string; icon: string; bg: string; text: string }> = {
  food: { label: 'Food & Dining', icon: 'Utensils', bg: 'bg-orange-50', text: 'text-orange-700' },
  groceries: { label: 'Groceries', icon: 'ShoppingCart', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rent: { label: 'House Rent', icon: 'Home', bg: 'bg-blue-50', text: 'text-blue-700' },
  electricity: { label: 'Electricity Bill', icon: 'Zap', bg: 'bg-amber-50', text: 'text-amber-700' },
  water: { label: 'Water Bill', icon: 'Droplets', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  internet: { label: 'Internet & WiFi', icon: 'Wifi', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  travel: { label: 'Travel & Trips', icon: 'Plane', bg: 'bg-sky-50', text: 'text-sky-700' },
  fuel: { label: 'Fuel / Petrol', icon: 'Fuel', bg: 'bg-yellow-50', text: 'text-yellow-800' },
  shopping: { label: 'Shopping', icon: 'ShoppingBag', bg: 'bg-pink-50', text: 'text-pink-700' },
  medical: { label: 'Medical & Healthcare', icon: 'HeartPulse', bg: 'bg-rose-50', text: 'text-rose-700' },
  insurance: { label: 'Insurance Premium', icon: 'ShieldCheck', bg: 'bg-teal-50', text: 'text-teal-700' },
  entertainment: { label: 'Entertainment / OTT', icon: 'Film', bg: 'bg-purple-50', text: 'text-purple-700' },
  family: { label: 'Family & Home', icon: 'Users', bg: 'bg-violet-50', text: 'text-violet-700' },
  education: { label: 'Education & Courses', icon: 'GraduationCap', bg: 'bg-emerald-50', text: 'text-emerald-800' },
  other: { label: 'Other Expense', icon: 'MoreHorizontal', bg: 'bg-slate-100', text: 'text-slate-700' },
};

export const INCOME_SOURCE_DETAILS: Record<IncomeSource, { label: string; icon: string; bg: string; text: string }> = {
  salary: { label: 'Monthly Salary', icon: 'Briefcase', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  business: { label: 'Business Income', icon: 'TrendingUp', bg: 'bg-blue-50', text: 'text-blue-700' },
  freelance: { label: 'Freelance / Consulting', icon: 'Laptop', bg: 'bg-violet-50', text: 'text-violet-700' },
  bonus: { label: 'Bonus / Incentive', icon: 'Award', bg: 'bg-amber-50', text: 'text-amber-700' },
  interest: { label: 'Interest & Dividends', icon: 'Percent', bg: 'bg-teal-50', text: 'text-teal-700' },
  rental: { label: 'Rental Income', icon: 'Key', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  other: { label: 'Other Income', icon: 'PlusCircle', bg: 'bg-slate-100', text: 'text-slate-700' },
};

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  home_loan: 'Home Loan',
  car_loan: 'Car Loan',
  personal_loan: 'Personal Loan',
  gold_loan: 'Gold Loan',
  education_loan: 'Education Loan',
  other: 'Other Loan',
};
