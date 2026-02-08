import React, { memo } from 'react';

interface ScreenReaderProps {
  text: string;
  priority?: 'polite' | 'assertive';
}

/**
 * EIDOLON-V: Memoized ScreenReader for accessibility
 */
export const ScreenReader = memo<ScreenReaderProps>(({
  text,
  priority = 'polite',
}) => {
  return (
    <span
      className="sr-only"
      role="status"
      aria-live={priority}
      aria-atomic="true"
    >
      {text}
    </span>
  );
});

ScreenReader.displayName = 'ScreenReader';
