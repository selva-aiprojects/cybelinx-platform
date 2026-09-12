import { z } from 'zod';

export const PLATFORM_EVENT_TYPES = [
  'TENANT_CREATED',
  'TENANT_PROVISIONED',
  'TENANT_ACTIVATED',
  'TENANT_SUSPENDED',
  'TENANT_DEACTIVATED',
  'TENANT_DELETED',
  'USER_INVITED',
  'USER_JOINED_TENANT',
  'USER_REMOVED',
  'ROLE_ASSIGNED',
  'ROLE_REVOKED',
  'PRODUCT_ENABLED',
  'PRODUCT_DISABLED',
  'ENTITLEMENT_CHANGED',
  'RESOURCE_CREATED',
  'RESOURCE_PROVISIONED',
  'RESOURCE_FAILED',
  'RESOURCE_MIGRATED',
  'PRODUCT_LOGIN',
  'FEATURE_USED',
  'API_REQUEST',
] as const;

export type PlatformEventType = (typeof PLATFORM_EVENT_TYPES)[number];

export const PlatformEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string().min(1).max(100),
  tenantId: z.string().uuid().optional(),
  productId: z.string().min(1).max(50).optional(),
  entityType: z.string().min(1).max(50).optional(),
  entityId: z.string().min(1).max(100).optional(),
  occurredAt: z.string().datetime({ offset: true }),
  correlationId: z.string().uuid().optional(),
  source: z.string().min(1).max(100).optional(),
  schemaVersion: z.string().default('1.0'),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type PlatformEvent = z.infer<typeof PlatformEventSchema>;

export const PLATFORM_EVENT_MANDATORY_KEYS = ['eventId', 'eventType', 'occurredAt'] as const;

export const validatePlatformEvent = (input: unknown) => PlatformEventSchema.safeParse(input);

export const isPlatformEventType = (value: unknown): value is PlatformEventType =>
  (PLATFORM_EVENT_TYPES as readonly string[]).includes(value as string);