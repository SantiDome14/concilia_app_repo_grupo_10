// ════════════════════════════════════════════════════════════════════
// MSW handlers — dashboard KPIs
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import { dashboardKpisSeed } from '../seed/dashboardKpis';

const LIST = `*${ENDPOINTS.dashboardKpis.list}`;

export const dashboardKpisHandlers: HttpHandler[] = [
  http.get(LIST, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(dashboardKpisSeed);
  }),
];
