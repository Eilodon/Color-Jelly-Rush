import React, { memo } from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * EIDOLON-V: Memoized LoadingSpinner component
 */
export const LoadingSpinner = memo<LoadingSpinnerProps>(({
  size = 'medium',
  className = '',
}) => {
  const sizeStyles = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div
      className={`border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin ${sizeStyles[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';
