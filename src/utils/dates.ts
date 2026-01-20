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
