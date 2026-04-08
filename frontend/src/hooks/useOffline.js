import { useState, useEffect } from 'react';

/**
 * useOffline — Network status monitoring hook.
 *
 * Tracks online/offline state and service worker readiness.
 *
 * NOTE: The offline request queue (offlineFetch, syncQueue, addToQueue) was
 * removed because it depended on a service worker to replay queued requests.
 * SW registration was removed as part of the React error #130 fix. The queue
 * functions were silently accumulating requests that were never replayed.
 *
 * If offline queuing is needed in the future, re-implement it with a proper
 * SW registration strategy.
 */
export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsOfflineMode(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service worker readiness detection
  // Registration is handled by index.html and cleared by main.jsx on startup.
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => setServiceWorkerReady(true))
        .catch(() => setServiceWorkerReady(false));
    }
  }, []);

  return {
    isOnline,
    isOfflineMode,
    serviceWorkerReady,
  };
};
