import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string | number; label: string }[];
}

export const SelectField: React.FC<SelectProps> = ({ 
  label, 
  options, 
  className = '', 
  ...props 
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-sm font-bold text-gray-700 ml-1">{label}</label>
    <div className="relative">
      <select
        {...props}
        className="w-full bg-white border-2 border-gray-200 rounded-lg py-2.5 pl-3 pr-10 outline-none focus:border-yellow-400 transition-all duration-200 appearance-none text-gray-700 cursor-pointer"
      >
        <option value="" disabled>Seleccionar...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </div>
  </div>
);
