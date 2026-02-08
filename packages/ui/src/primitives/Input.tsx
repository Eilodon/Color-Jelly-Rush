import React, { forwardRef, memo } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * EIDOLON-V: Production-ready Input with forwardRef and memoization
 */
export const Input = memo(forwardRef<HTMLInputElement, InputProps>(({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  className = '',
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    />
  );
}));

Input.displayName = 'Input';
