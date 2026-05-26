import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  Moneda,
  MovimientoLedger,
  RetiroEnCola,
  SociedadPos,
} from '@/types/fin';

// ════════════════════════════════════════════════════════════════════
// FIN — Tesorería / Disponibilidades module API calls
// ════════════════════════════════════════════════════════════════════

export interface PosicionKpis {
  posicionConsolidada: string;
  liquidezDisponible: string;
  comprometido: string;
  cuentasActivas: number;
  sociedadesActivas: number;
}

export interface MovimientosKpis {
  movimientosHoy: number;
  volumenIngresado: string;
  volumenEgresado: string;
  enCola: number;
}

export interface CatalogEntry {
  value: string;
  label: string;
}

export async function getPosicionTree(): Promise<SociedadPos[]> {
  const { data } = await apiClient.get<SociedadPos[]>(ENDPOINTS.fin.posicion.tree);
  return data;
}

export async function getPosicionKpis(): Promise<PosicionKpis> {
  const { data } = await apiClient.get<PosicionKpis>(ENDPOINTS.fin.posicion.kpis);
  return data;
}

export async function listMovimientos(): Promise<MovimientoLedger[]> {
  const { data } = await apiClient.get<MovimientoLedger[]>(ENDPOINTS.fin.movimientos.list);
  return data;
}

export async function getMovimientosKpis(): Promise<MovimientosKpis> {
  const { data } = await apiClient.get<MovimientosKpis>(ENDPOINTS.fin.movimientos.kpis);
  return data;
}

export async function listCola(): Promise<RetiroEnCola[]> {
  const { data } = await apiClient.get<RetiroEnCola[]>(ENDPOINTS.fin.cola.list);
  return data;
}

export async function updateColaItem(
  id: string,
  patch: Partial<RetiroEnCola>,
): Promise<RetiroEnCola> {
  const { data } = await apiClient.patch<RetiroEnCola>(ENDPOINTS.fin.cola.update(id), patch);
  return data;
}

export async function listSociedades(): Promise<CatalogEntry[]> {
  const { data } = await apiClient.get<CatalogEntry[]>(ENDPOINTS.fin.sociedades);
  return data;
}

export async function listMonedas(): Promise<Moneda[]> {
  const { data } = await apiClient.get<Moneda[]>(ENDPOINTS.fin.monedas);
  return data;
}
