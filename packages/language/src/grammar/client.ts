import { CheckMatch, LanguageCheckRequest, LanguageCheckResponse } from '../types';

export interface LanguageClientOptions {
  baseUrl?: string;
  authToken?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  onDegradedStateChange?: (degraded: boolean) => void;
}

export class LanguageServiceClient {
  private baseUrl: string;
  private authToken?: string;
  private fetchFn: typeof fetch;
  private timeoutMs: number;
  private onDegradedStateChange?: (degraded: boolean) => void;

  // Circuit Breaker State
  private failureCount = 0;
  private maxConsecutiveFailures = 3;
  private isDegraded = false;
  private degradedUntil: number | null = null;
  private degradedCooldownMs = 60000; // 60 seconds

  constructor(options: LanguageClientOptions = {}) {
    this.baseUrl = options.baseUrl || '/api/v1/language';
    this.authToken = options.authToken;
    this.fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch : (null as any));
    this.timeoutMs = options.timeoutMs || 2500;
    this.onDegradedStateChange = options.onDegradedStateChange;
  }

  public setAuthToken(token: string) {
    this.authToken = token;
  }

  public getIsDegraded(): boolean {
    if (this.isDegraded && this.degradedUntil && Date.now() > this.degradedUntil) {
      // Half-open probe window
      return false;
    }
    return this.isDegraded;
  }

  public async checkLanguage(request: LanguageCheckRequest): Promise<CheckMatch[]> {
    // Fail-open: if circuit breaker is tripped, skip server grammar check to preserve responsiveness
    if (this.getIsDegraded()) {
      return [];
    }

    if (!this.fetchFn) {
      return [];
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      if (request.tenantId) {
        headers['X-Tenant-Id'] = request.tenantId;
      }

      const res = await this.fetchFn(`${this.baseUrl}/check`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller ? controller.signal : undefined,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!res.ok) {
        this.recordFailure();
        return [];
      }

      const data = (await res.json()) as LanguageCheckResponse;
      this.recordSuccess();
      return data.matches || [];
    } catch {
      if (timeoutId) clearTimeout(timeoutId);
      this.recordFailure();
      // Fail-open: Never throw error that would crash or block user input
      return [];
    }
  }

  private recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.maxConsecutiveFailures && !this.isDegraded) {
      this.isDegraded = true;
      this.degradedUntil = Date.now() + this.degradedCooldownMs;
      if (this.onDegradedStateChange) {
        this.onDegradedStateChange(true);
      }
    }
  }

  private recordSuccess() {
    this.failureCount = 0;
    if (this.isDegraded) {
      this.isDegraded = false;
      this.degradedUntil = null;
      if (this.onDegradedStateChange) {
        this.onDegradedStateChange(false);
      }
    }
  }
}
