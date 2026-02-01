import { useState, useEffect } from 'react';

/**
 * Hook to detect prefers-reduced-motion setting
 * Returns true if user has requested reduced motion
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}
