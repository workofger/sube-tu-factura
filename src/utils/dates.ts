/**
 * Date utilities for FacturaFlow AI
 * Includes Mexico timezone handling and deadline logic
 */

// Business constants
const MEXICO_TIMEZONE = 'America/Mexico_City';
const DEADLINE_HOUR = 10; // 10am
const DEADLINE_DAY = 4; // Thursday (0=Sunday, 4=Thursday)

/**
 * Get the ISO week number for a given date
 */
export const getWeekNumber = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

/**
 * Get the date range (Monday - Sunday) for a given date's week
 */
export const getWeekRange = (date: Date): string => {
  const day = date.getDay(); // 0 is Sunday
  const diffToMon = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  return `${formatDate(monday)} - ${formatDate(sunday)}`;
};

/**
 * Generate week options for current and previous week
 * @deprecated Use calculatePaymentWeek instead for automatic week calculation
 */
export const generateWeekOptions = (): { value: string; label: string }[] => {
  const today = new Date();
  const currentWeekNo = getWeekNumber(today);
  const currentRange = getWeekRange(today);
  
  const lastWeekDate = new Date(today);
  lastWeekDate.setDate(today.getDate() - 7);
  const prevWeekNo = getWeekNumber(lastWeekDate);
  const prevRange = getWeekRange(lastWeekDate);

  return [
    { value: currentWeekNo.toString(), label: `Semana ${currentWeekNo} (Actual): ${currentRange}` },
    { value: prevWeekNo.toString(), label: `Semana ${prevWeekNo} (Anterior): ${prevRange}` }
  ];
};

/**
 * Get current date/time in Mexico City timezone
 */
export function getMexicoNow(): Date {
  const now = new Date();
  // Get the Mexico time string
  const mexicoTimeStr = now.toLocaleString('en-US', { timeZone: MEXICO_TIMEZONE });
  return new Date(mexicoTimeStr);
}

/**
 * Get day of week for Mexico time (0 = Sunday, 4 = Thursday)
 */
export function getMexicoDayOfWeek(): number {
  return getMexicoNow().getDay();
}

/**
 * Get hour in Mexico time (0-23)
 */
export function getMexicoHour(): number {
  return getMexicoNow().getHours();
}

/**
 * Check if current time is after the deadline (Thursday 10am Mexico City)
 */
export function isAfterDeadline(): boolean {
  const mexicoNow = getMexicoNow();
  const dayOfWeek = mexicoNow.getDay(); // 0 = Sunday
  const hour = mexicoNow.getHours();

  // After Thursday (Friday = 5, Saturday = 6)
  if (dayOfWeek > DEADLINE_DAY && dayOfWeek < 7) {
    return true;
  }

  // Sunday (wrapped around)
  if (dayOfWeek === 0) {
    return true;
  }

  // Thursday after 10am
  if (dayOfWeek === DEADLINE_DAY && hour >= DEADLINE_HOUR) {
    return true;
  }

  return false;
}

/**
 * Get the valid invoice date range (Monday-Sunday of previous week)
 * For invoices to be on-time, invoice date must be within this range
 */
export function getValidInvoiceDateRange(): { start: Date; end: Date } {
  const mexicoNow = getMexicoNow();
  const dayOfWeek = mexicoNow.getDay(); // 0 = Sunday

  // Calculate previous week's Monday
  // If today is Sunday (0), go back 13 days to get last Monday
  // Otherwise, go back (current day + 6) days
  const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6;
  
  const lastMonday = new Date(mexicoNow);
  lastMonday.setDate(mexicoNow.getDate() - daysToLastMonday);
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  return { start: lastMonday, end: lastSunday };
}

/**
 * Check if an invoice date is within the valid range
 */
export function isInvoiceDateValid(invoiceDate: Date): boolean {
  const { start, end } = getValidInvoiceDateRange();
  return invoiceDate >= start && invoiceDate <= end;
}

export type LateReason = 'after_deadline' | 'wrong_week';

export interface PaymentWeekResult {
  week: number;
  year: number;
  isLate: boolean;
  reason?: LateReason;
  validRange: { start: Date; end: Date };
  deadline: string;
}

/**
 * Calculate the payment week based on invoice date and current time
 * Also determines if the invoice is late (extemporánea)
 */
export function calculatePaymentWeek(invoiceDate: Date | string): PaymentWeekResult {
  const invoiceDateObj = typeof invoiceDate === 'string' ? new Date(invoiceDate) : invoiceDate;
  const mexicoNow = getMexicoNow();
  
  // Current week info
  const currentWeek = getWeekNumber(mexicoNow);
  const currentYear = mexicoNow.getFullYear();
  
  // Check deadline
  const afterDeadline = isAfterDeadline();
  
  // Check valid date range
  const validRange = getValidInvoiceDateRange();
  const invoiceDateValid = invoiceDateObj >= validRange.start && invoiceDateObj <= validRange.end;
  
  // Determine if late and why
  let isLate = false;
  let reason: LateReason | undefined;
  
  if (afterDeadline) {
    isLate = true;
    reason = 'after_deadline';
  } else if (!invoiceDateValid) {
    isLate = true;
    reason = 'wrong_week';
  }
  
  // Format deadline for display
  const deadlineStr = formatDeadline();
  
  return {
    week: currentWeek,
    year: currentYear,
    isLate,
    reason,
    validRange,
    deadline: deadlineStr,
  };
}

/**
 * Format the deadline for user display
 */
export function formatDeadline(): string {
  const mexicoNow = getMexicoNow();
  const dayOfWeek = mexicoNow.getDay();
  
  // Calculate next Thursday (or current if it's Thursday before 10am)
  let daysUntilThursday = (DEADLINE_DAY - dayOfWeek + 7) % 7;
  if (daysUntilThursday === 0 && getMexicoHour() >= DEADLINE_HOUR) {
    daysUntilThursday = 7; // Next Thursday
  }
  
  const nextDeadline = new Date(mexicoNow);
  nextDeadline.setDate(mexicoNow.getDate() + daysUntilThursday);
  nextDeadline.setHours(DEADLINE_HOUR, 0, 0, 0);
  
  return nextDeadline.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get a human-readable description of the valid invoice period
 */
export function getValidPeriodDescription(): string {
  const { start, end } = getValidInvoiceDateRange();
  
  const formatDate = (d: Date) => d.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  
  return `${formatDate(start)} al ${formatDate(end)}`;
}

/**
 * Format date to ISO string for backend (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse an ISO date string (YYYY-MM-DD) to Date object
 */
export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
