import React from 'react';

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
  ...props 
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-sm font-bold text-gray-700 ml-1">{label}</label>
    <div className="relative group">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-yellow-600">
          {icon}
        </div>
      )}
      <input
        {...props}
        className={`w-full bg-white border-2 rounded-lg py-2.5 ${icon ? 'pl-10' : 'pl-3'} pr-3 outline-none transition-all duration-200 
        ${error 
          ? 'border-red-400 focus:border-red-500 text-red-900 placeholder-red-300' 
          : 'border-gray-200 focus:border-yellow-400 text-gray-800'
        } disabled:bg-gray-50 disabled:text-gray-400`}
      />
    </div>
    {helperText && !error && <span className="text-xs text-yellow-700 ml-1">{helperText}</span>}
    {error && <span className="text-xs text-red-500 font-medium ml-1">{error}</span>}
  </div>
);
