import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { UserProfile } from '@/types/models';

// ════════════════════════════════════════════════════════════════════
// Users module API calls
// ════════════════════════════════════════════════════════════════════

export async function listUsers(): Promise<UserProfile[]> {
  const { data } = await apiClient.get<UserProfile[]>(ENDPOINTS.users.list);
  return data;
}

export async function getCurrentUser(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>(ENDPOINTS.users.me);
  return data;
}
