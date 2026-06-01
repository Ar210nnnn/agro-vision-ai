import { useEffect, useState } from 'react';

const CACHE_KEY = 'agro-offline-analyses-v1';

export function useOffline() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    // Register a tiny service worker for shell caching (best-effort)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* silent */ });
    }

    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return { online };
}

export function cacheAnalysis(item: any) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift({ ...item, cached_at: Date.now() });
    localStorage.setItem(CACHE_KEY, JSON.stringify(arr.slice(0, 50)));
  } catch { /* ignore */ }
}

export function getCachedAnalyses(): any[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearCachedAnalyses() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
