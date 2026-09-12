import { TenantStatus } from '@cybelinx/types';
import { ApiError, ErrorCode } from '@cybelinx/shared';

// Allowed one-step transitions for the tenant lifecycle. Deletion is soft
// and deferred: DELETION_PENDING → DELETED keeps the row in place.
const SUSPEND_FROM: Partial<Record<TenantStatus, TenantStatus>> = {
  ACTIVE: 'SUSPENDED',
};

const ACTIVATE_FROM: Partial<Record<TenantStatus, TenantStatus>> = {
  SUSPENDED: 'ACTIVE',
};

const DEACTIVATE_FROM: Partial<Record<TenantStatus, TenantStatus>> = {
  PROVISIONING: 'DEACTIVATED',
  ACTIVE: 'DEACTIVATED',
  SUSPENDED: 'DEACTIVATED',
};

const MARK_DELETION_PENDING_FROM: Partial<Record<TenantStatus, TenantStatus>> = {
  PROVISIONING: 'DELETION_PENDING',
  ACTIVE: 'DELETION_PENDING',
  SUSPENDED: 'DELETION_PENDING',
  DEACTIVATED: 'DELETION_PENDING',
};

const FINALIZE_DELETION_FROM: Partial<Record<TenantStatus, TenantStatus>> = {
  DELETION_PENDING: 'DELETED',
};

export type TenantTransitionRule = 'suspend' | 'activate' | 'deactivate' | 'markDeletionPending' | 'finalizeDeletion';

const TRANSITION_RULES: Record<TenantTransitionRule, Partial<Record<TenantStatus, TenantStatus>>> = {
  suspend: SUSPEND_FROM,
  activate: ACTIVATE_FROM,
  deactivate: DEACTIVATE_FROM,
  markDeletionPending: MARK_DELETION_PENDING_FROM,
  finalizeDeletion: FINALIZE_DELETION_FROM,
};

export const applyTransition = (rule: TenantTransitionRule, current: TenantStatus): TenantStatus => {
  const next = TRANSITION_RULES[rule][current];
  if (!next) {
    throw new ApiError(
      ErrorCode.TENANT_STATUS_TRANSITION_INVALID,
      `Tenant cannot be ${rule.replace(/([A-Z])/g, ' $1').toLowerCase()} from status "${current}"`,
      undefined,
      { operation: rule, from: current },
    );
  }
  return next;
};

export const isTerminalOrHidden = (status: TenantStatus): boolean => status === 'DELETED';