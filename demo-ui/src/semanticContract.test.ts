import { describe, expect, it } from 'vitest';
import { deliveryHandoffContract } from './semanticContract';

describe('delivery handoff semantic contract', () => {
  it('keeps the local-only review behavior and pickup-first route sequence', () => {
    expect(deliveryHandoffContract.behavior).toBe('local-review-only');
    expect(deliveryHandoffContract.nextCourierAction.default).toBe('PICKUP');
    expect(deliveryHandoffContract.route.pickup.action).toBe('PICKUP');
    expect(deliveryHandoffContract.route.dropoff.action).toBe('DROPOFF');
  });
});
