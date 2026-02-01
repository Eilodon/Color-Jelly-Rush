import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage screen reader announcements
 * Returns announcement state and function to trigger announcements
 */
export function useScreenReaderAnnouncer(): {
  announcement: string;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  clearAnnouncement: () => void;
} {
  const [announcement, setAnnouncement] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback((message: string, prio: 'polite' | 'assertive' = 'polite') => {
    setPriority(prio);
    setAnnouncement(message);
  }, []);

  const clearAnnouncement = useCallback(() => {
    setAnnouncement('');
  }, []);

  // Auto-clear announcement after it's been read
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => {
        setAnnouncement('');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  return { 
    announcement, 
    announce, 
    clearAnnouncement,
  };
}
