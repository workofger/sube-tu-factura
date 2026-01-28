import React from 'react';
import { Lock } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const InputField: React.FC<InputProps> = ({ 
  label, 
  icon, 
  error, 
  helperText, 
  className = '',
  readOnly,
  disabled,
  ...props 
}) => {
  const isLocked = readOnly || disabled;
  
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-0.5 flex items-center gap-1.5">
        {label}
        {readOnly && (
          <Lock size={12} className="text-gray-400 dark:text-gray-500" />
        )}
      </label>
      <div className="relative group">
        {icon && (
          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200
            ${isLocked 
              ? 'text-gray-400 dark:text-gray-500' 
              : 'text-gray-400 dark:text-gray-500 group-focus-within:text-partrunner-yellow'
            }
          `}>
            {icon}
          </div>
        )}
        <input
          readOnly={readOnly}
          disabled={disabled}
          {...props}
          className={`
            w-full rounded-xl py-2.5 ${icon ? 'pl-10' : 'pl-4'} pr-4 outline-none transition-all duration-200 
            ${error 
              ? 'bg-red-50 dark:bg-red-500/10 border-2 border-red-300 dark:border-red-500/50 text-red-900 dark:text-red-300 placeholder-red-300 dark:placeholder-red-400/50 focus:border-red-400 dark:focus:border-red-500' 
              : isLocked
                ? 'bg-gray-100 dark:bg-partrunner-black/50 border-2 border-gray-200 dark:border-partrunner-gray-dark text-gray-600 dark:text-gray-400 cursor-default'
                : 'bg-white dark:bg-partrunner-charcoal border-2 border-gray-200 dark:border-partrunner-gray-dark text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-300 dark:hover:border-partrunner-yellow/30 focus:border-partrunner-yellow focus:ring-2 focus:ring-partrunner-yellow/20'
            }
          `}
        />
      </div>
      {helperText && !error && (
        <span className="text-xs text-partrunner-yellow-dark dark:text-partrunner-yellow ml-0.5 flex items-center gap-1">
          <span className="w-1 h-1 bg-partrunner-yellow rounded-full"></span>
          {helperText}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-500 dark:text-red-400 font-medium ml-0.5">
          {error}
        </span>
      )}
    </div>
  );
};
