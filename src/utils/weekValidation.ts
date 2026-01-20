/**
 * Week validation utilities for invoice upload deadlines
 * Uses Mexico City timezone (America/Mexico_City)
 */

const MEXICO_TIMEZONE = 'America/Mexico_City';

/**
 * Get current date/time in Mexico City timezone
 */
export const getMexicoCityNow = (): Date => {
  const now = new Date();
  // Get the time in Mexico City
  const mexicoTime = new Date(now.toLocaleString('en-US', { timeZone: MEXICO_TIMEZONE }));
  return mexicoTime;
};

/**
 * Get ISO week number from a date
 * ISO weeks start on Monday
 */
export const getIsoWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Set to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

/**
 * Get the year for the ISO week
 * Handles edge cases at year boundaries
 */
export const getIsoWeekYear = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
};

/**
 * Get the Monday of a given week
 */
export const getMondayOfWeek = (week: number, year: number): Date => {
  // Find January 4th of the year (always in week 1)
  const jan4 = new Date(year, 0, 4);
  const jan4DayOfWeek = jan4.getDay() || 7; // Sunday = 7
  
  // Find Monday of week 1
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - (jan4DayOfWeek - 1));
  
  // Add weeks to get to target week
  const targetMonday = new Date(mondayWeek1);
  targetMonday.setDate(mondayWeek1.getDate() + (week - 1) * 7);
  
  return targetMonday;
};

/**
 * Get the upload deadline for a given invoice week
 * Deadline: Thursday 10:00 AM of the FOLLOWING week (Mexico City time)
 */
export const getUploadDeadline = (invoiceWeek: number, invoiceYear: number): Date => {
  // Get Monday of the invoice week
  const monday = getMondayOfWeek(invoiceWeek, invoiceYear);
  
  // Deadline is Thursday of the NEXT week at 10:00 AM
  // That's Monday + 10 days (next Thursday) at 10:00
  const deadline = new Date(monday);
  deadline.setDate(monday.getDate() + 10); // Monday + 10 = Thursday next week
  deadline.setHours(10, 0, 0, 0);
  
  return deadline;
};

/**
 * Check if an invoice can still be uploaded based on its date
 * Returns validation result with details
 */
export const validateInvoiceWeek = (invoiceDate: string): {
  valid: boolean;
  week: number;
  year: number;
  deadline: Date;
  error?: string;
} => {
  // Parse invoice date
  const invoiceDateObj = new Date(invoiceDate + 'T12:00:00'); // Add time to avoid timezone issues
  
  if (isNaN(invoiceDateObj.getTime())) {
    return {
      valid: false,
      week: 0,
      year: 0,
      deadline: new Date(),
      error: 'Fecha de factura inválida'
    };
  }
  
  // Get invoice week and year
  const week = getIsoWeekNumber(invoiceDateObj);
  const year = getIsoWeekYear(invoiceDateObj);
  
  // Get deadline for this week
  const deadline = getUploadDeadline(week, year);
  
  // Get current time in Mexico City
  const now = getMexicoCityNow();
  
  // Check if deadline has passed
  if (now > deadline) {
    const deadlineFormatted = deadline.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: MEXICO_TIMEZONE
    });
    
    return {
      valid: false,
      week,
      year,
      deadline,
      error: `El período de carga para la Semana ${week} del ${year} ha vencido. La fecha límite fue: ${deadlineFormatted}`
    };
  }
  
  return {
    valid: true,
    week,
    year,
    deadline
  };
};

/**
 * Get list of currently active weeks (that can still receive uploads)
 */
export const getActiveWeeks = (): Array<{ week: number; year: number; deadline: Date }> => {
  const now = getMexicoCityNow();
  const currentWeek = getIsoWeekNumber(now);
  const currentYear = getIsoWeekYear(now);
  
  const activeWeeks: Array<{ week: number; year: number; deadline: Date }> = [];
  
  // Check current week and previous week
  for (let i = -1; i <= 0; i++) {
    let week = currentWeek + i;
    let year = currentYear;
    
    // Handle year boundary
    if (week < 1) {
      year--;
      week = 52; // Approximate, could be 53
    }
    
    const deadline = getUploadDeadline(week, year);
    
    if (now <= deadline) {
      activeWeeks.push({ week, year, deadline });
    }
  }
  
  return activeWeeks;
};

/**
 * Format week info for display
 */
export const formatWeekInfo = (week: number, year: number): string => {
  const monday = getMondayOfWeek(week, year);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'short' 
  };
  
  const startStr = monday.toLocaleDateString('es-MX', options);
  const endStr = sunday.toLocaleDateString('es-MX', options);
  
  return `Semana ${week} (${startStr} - ${endStr}, ${year})`;
};
