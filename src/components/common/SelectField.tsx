import React from 'react';
import { Lock, ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly { value: string | number; label: string }[];
}

export const SelectField: React.FC<SelectProps> = ({ 
  label, 
  options, 
  className = '',
  disabled,
  ...props 
}) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-0.5 flex items-center gap-1.5">
      {label}
      {disabled && (
        <Lock size={12} className="text-gray-400 dark:text-gray-500" />
      )}
    </label>
    <div className="relative group">
      <select
        disabled={disabled}
        {...props}
        className={`
          w-full rounded-xl py-2.5 pl-4 pr-10 outline-none transition-all duration-200 appearance-none cursor-pointer
          ${disabled 
            ? 'bg-gray-100 dark:bg-partrunner-black/50 border-2 border-gray-200 dark:border-partrunner-gray-dark text-gray-500 dark:text-gray-500 cursor-default'
            : 'bg-white dark:bg-partrunner-charcoal border-2 border-gray-200 dark:border-partrunner-gray-dark text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-partrunner-yellow/30 focus:border-partrunner-yellow focus:ring-2 focus:ring-partrunner-yellow/20'
          }
        `}
      >
        <option value="" disabled className="text-gray-400">Seleccionar...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className={`absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none transition-colors duration-200
        ${disabled ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400 group-focus-within:text-partrunner-yellow'}
      `}>
        <ChevronDown size={18} />
      </div>
    </div>
  </div>
);
