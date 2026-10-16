import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[#101828] mb-1.5">
            {label}
            {props.required && <span className="text-[#F04438] ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={`w-full h-10 appearance-none rounded-lg border bg-white pl-3 pr-9 py-2 text-sm text-[#101828] shadow-xs transition-colors duration-150 focus:outline-none disabled:bg-[#F7F8FA] disabled:text-[#98A2B3] disabled:cursor-not-allowed ${
              error
                ? 'border-[#F04438] focus:border-[#F04438] focus:ring-4 focus:ring-red-500/20'
                : 'border-[#D0D5DD] hover:border-[#98A2B3] focus:border-[#3B68F5] focus:ring-4 focus:ring-[#3B68F5]/20'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#667085]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-[#B42318] font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-[#667085]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
