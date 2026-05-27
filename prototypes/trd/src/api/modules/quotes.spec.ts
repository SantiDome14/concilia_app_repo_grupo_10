import { describe, it, expect } from 'vitest';
import {
  cancelQuote,
  createQuote,
  createQuoteAttachment,
  deleteQuoteAttachment,
  listQuotes,
  listQuoteAttachments,
  getQuote,
  getQuoteActivities,
  updateQuote,
  updateQuoteAttachment,
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

describe('createQuote', () => {
  it('creates a PENDING quote and assigns a fresh id', async () => {
    const before = await listQuotes({ tab: 'activos', page: 1, pageSize: 100 });
    const created = await createQuote({
      client_id: 'cl_001',
      operation: 'BUY',
      origin_currency: 'ARS',
      origin_amount: '1000000',
      destination_currency: 'USD',
      destination_amount: '1000',
      exchange_rate: '1000',
      term: 'T0',
      notes: 'Test quote',
      liquidate_date: '2026-06-01T18:00:00Z',
    });
    expect(created.id).toMatch(/^q_\d{3}$/);
    expect(created.status).toBe('PENDING');
    expect(created.client_name).toBe('ACME S.A.');
    expect(created.notes).toBe('Test quote');

    const after = await listQuotes({ tab: 'activos', page: 1, pageSize: 100 });
    expect(after.pagination.total).toBe(before.pagination.total + 1);
    expect(after.data.some((q) => q.id === created.id)).toBe(true);
  });

  it('appends a state_change activity event on creation', async () => {
    const created = await createQuote({
      client_id: 'cl_002',
      operation: 'SELL',
      origin_currency: 'USD',
      origin_amount: '5000',
      destination_currency: 'ARS',
      destination_amount: '4950000',
      exchange_rate: '990',
      term: 'T+1',
      notes: null,
      liquidate_date: null,
    });
    const acts = await getQuoteActivities(created.id);
    expect(acts.length).toBe(1);
    expect(acts[0].kind).toBe('state_change');
    expect(acts[0].label).toContain('creada');
  });

  it('rejects with 422 when client_id is unknown', async () => {
    try {
      await createQuote({
        client_id: 'does-not-exist',
        operation: 'BUY',
        origin_currency: 'ARS',
        origin_amount: '1000',
        destination_currency: 'USD',
        destination_amount: '1',
        exchange_rate: '1000',
        term: 'T0',
        notes: null,
        liquidate_date: null,
      });
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(422);
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

describe('Quote attachments', () => {
  it('lists pre-seeded attachments for a known quote', async () => {
    const list = await listQuoteAttachments('q_011');
    expect(list.length).toBe(1);
    expect(list[0].filename).toBe('contrato-banco-del-sur.pdf');
  });

  it('returns an empty array for a quote with no attachments', async () => {
    const list = await listQuoteAttachments('q_001');
    expect(list).toEqual([]);
  });

  it('returns 404 for an unknown quote id', async () => {
    try {
      await listQuoteAttachments('does-not-exist');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isNotFound).toBe(true);
    }
  });

  it('createQuoteAttachment persists metadata + activity event', async () => {
    const before = await listQuoteAttachments('q_001');
    const att = await createQuoteAttachment('q_001', {
      filename: 'wire-confirmation.png',
      size: 12_345,
      mime: 'image/png',
      comment: 'Screenshot',
    });
    expect(att.id).toMatch(/^qatt_gen_/);
    expect(att.uploaded_by).toBeTruthy();
    expect(att.comment).toBe('Screenshot');

    const after = await listQuoteAttachments('q_001');
    expect(after.length).toBe(before.length + 1);

    const acts = await getQuoteActivities('q_001');
    expect(acts.some((a) => a.label.includes('Adjunto agregado'))).toBe(true);
  });

  it('updateQuoteAttachment patches only the comment', async () => {
    const updated = await updateQuoteAttachment('q_011', 'qatt_011_01', {
      comment: 'Nuevo comentario',
    });
    expect(updated.comment).toBe('Nuevo comentario');
    expect(updated.filename).toBe('contrato-banco-del-sur.pdf');
  });

  it('updateQuoteAttachment throws ApiError when attachment id is unknown', async () => {
    try {
      await updateQuoteAttachment('q_011', 'does-not-exist', {
        comment: 'x',
      });
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });

  it('deleteQuoteAttachment removes the row + appends activity event', async () => {
    const before = await listQuoteAttachments('q_022');
    const target = before[0];
    await deleteQuoteAttachment('q_022', target.id);
    const after = await listQuoteAttachments('q_022');
    expect(after.length).toBe(before.length - 1);
    expect(after.some((a) => a.id === target.id)).toBe(false);

    const acts = await getQuoteActivities('q_022');
    expect(acts.some((a) => a.label.includes('Adjunto eliminado'))).toBe(true);
  });
});
