import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { GenericOnboardStatusView } from '@/lib/types';

const TERMINAL_RESOURCE_STATES = new Set([
  'SUCCEEDED',
  'PROVISIONED',
  'ACTIVE',
  'FAILED',
  'DEACTIVATED',
  'DELETED',
  'NONE',
]);

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

export function useProvisioningPolling(active = false, productCode?: string, externalId?: string) {
  const [status, setStatus] = useState<GenericOnboardStatusView | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !productCode || !externalId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const next = await api.onboarding.getStatus(productCode, externalId);
        if (cancelled) return;
        setStatus(next);
        setPollError(null);
        setAttempt((prev) => prev + 1);
      } catch (err) {
        if (cancelled) return;
        setPollError(err instanceof Error ? err.message : String(err));
        setAttempt((prev) => prev + 1);
      }
    };

    void poll();
    timerRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [active, productCode, externalId]);

  const currentResourceStatus = status?.resourceStatus?.toUpperCase() || '';
  const isTerminal = TERMINAL_RESOURCE_STATES.has(currentResourceStatus);
  const stopPolling = attempt >= MAX_ATTEMPTS || isTerminal || pollError !== null;

  useEffect(() => {
    if (timerRef.current && stopPolling) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [stopPolling]);

  return { status, pollError, active: active && !stopPolling, attempt, isTerminal };
}