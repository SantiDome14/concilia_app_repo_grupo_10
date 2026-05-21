// ════════════════════════════════════════════════════════════════════
// MSW handlers — reports + reportRuns + reportCategories
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import type { Report, ReportRun } from '@/types/genericos';
import {
  reportCategoriesSeed,
  reportRunsSeed,
  reportsSeed,
} from '../seed/reports';

const REPORTS_LIST = `*${ENDPOINTS.reports.list}`;
const REPORT_ITEM = `*${ENDPOINTS.reports.detail(':id')}`;
const REPORT_UPDATE = `*${ENDPOINTS.reports.update(':id')}`;
const CATEGORIES_LIST = `*${ENDPOINTS.reports.categories}`;
const RUNS_LIST = `*${ENDPOINTS.reports.runs.list}`;
const RUNS_CREATE = `*${ENDPOINTS.reports.runs.create}`;

function notFound(label: string, id: string) {
  return HttpResponse.json(
    { message: `${label} "${id}" not found`, code: 'NOT_FOUND', details: { id } },
    { status: 404 },
  );
}

export const reportHandlers: HttpHandler[] = [
  // ─── Reports ──────────────────────────────────────────────────
  http.get(REPORTS_LIST, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(reportsSeed);
  }),

  http.get(REPORT_ITEM, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const record = reportsSeed.find((r) => r.id === id);
    return record ? HttpResponse.json(record) : notFound('Report', id);
  }),

  http.patch(REPORT_UPDATE, async ({ request, params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const existing = reportsSeed.find((r) => r.id === id);
    if (!existing) return notFound('Report', id);

    const patch = (await request.json()) as Partial<Report>;
    const updated: Report = { ...existing, ...patch, id };
    reportsSeed[reportsSeed.indexOf(existing)] = updated;
    return HttpResponse.json(updated);
  }),

  // ─── Categories (config-shaped data, served via HTTP for consistency) ─
  http.get(CATEGORIES_LIST, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(reportCategoriesSeed);
  }),

  // ─── Runs ─────────────────────────────────────────────────────
  http.get(RUNS_LIST, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(reportRunsSeed);
  }),

  http.post(RUNS_CREATE, async ({ request }) => {
    await delay(randomDelayMs());
    const payload = (await request.json()) as ReportRun;
    reportRunsSeed.unshift(payload);
    return HttpResponse.json(payload, { status: 201 });
  }),
];
