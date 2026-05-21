import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { Solicitud } from '@/types/genericos';

// ════════════════════════════════════════════════════════════════════
// Solicitudes (Inbox) module API calls
// ════════════════════════════════════════════════════════════════════

export async function listSolicitudes(): Promise<Solicitud[]> {
  const { data } = await apiClient.get<Solicitud[]>(ENDPOINTS.solicitudes.list);
  return data;
}

export async function getSolicitud(id: string): Promise<Solicitud> {
  const { data } = await apiClient.get<Solicitud>(ENDPOINTS.solicitudes.detail(id));
  return data;
}

export async function createSolicitud(payload: Solicitud): Promise<Solicitud> {
  const { data } = await apiClient.post<Solicitud>(ENDPOINTS.solicitudes.create, payload);
  return data;
}

export async function updateSolicitud(
  id: string,
  patch: Partial<Solicitud>,
): Promise<Solicitud> {
  const { data } = await apiClient.patch<Solicitud>(ENDPOINTS.solicitudes.update(id), patch);
  return data;
}
