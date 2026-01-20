import { useState, useEffect } from 'react';
import { generateWeekOptions, getWeekNumber } from '../utils/dates';

interface WeekOption {
  value: string;
  label: string;
}

export const useWeekOptions = () => {
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([]);
  const [currentWeek, setCurrentWeek] = useState<string>('');

  useEffect(() => {
    const options = generateWeekOptions();
    setWeekOptions(options);
    
    // Default to current week
    const today = new Date();
    setCurrentWeek(getWeekNumber(today).toString());
  }, []);

  return { weekOptions, currentWeek };
};
