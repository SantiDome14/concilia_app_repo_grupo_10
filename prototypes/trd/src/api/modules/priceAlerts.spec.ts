import { describe, it, expect } from 'vitest';
import {
  listPriceAlerts,
  createPriceAlert,
  updatePriceAlert,
  deletePriceAlert,
} from './priceAlerts';
import { ApiError } from '@/types/api';

describe('listPriceAlerts', () => {
  it('returns the seeded alerts', async () => {
    const alerts = await listPriceAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(12);
  });

  it('sorts active alerts before inactive ones', async () => {
    const alerts = await listPriceAlerts();
    let sawInactive = false;
    for (const a of alerts) {
      if (!a.active) sawInactive = true;
      else if (sawInactive) {
        expect.fail('active alert appeared after an inactive one');
      }
    }
  });
});

describe('createPriceAlert', () => {
  it('persists a new alert and assigns a fresh id', async () => {
    const before = await listPriceAlerts();
    const created = await createPriceAlert({
      name: 'TEST alert',
      side: 'BUY',
      cost_price: '1000',
      limit_price: '1010',
      volume: '5000',
    });
    expect(created.id).toMatch(/^pa_\d{3}$/);
    expect(created.active).toBe(true);

    const after = await listPriceAlerts();
    expect(after.length).toBe(before.length + 1);
    expect(after.some((a) => a.id === created.id)).toBe(true);
  });
});

describe('updatePriceAlert', () => {
  it('toggles active and persists', async () => {
    const before = await listPriceAlerts();
    const target = before.find((a) => a.active)!;
    const updated = await updatePriceAlert(target.id, { active: false });
    expect(updated.active).toBe(false);

    const after = await listPriceAlerts();
    expect(after.find((a) => a.id === target.id)?.active).toBe(false);
  });

  it('throws ApiError(isNotFound) on missing id', async () => {
    try {
      await updatePriceAlert('does-not-exist', { active: false });
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isNotFound).toBe(true);
    }
  });
});

describe('deletePriceAlert', () => {
  it('removes the alert and returns void', async () => {
    const before = await listPriceAlerts();
    const target = before[0];
    await deletePriceAlert(target.id);
    const after = await listPriceAlerts();
    expect(after.length).toBe(before.length - 1);
    expect(after.some((a) => a.id === target.id)).toBe(false);
  });

  it('throws ApiError(isNotFound) on missing id', async () => {
    try {
      await deletePriceAlert('does-not-exist');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isNotFound).toBe(true);
    }
  });
});
