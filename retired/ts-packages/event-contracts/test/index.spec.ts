import { validatePlatformEvent, isPlatformEventType } from '../src';

describe('@cybelinx/event-contracts', () => {
  const validEvent = {
    eventId: '3b6f7c8e-8d1a-4c6e-9a0b-2f3d4e5f6a7b',
    eventType: 'TENANT_CREATED',
    occurredAt: '2026-09-11T10:00:00.000Z',
  };

  it('validates a minimal platform event', () => {
    const result = validatePlatformEvent(validEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe('1.0');
      expect(result.data.payload).toEqual({});
    }
  });

  it('rejects events with invalid eventId', () => {
    const result = validatePlatformEvent({ ...validEvent, eventId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects events with an empty eventType', () => {
    const result = validatePlatformEvent({ ...validEvent, eventType: '' });
    expect(result.success).toBe(false);
  });

  it('correctly identifies platform event types', () => {
    expect(isPlatformEventType('TENANT_CREATED')).toBe(true);
    expect(isPlatformEventType('UNKNOWN_EVENT')).toBe(false);
  });
});