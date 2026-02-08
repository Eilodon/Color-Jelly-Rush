import React, { memo } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

/**
 * EIDOLON-V: Memoized Card component
 */
export const Card = memo<CardProps>(({
  children,
  className = '',
  padding = 'medium',
}) => {
  const paddingStyles = {
    none: '',
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6',
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';
