import React, { forwardRef, memo } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * EIDOLON-V: Production-ready Button with forwardRef and memoization
 */
export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'px-4 py-2 rounded font-medium transition-all duration-200';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}));

Button.displayName = 'Button';
