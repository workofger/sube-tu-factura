/**
 * Date utilities for FacturaFlow AI
 * Includes Mexico timezone handling and deadline logic
 * 
 * BUSINESS LOGIC:
 * - Users receive billing notification on Tuesday for PREVIOUS week's work
 * - They must invoice between Tuesday and Thursday of CURRENT week
 * - Invoice description must contain the week number (e.g., "Semana 04")
 * - Deadline is Thursday 10am Mexico City time
 */

// Business constants
const MEXICO_TIMEZONE = 'America/Mexico_City';
const DEADLINE_HOUR = 10; // 10am
const DEADLINE_DAY = 4; // Thursday (0=Sunday, 4=Thursday)
const INVOICE_START_DAY = 2; // Tuesday - when billing period starts
const INVOICE_END_DAY = 4; // Thursday - when billing period ends

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
 * Get the valid invoice DATE range (Tuesday-Thursday of CURRENT week)
 * Invoice emission date must be within this range to be on-time
 */
export function getValidInvoiceDateRange(): { start: Date; end: Date } {
  const mexicoNow = getMexicoNow();
  const dayOfWeek = mexicoNow.getDay(); // 0 = Sunday

  // Calculate Tuesday of current week
  let daysToTuesday = INVOICE_START_DAY - dayOfWeek;
  if (dayOfWeek === 0) {
    daysToTuesday = -5; // Sunday -> go back to Tuesday
  } else if (daysToTuesday < 0) {
    // Already past Tuesday, stay in current week
    daysToTuesday = daysToTuesday;
  }

  const tuesday = new Date(mexicoNow);
  tuesday.setDate(mexicoNow.getDate() + daysToTuesday);
  tuesday.setHours(0, 0, 0, 0);

  // Thursday of same week (Thursday 23:59:59)
  const thursday = new Date(tuesday);
  thursday.setDate(tuesday.getDate() + (INVOICE_END_DAY - INVOICE_START_DAY));
  thursday.setHours(23, 59, 59, 999);

  return { start: tuesday, end: thursday };
}

/**
 * Get the expected billing week number (PREVIOUS week)
 * This is the week that users are invoicing FOR
 */
export function getExpectedBillingWeek(): { week: number; year: number } {
  const mexicoNow = getMexicoNow();
  
  // Calculate last week's date (7 days ago)
  const lastWeek = new Date(mexicoNow);
  lastWeek.setDate(mexicoNow.getDate() - 7);
  
  return {
    week: getWeekNumber(lastWeek),
    year: lastWeek.getFullYear()
  };
}

/**
 * Check if an invoice date is within the valid range
 */
export function isInvoiceDateValid(invoiceDate: Date): boolean {
  const { start, end } = getValidInvoiceDateRange();
  return invoiceDate >= start && invoiceDate <= end;
}

export type LateReason = 'after_deadline' | 'wrong_invoice_date' | 'wrong_week_in_description';

export interface PaymentWeekResult {
  week: number;
  year: number;
  expectedWeek: number;
  expectedYear: number;
  isLate: boolean;
  reason?: LateReason;
  validDateRange: { start: Date; end: Date };
  deadline: string;
}

export interface WeekValidationResult {
  isValid: boolean;
  isLate: boolean;
  reasons: LateReason[];
  expectedWeek: number;
  expectedYear: number;
  extractedWeek?: number;
  invoiceDateValid: boolean;
  afterDeadline: boolean;
}

/**
 * Validate invoice based on:
 * 1. Invoice emission date must be Tuesday-Thursday of current week
 * 2. Week mentioned in description must match expected week (previous week)
 * 3. Must be uploaded before Thursday 10am deadline
 */
export function validateInvoiceWeek(
  invoiceDate: Date | string,
  extractedWeekFromDescription?: number
): WeekValidationResult {
  const invoiceDateObj = typeof invoiceDate === 'string' ? new Date(invoiceDate) : invoiceDate;
  
  // Get expected billing week (previous week)
  const { week: expectedWeek, year: expectedYear } = getExpectedBillingWeek();
  
  // Check if invoice date is within valid range (Tue-Thu current week)
  const validDateRange = getValidInvoiceDateRange();
  const invoiceDateValid = invoiceDateObj >= validDateRange.start && invoiceDateObj <= validDateRange.end;
  
  // Check if after deadline
  const afterDeadline = isAfterDeadline();
  
  // Check if extracted week matches expected week
  const weekMatches = extractedWeekFromDescription === undefined || 
                      extractedWeekFromDescription === expectedWeek;
  
  // Compile reasons
  const reasons: LateReason[] = [];
  
  if (afterDeadline) {
    reasons.push('after_deadline');
  }
  if (!invoiceDateValid) {
    reasons.push('wrong_invoice_date');
  }
  if (extractedWeekFromDescription !== undefined && !weekMatches) {
    reasons.push('wrong_week_in_description');
  }
  
  const isLate = reasons.length > 0;
  
  return {
    isValid: !isLate,
    isLate,
    reasons,
    expectedWeek,
    expectedYear,
    extractedWeek: extractedWeekFromDescription,
    invoiceDateValid,
    afterDeadline
  };
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
  
  // Expected billing week (previous week)
  const { week: expectedWeek, year: expectedYear } = getExpectedBillingWeek();
  
  // Check deadline
  const afterDeadline = isAfterDeadline();
  
  // Check valid date range (Tue-Thu of current week)
  const validDateRange = getValidInvoiceDateRange();
  const invoiceDateValid = invoiceDateObj >= validDateRange.start && invoiceDateObj <= validDateRange.end;
  
  // Determine if late and why
  let isLate = false;
  let reason: LateReason | undefined;
  
  if (afterDeadline) {
    isLate = true;
    reason = 'after_deadline';
  } else if (!invoiceDateValid) {
    isLate = true;
    reason = 'wrong_invoice_date';
  }
  
  // Format deadline for display
  const deadlineStr = formatDeadline();
  
  return {
    week: currentWeek,
    year: currentYear,
    expectedWeek,
    expectedYear,
    isLate,
    reason,
    validDateRange,
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
 * Get a human-readable description of the valid invoice emission period
 * (Tuesday-Thursday of current week)
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
 * Get a human-readable description of the billing week
 * (The previous week that users are billing FOR)
 */
export function getBillingWeekDescription(): string {
  const { week, year } = getExpectedBillingWeek();
  return `Semana ${week} de ${year}`;
}

/**
 * Get late reason description in Spanish
 */
export function getLateReasonDescription(reason: LateReason): string {
  switch (reason) {
    case 'after_deadline':
      return 'Subida después del plazo límite (Jueves 10am CDMX)';
    case 'wrong_invoice_date':
      return 'Fecha de factura fuera del período válido (Martes-Jueves de esta semana)';
    case 'wrong_week_in_description':
      return 'La semana indicada en la descripción no corresponde a la semana de facturación';
    default:
      return 'Factura extemporánea';
  }
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
