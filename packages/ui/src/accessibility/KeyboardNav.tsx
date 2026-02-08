import React, { useEffect, memo } from 'react';

interface KeyboardNavProps {
  children: React.ReactNode;
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
}

/**
 * EIDOLON-V: Memoized KeyboardNav for accessibility
 */
export const KeyboardNav = memo<KeyboardNavProps>(({
  children,
  onEscape,
  onEnter,
  onArrowUp,
  onArrowDown,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onEscape?.();
          break;
        case 'Enter':
          onEnter?.();
          break;
        case 'ArrowUp':
          onArrowUp?.();
          break;
        case 'ArrowDown':
          onArrowDown?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, onEnter, onArrowUp, onArrowDown]);

  return <>{children}</>;
});

KeyboardNav.displayName = 'KeyboardNav';
