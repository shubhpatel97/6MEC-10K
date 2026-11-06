import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Respects the OS reduced-motion preference on iOS, Android and web.
 * Falls back to "motion is fine" when the platform cannot answer.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(query.matches);
      const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
      query.addEventListener?.('change', onChange);
      return () => {
        alive = false;
        query.removeEventListener?.('change', onChange);
      };
    }

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduced(value);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      if (alive) setReduced(value);
    });

    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

/** Smoothing factor for drifting columns: slower when reduced motion is on. */
export function driftDuration(reduced: boolean, base: number): number {
  return reduced ? base * 3 : base;
}
