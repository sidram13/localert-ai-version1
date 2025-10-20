import { useState, useEffect, useRef, useCallback } from 'react';

// The WakeLockSentinel type is not available in all TypeScript lib definitions.
// Declare it here to avoid errors.
declare global {
  interface WakeLockSentinel extends EventTarget {
    // FIX: Added readonly modifier to match TypeScript's built-in definitions for WakeLockSentinel.
    readonly type: 'screen';
    readonly released: boolean;
    release(): Promise<void>;
  }
}

export function useWakeLock() {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const wakeLockSentinel = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    // Check for browser support on component mount.
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) {
        console.warn('Screen Wake Lock API is not supported by this browser.');
        return;
    }
    if (wakeLockSentinel.current && !wakeLockSentinel.current.released) {
        // Lock is already active.
        return;
    }

    try {
      wakeLockSentinel.current = await navigator.wakeLock.request('screen');
      setIsActive(true);
      console.log('Screen Wake Lock is active.');

      // Add a release event listener.
      wakeLockSentinel.current.addEventListener('release', () => {
        console.log('Screen Wake Lock was released.');
        setIsActive(false);
        wakeLockSentinel.current = null;
      });
    } catch (err: any) {
      console.error(`Screen Wake Lock request failed: ${err.name}, ${err.message}`);
      setIsActive(false);
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinel.current && !wakeLockSentinel.current.released) {
      await wakeLockSentinel.current.release();
      wakeLockSentinel.current = null;
      // The 'release' event listener will set isActive to false.
    }
  }, []);
  
  // Best practice: Re-acquire the lock when the page becomes visible again.
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Check if a lock was active before the tab was hidden.
      if (wakeLockSentinel.current && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock]);

  // Cleanup: ensure the lock is released when the hook unmounts.
  useEffect(() => {
    return () => {
        releaseWakeLock();
    }
  }, [releaseWakeLock]);

  return { isSupported, isActive, requestWakeLock, releaseWakeLock };
}
