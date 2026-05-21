// ════════════════════════════════════════════════════════════════════
// MSW handlers — statements (ops-statements capability)
// ────────────────────────────────────────────────────────────────────
// Single endpoint:
//   POST /statement — generate a statement PDF for (clientId, accountId,
//                     date_from..date_to). Returns a discriminated
//                     `{ success, url }` envelope; the api module maps
//                     it to the `StatementResult` the modal consumes.
//
// No persisted state — every request resolves immediately into a stub
// URL. Validation surfaces `success: false` for two sentinel cases so
// the modal's business-error branch is exercisable end-to-end:
//   - account_id ending in `empty` → "Sin movimientos en el rango"
//   - date_from > date_to          → "Rango de fechas inválido"
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { apiPath, randomDelayMs } from '../util';
import type { StatementRequest } from '@/ops/statements/types';

const CREATE = apiPath(ENDPOINTS.statements.create);

let statementSeq = 1;

export const statementHandlers: HttpHandler[] = [
  http.post(CREATE, async ({ request }) => {
    await delay(randomDelayMs());
    const body = (await request.json()) as StatementRequest;

    if (!body?.client_id || !body?.account_id) {
      return HttpResponse.json(
        {
          success: false,
          status_code: 400,
          error: 'validation_error',
          message: 'client_id y account_id son requeridos',
        },
        { status: 400 },
      );
    }

    if (body.date_from > body.date_to) {
      return HttpResponse.json({
        success: false,
        status_code: 200,
        error: 'invalid_range',
        message: 'Rango de fechas inválido',
      });
    }

    if (body.account_id.toLowerCase().endsWith('empty')) {
      return HttpResponse.json({
        success: false,
        status_code: 200,
        error: 'no_movements',
        message: 'Sin movimientos en el rango',
      });
    }

    const id = String(statementSeq++).padStart(6, '0');
    return HttpResponse.json({
      success: true,
      status_code: 200,
      url: `https://example.com/statements/${body.client_id}-${id}.pdf`,
    });
  }),
];
