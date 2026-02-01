import { useEffect, useRef } from 'react';

/**
 * Hook for zero-render timer updates
 * Updates DOM directly without React re-renders
 * Perfect for high-frequency updates (timers, countdowns, etc.)
 */

interface UseZeroRenderTimerOptions {
  ref: React.RefObject<HTMLElement>;
  updater: () => string | number;
  interval?: number;
  enabled?: boolean;
}

export function useZeroRenderTimer({
  ref,
  updater,
  interval = 500,
  enabled = true,
}: UseZeroRenderTimerOptions): void {
  // Use ref to store updater function to avoid re-subscription
  const updaterRef = useRef(updater);

  // Update ref when updater changes
  useEffect(() => {
    updaterRef.current = updater;
  }, [updater]);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const update = () => {
      if (ref.current) {
        ref.current.textContent = String(updaterRef.current());
      }
    };

    // Initial update
    update();

    // Set up interval
    const id = window.setInterval(update, interval);

    return () => window.clearInterval(id);
  }, [ref, interval, enabled]);
}
