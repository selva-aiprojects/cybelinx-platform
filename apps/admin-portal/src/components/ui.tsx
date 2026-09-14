'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { isApiClientError } from '@/lib/api';

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[],
): { data: T | null; error: string | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
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
  return <Alert kind="error">{error}</Alert>;
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