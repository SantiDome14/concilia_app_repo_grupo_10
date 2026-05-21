// ════════════════════════════════════════════════════════════════════
// MSW handlers — FIN Tesorería / Disponibilidades
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import type { RetiroEnCola } from '@/types/fin';
import {
  colaSeed,
  getMonedasCatalog,
  getMovimientosKpisSnapshot,
  getPosicionKpisSnapshot,
  getSociedadesCatalog,
  movimientosSeed,
  posicionTreeSeed,
} from '../seed/fin';

const POSICION_TREE = `*${ENDPOINTS.fin.posicion.tree}`;
const POSICION_KPIS = `*${ENDPOINTS.fin.posicion.kpis}`;
const MOVIMIENTOS_LIST = `*${ENDPOINTS.fin.movimientos.list}`;
const MOVIMIENTOS_KPIS_PATH = `*${ENDPOINTS.fin.movimientos.kpis}`;
const COLA_LIST = `*${ENDPOINTS.fin.cola.list}`;
const COLA_UPDATE = `*${ENDPOINTS.fin.cola.update(':id')}`;
const SOCIEDADES = `*${ENDPOINTS.fin.sociedades}`;
const MONEDAS = `*${ENDPOINTS.fin.monedas}`;

function notFound(id: string) {
  return HttpResponse.json(
    { message: `Cola item "${id}" not found`, code: 'NOT_FOUND', details: { id } },
    { status: 404 },
  );
}

export const finHandlers: HttpHandler[] = [
  http.get(POSICION_TREE, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(posicionTreeSeed);
  }),

  http.get(POSICION_KPIS, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(getPosicionKpisSnapshot());
  }),

  http.get(MOVIMIENTOS_LIST, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(movimientosSeed);
  }),

  http.get(MOVIMIENTOS_KPIS_PATH, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(getMovimientosKpisSnapshot());
  }),

  http.get(COLA_LIST, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(colaSeed);
  }),

  http.patch(COLA_UPDATE, async ({ request, params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const existing = colaSeed.find((c) => c.id === id);
    if (!existing) return notFound(id);

    const patch = (await request.json()) as Partial<RetiroEnCola>;
    const updated: RetiroEnCola = { ...existing, ...patch, id };
    colaSeed[colaSeed.indexOf(existing)] = updated;
    return HttpResponse.json(updated);
  }),

  http.get(SOCIEDADES, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(getSociedadesCatalog());
  }),

  http.get(MONEDAS, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(getMonedasCatalog());
  }),
];
