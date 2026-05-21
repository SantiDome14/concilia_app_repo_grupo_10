import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { Alerta } from '@/types/genericos';

// ════════════════════════════════════════════════════════════════════
// Alertas module API calls
// ════════════════════════════════════════════════════════════════════

export async function listAlertas(): Promise<Alerta[]> {
  const { data } = await apiClient.get<Alerta[]>(ENDPOINTS.alertas.list);
  return data;
}

export async function getAlerta(id: string): Promise<Alerta> {
  const { data } = await apiClient.get<Alerta>(ENDPOINTS.alertas.detail(id));
  return data;
}

export async function updateAlerta(id: string, patch: Partial<Alerta>): Promise<Alerta> {
  const { data } = await apiClient.patch<Alerta>(ENDPOINTS.alertas.update(id), patch);
  return data;
}
