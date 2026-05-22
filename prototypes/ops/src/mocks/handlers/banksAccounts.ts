// ════════════════════════════════════════════════════════════════════
// MSW handlers — banks-accounts (ops-banks-accounts capability)
// ────────────────────────────────────────────────────────────────────
// Six endpoints from `ENDPOINTS.banksAccounts`:
//   GET    /banks-accounts                — full catalog (no paging)
//   GET    /banks-accounts/sociedades     — sociedades catalog
//   GET    /banks-accounts/structures     — estructuras catalog
//   POST   /banks-accounts/structures     — create Estructura
//   POST   /banks-accounts                — create Cuenta
//   PATCH  /banks-accounts/:id            — edit Cuenta (5 fields)
//
// New estructuras default to status `Activa`; new cuentas resolve their
// sociedad/estructura display strings from the sociedades + estructuras
// seeds so the table renders without an extra lookup.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { apiPath, randomDelayMs } from '../util';
import {
  banksAccountsSeed,
  estructurasSeed,
  sociedadesSeed,
} from '../seed/banksAccounts';
import type {
  BankAccountRecord,
  CreateAccountPayload,
  CreateStructurePayload,
  Estructura,
  UpdateAccountPayload,
} from '@/ops/banks-accounts/types';

const LIST = apiPath(ENDPOINTS.banksAccounts.list);
const SOCIEDADES = apiPath(ENDPOINTS.banksAccounts.sociedades);
const STRUCTURES = apiPath(ENDPOINTS.banksAccounts.structures);
const UPDATE = apiPath(ENDPOINTS.banksAccounts.updateAccount(':id'));

let nextAccountSeq = 1;
let nextStructureSeq = 1;

function nextAccountId(): string {
  return `cu-new-${String(nextAccountSeq++).padStart(4, '0')}`;
}
function nextStructureId(): string {
  return `est-new-${String(nextStructureSeq++).padStart(4, '0')}`;
}

export const banksAccountsHandlers: HttpHandler[] = [
  // GET /banks-accounts — full catalog. Pagination is client-side per
  // `ops-banks-accounts` Requirement 1 (the catalog is small enough to
  // ship as a single payload).
  http.get(LIST, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(banksAccountsSeed);
  }),

  // GET /banks-accounts/sociedades — catalog of Ardua group entities.
  http.get(SOCIEDADES, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(sociedadesSeed);
  }),

  // GET /banks-accounts/structures — catalog of bancos/exchanges/etc.
  http.get(STRUCTURES, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(estructurasSeed);
  }),

  // POST /banks-accounts/structures — append a new Estructura.
  http.post(STRUCTURES, async ({ request }) => {
    await delay(randomDelayMs());
    const body = (await request.json()) as CreateStructurePayload;
    if (!body?.name || !body?.tipo) {
      return HttpResponse.json(
        { message: 'name y tipo requeridos', code: 'VALIDATION' },
        { status: 400 },
      );
    }
    if (estructurasSeed.some((e) => e.name.toLowerCase() === body.name.toLowerCase())) {
      return HttpResponse.json(
        { message: 'Estructura ya existe', code: 'DUPLICATE' },
        { status: 409 },
      );
    }
    const created: Estructura = {
      id: nextStructureId(),
      name: body.name,
      tipo: body.tipo,
      status: 'Activa',
    };
    estructurasSeed.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  // POST /banks-accounts — append a new Cuenta.
  http.post(LIST, async ({ request }) => {
    await delay(randomDelayMs());
    const body = (await request.json()) as CreateAccountPayload;
    const sociedad = sociedadesSeed.find((s) => s.id === body?.sociedadId);
    const estructura = estructurasSeed.find((e) => e.id === body?.estructuraId);
    if (!sociedad || !estructura) {
      return HttpResponse.json(
        {
          message: 'Sociedad o Estructura desconocida',
          code: 'NOT_FOUND',
        },
        { status: 404 },
      );
    }
    const padre = body?.padreCuentaId
      ? banksAccountsSeed.find((c) => c.id === body.padreCuentaId)
      : null;
    const created: BankAccountRecord = {
      id: nextAccountId(),
      sociedad: sociedad.name,
      estructura: estructura.name,
      estructuraTipo: estructura.tipo,
      tipoCuenta: body.tipoCuenta,
      moneda: body.moneda,
      nro: body.nro,
      cuentaPadreLabel: padre
        ? `${padre.sociedad} · ${padre.estructura} · ${padre.nro}`
        : null,
      padreCuentaId: padre?.id ?? null,
      status: 'Activa',
    };
    banksAccountsSeed.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  // PATCH /banks-accounts/:id — edit the 5 mutable fields of a Cuenta.
  http.patch(UPDATE, async ({ params, request }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const record = banksAccountsSeed.find((c) => c.id === id);
    if (!record) {
      return HttpResponse.json(
        { message: 'Cuenta no encontrada', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as UpdateAccountPayload;
    // Apply only the fields present in the payload — supports both the
    // full-form Editar action and the single-field Activar / Desactivar
    // actions surfaced via the manifest engine.
    if (body.tipoCuenta !== undefined) record.tipoCuenta = body.tipoCuenta;
    if (body.moneda !== undefined) record.moneda = body.moneda;
    if (body.nro !== undefined) record.nro = body.nro;
    if (body.status !== undefined) record.status = body.status;
    if ('padreCuentaId' in (body ?? {})) {
      const padre = body.padreCuentaId
        ? banksAccountsSeed.find((c) => c.id === body.padreCuentaId)
        : null;
      record.padreCuentaId = padre?.id ?? null;
      record.cuentaPadreLabel = padre
        ? `${padre.sociedad} · ${padre.estructura} · ${padre.nro}`
        : null;
    }
    return HttpResponse.json(record);
  }),
];
