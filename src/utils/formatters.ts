/**
 * Format a number as currency
 */
export const formatCurrency = (amount: number, currency: string = 'MXN'): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format a decimal rate as percentage
 */
export const formatRate = (rate?: number): string => {
  if (!rate) return '';
  return `${(rate * 100).toFixed(2)}%`;
};

/**
 * Parse a string to number safely
 */
export const parseNumber = (value: string): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format a number with locale
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format a number as money (MXN)
 * Shorthand for formatCurrency with default currency
 */
export const formatMoney = (amount: number): string => {
  return formatCurrency(amount, 'MXN');
};
