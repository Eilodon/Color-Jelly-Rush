import React from 'react';

interface ScreenReaderProps {
  text: string;
  priority?: 'polite' | 'assertive';
}

export const ScreenReader: React.FC<ScreenReaderProps> = ({
  text,
  priority = 'polite',
}) => {
  // EIDOLON-V: Explicit aria-live values for accessibility compliance
  const ariaLive = priority === 'assertive' ? 'assertive' : 'polite';

  return (
    <span
      className="sr-only"
      role="status"
      aria-live={ariaLive}
      aria-atomic="true"
    >
      {text}
    </span>
  );
};
