import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Shake to switch closet views.
 * Native uses the accelerometer (available in Expo Go); web listens to
 * devicemotion where the browser exposes it. The header toggle remains the
 * accessible control in every case.
 */
export function useShake(onShake: () => void, enabled = true) {
  const handler = useRef(onShake);
  handler.current = onShake;

  useEffect(() => {
    if (!enabled) return;
    let last = 0;

    const fire = () => {
      const now = Date.now();
      if (now - last < 1100) return;
      last = now;
      handler.current();
    };

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
      let previous = 0;
      const listener = (event: DeviceMotionEvent) => {
        const acceleration = event.accelerationIncludingGravity;
        if (!acceleration) return;
        const magnitude =
          Math.abs(acceleration.x ?? 0) + Math.abs(acceleration.y ?? 0) + Math.abs(acceleration.z ?? 0);
        if (magnitude - previous > 18) fire();
        previous = magnitude;
      };
      window.addEventListener('devicemotion', listener);
      return () => window.removeEventListener('devicemotion', listener);
    }

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;
    import('expo-sensors')
      .then(({ Accelerometer }) => {
        if (cancelled) return;
        Accelerometer.setUpdateInterval(180);
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const magnitude = Math.abs(x) + Math.abs(y) + Math.abs(z);
          if (magnitude > 2.9) fire();
        });
      })
      .catch(() => {
        // no sensor available; the header toggle still works
      });

    return () => {
      cancelled = true;
      subscription?.remove?.();
    };
  }, [enabled]);
}
