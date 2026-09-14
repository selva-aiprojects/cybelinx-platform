import type { ReactNode } from 'react';
import {
  EntitlementStatus,
  Environment,
  IsolationMode,
  MembershipStatus,
  PlanStatus,
  ProductStatus,
  ProvisioningState,
  ResourceStatus,
  TenantProductStatus,
  TenantResourceStatus,
  TenantStatus,
} from '@/lib/types';

type StatusValue =
  | ProductStatus
  | PlanStatus
  | EntitlementStatus
  | TenantStatus
  | TenantProductStatus
  | TenantResourceStatus
  | ResourceStatus
  | ProvisioningState
  | MembershipStatus
  | Environment
  | string;

const VARIANT_BY_VALUE: Record<string, string> = {
  ACTIVE: 'success',
  SUCCEEDED: 'success',
  PROVISIONED: 'success',
  UP_TO_DATE: 'success',
  ENABLED: 'success',

  PROVISIONING: 'info',
  PENDING: 'info',
  IN_PROGRESS: 'info',
  INVITED: 'info',
  STAGING: 'info',
  DEVELOPMENT: 'info',

  SUSPENDED: 'warning',
  DEPRECATED: 'warning',
  INACTIVE: 'warning',
  RETIRED: 'warning',
  LAPSED: 'warning',
  DEGRADED: 'warning',
  CANCELLED: 'warning',
  PRODUCTION: 'warning',

  FAILED: 'danger',
  DEACTIVATED: 'danger',
  DELETION_PENDING: 'danger',
  DISABLED: 'danger',

  DRAFT: 'muted',
};

export function StatusBadge({ value, children }: { value: StatusValue; children?: ReactNode }) {
  const variant = VARIANT_BY_VALUE[value] ?? 'muted';
  return (
    <span className={`badge badge-${variant}`}>
      {children ?? value ?? '—'}
    </span>
  );
}

const ISOLATION_LABELS: Record<string, string> = {
  SHARED_POOL: 'Shared pool',
  SCHEMA_PER_TENANT: 'Schema per tenant',
  DEDICATED_DATABASE: 'Dedicated database',
  DEDICATED_INFRASTRUCTURE: 'Dedicated infrastructure',
};

export function IsolationBadge({ value }: { value: IsolationMode }) {
  return <StatusBadge value={value}>{ISOLATION_LABELS[value] ?? value}</StatusBadge>;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}