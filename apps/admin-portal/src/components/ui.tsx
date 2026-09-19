'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { isApiClientError, getStoredToken } from '@/lib/api';

const emptySubscribe = () => () => {};

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function subscribeToStorage(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useStoredToken(): string | null {
  return useSyncExternalStore(
    subscribeToStorage,
    () => getStoredToken(),
    () => null,
  );
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[],
): { data: T | null; error: string | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcherRef.current();
        if (!cancelled) setData(result);
      } catch (err: unknown) {
        if (!cancelled) setError(describeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}

export function describeError(error: unknown): string {
  if (isApiClientError(error)) {
    if (error.status === 0) return error.message;
    return `${error.status}${error.code ? ` · ${error.code}` : ''} — ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

export function Alert({
  kind,
  children,
  onDismiss,
}: {
  kind: 'error' | 'success' | 'info';
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className={`alert alert-${kind}`} role="alert">
      <div style={{ flex: 1 }}>{children}</div>
      {onDismiss && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}

export function ErrorBanner({ error }: { error: string }) {
  const isLocalhostError =
    error.includes('localhost') || error.includes('127.0.0.1');
  const isNetworkError =
    error.includes('Unable to reach the API') || isLocalhostError;
  const is404OrConfigError =
    error.includes('404') || error.includes('not found') || error.includes('API_BASE_URL');
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  function resetToCloud() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('cybelinx_api_base_url');
      window.localStorage.removeItem('cybelinx_api_token');
      window.location.reload();
    }
  }

  return (
    <div className="alert alert-error" role="alert">
      <div style={{ flex: 1 }}>
        <div>{error}</div>
        {(isNetworkError || is404OrConfigError) && (
          <div style={{ marginTop: '0.6rem' }}>
            <span className="small">
              {isLocalhostError && isHttps
                ? 'Your browser has a cached localhost endpoint that is blocked over HTTPS. '
                : is404OrConfigError
                ? 'The requested endpoint was not found on your current API host. '
                : 'Having trouble reaching the remote API? '}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={resetToCloud}
              style={{ fontWeight: 600, textDecoration: 'underline', marginLeft: '0.4rem' }}
            >
              Reset to Embedded API (/api/v1)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="empty">
      <span className="spin" /> Loading…
    </div>
  );
}

export function Empty({ children = 'Nothing here yet.' }: { children?: ReactNode }) {
  return <div className="empty">{children}</div>;
}