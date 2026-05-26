import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  CreatePriceAlertPayload,
  PriceAlert,
  UpdatePriceAlertPayload,
} from '@/types/priceAlert';

// ════════════════════════════════════════════════════════════════════
// TRD — Price Alerts module API calls
// ────────────────────────────────────────────────────────────────────
// CRUD against the legacy "trading" backend (intercepted by MSW in
// the prototype). The legacy endpoint set is intentionally minimal —
// no detail page, no activity log. The list IS the surface.
// ════════════════════════════════════════════════════════════════════

export async function listPriceAlerts(): Promise<PriceAlert[]> {
  const { data } = await apiClient.get<PriceAlert[]>(ENDPOINTS.priceAlerts.list);
  return data;
}

export async function createPriceAlert(
  payload: CreatePriceAlertPayload,
): Promise<PriceAlert> {
  const { data } = await apiClient.post<PriceAlert>(
    ENDPOINTS.priceAlerts.create,
    payload,
  );
  return data;
}

export async function updatePriceAlert(
  id: string,
  payload: UpdatePriceAlertPayload,
): Promise<PriceAlert> {
  const { data } = await apiClient.patch<PriceAlert>(
    ENDPOINTS.priceAlerts.update(id),
    payload,
  );
  return data;
}

export async function deletePriceAlert(id: string): Promise<void> {
  await apiClient.delete(ENDPOINTS.priceAlerts.delete(id));
}
