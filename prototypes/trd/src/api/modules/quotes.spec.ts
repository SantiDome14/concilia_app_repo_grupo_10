import { describe, it, expect } from 'vitest';
import {
  cancelQuote,
  listQuotes,
  getQuote,
  getQuoteActivities,
  updateQuote,
} from './quotes';
import { ApiError } from '@/types/api';

describe('listQuotes', () => {
  it('returns the paginated envelope', async () => {
    const res = await listQuotes({ page: 1, pageSize: 10 });
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.pageSize).toBe(10);
    expect(res.data.length).toBe(10);
    expect(res.pagination.total).toBeGreaterThanOrEqual(40);
  });

  it('tab=activos surfaces only PENDING + ACCEPTED', async () => {
    const res = await listQuotes({ tab: 'activos', page: 1, pageSize: 100 });
    expect(res.data.length).toBeGreaterThan(0);
    for (const q of res.data) {
      expect(['PENDING', 'ACCEPTED']).toContain(q.status);
    }
  });

  it('tab=historial surfaces every status', async () => {
    const res = await listQuotes({ tab: 'historial', page: 1, pageSize: 100 });
    const statuses = new Set(res.data.map((q) => q.status));
    expect(statuses.has('COMPLETED')).toBe(true);
    expect(statuses.has('CANCELLED')).toBe(true);
  });

  it('status filter narrows further within the tab', async () => {
    const res = await listQuotes({
      tab: 'historial',
      status: 'CANCELLED',
      page: 1,
      pageSize: 50,
    });
    for (const q of res.data) {
      expect(q.status).toBe('CANCELLED');
    }
  });

  it('q matches client name and ardua_docket', async () => {
    const byName = await listQuotes({
      tab: 'historial',
      q: 'acme',
      page: 1,
      pageSize: 50,
    });
    expect(byName.data.length).toBeGreaterThan(0);
    expect(
      byName.data.every(
        (q) =>
          q.client_name.toLowerCase().includes('acme') ||
          (q.ardua_docket ?? '').toLowerCase().includes('acme'),
      ),
    ).toBe(true);
  });

  it('q matches quote id', async () => {
    const res = await listQuotes({
      tab: 'historial',
      q: 'q_001',
      page: 1,
      pageSize: 50,
    });
    expect(res.data.some((q) => q.id === 'q_001')).toBe(true);
  });

  it('clientId filter narrows to a single client', async () => {
    const res = await listQuotes({
      tab: 'historial',
      clientId: 'cl_001',
      page: 1,
      pageSize: 50,
    });
    expect(res.data.length).toBeGreaterThan(0);
    for (const q of res.data) expect(q.client_id).toBe('cl_001');
  });

  it('dateFrom / dateTo narrow the time window', async () => {
    const res = await listQuotes({
      tab: 'historial',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      page: 1,
      pageSize: 50,
    });
    for (const q of res.data) {
      const day = q.created_at.slice(0, 10);
      expect(day >= '2026-04-01' && day <= '2026-04-30').toBe(true);
    }
  });

  it('sorts DESC by created_at', async () => {
    const res = await listQuotes({ tab: 'historial', page: 1, pageSize: 25 });
    for (let i = 1; i < res.data.length; i += 1) {
      expect(res.data[i - 1].created_at >= res.data[i].created_at).toBe(true);
    }
  });
});

describe('getQuote', () => {
  it('returns the quote for a known id', async () => {
    const q = await getQuote('q_001');
    expect(q.id).toBe('q_001');
    expect(q.client_name).toBe('ACME S.A.');
  });

  it('throws ApiError(isNotFound) on missing id', async () => {
    try {
      await getQuote('does-not-exist');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isNotFound).toBe(true);
    }
  });
});

describe('getQuoteActivities', () => {
  it('returns the activities for a known quote', async () => {
    const acts = await getQuoteActivities('q_011');
    expect(Array.isArray(acts)).toBe(true);
    expect(acts.length).toBeGreaterThan(0);
    expect(acts[0]).toMatchObject({
      actor_name: expect.any(String),
      kind: expect.any(String),
      label: expect.any(String),
    });
  });

  it('returns an empty array when no activities exist', async () => {
    // q_004 has no entry in initialActivities.
    const acts = await getQuoteActivities('q_004');
    expect(Array.isArray(acts)).toBe(true);
    expect(acts.length).toBe(0);
  });
});

describe('updateQuote', () => {
  it('updates notes + liquidate_date and appends activity events', async () => {
    const updated = await updateQuote('q_001', {
      notes: 'Nota nueva',
      liquidate_date: '2026-06-15T18:00:00Z',
    });
    expect(updated.notes).toBe('Nota nueva');
    expect(updated.liquidate_date).toBe('2026-06-15T18:00:00Z');

    const acts = await getQuoteActivities('q_001');
    // Initial event + 2 field_update events from the PATCH.
    const fieldUpdates = acts.filter((a) => a.kind === 'field_update');
    expect(fieldUpdates.length).toBeGreaterThanOrEqual(2);
  });

  it('clears notes when passed null', async () => {
    const updated = await updateQuote('q_011', { notes: null });
    expect(updated.notes).toBeNull();
  });

  it('throws ApiError(isNotFound) on missing id', async () => {
    try {
      await updateQuote('does-not-exist', { notes: 'x' });
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isNotFound).toBe(true);
    }
  });
});

describe('cancelQuote', () => {
  it('transitions the status to CANCELLED and appends a state_change activity', async () => {
    const updated = await cancelQuote('q_001');
    expect(updated.status).toBe('CANCELLED');

    const acts = await getQuoteActivities('q_001');
    const stateChanges = acts.filter((a) => a.kind === 'state_change');
    // Initial state_change + new cancellation event.
    expect(stateChanges.length).toBeGreaterThanOrEqual(2);
    expect(stateChanges.some((a) => a.label.includes('cancelada'))).toBe(true);
  });

  it('is idempotent when called twice', async () => {
    await cancelQuote('q_002');
    const second = await cancelQuote('q_002');
    expect(second.status).toBe('CANCELLED');
  });
});
