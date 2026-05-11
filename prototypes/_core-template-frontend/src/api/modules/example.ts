import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { PaginatedResponse, PaginationParams } from '@/types/api';
import type { ExampleRecord } from '@/types/models';

// ════════════════════════════════════════════════════════════════════
// Example module API calls
// ────────────────────────────────────────────────────────────────────
// Pattern for every domain module:
//   - One function per endpoint, typed input and output.
//   - Apps replace this file with their real domain.
// ════════════════════════════════════════════════════════════════════

export async function listExamples(
  params: PaginationParams = {},
): Promise<PaginatedResponse<ExampleRecord>> {
  const { data } = await apiClient.get<PaginatedResponse<ExampleRecord>>(
    ENDPOINTS.example.list,
    { params },
  );
  return data;
}

export async function getExample(id: string): Promise<ExampleRecord> {
  const { data } = await apiClient.get<ExampleRecord>(ENDPOINTS.example.detail(id));
  return data;
}

export async function createExample(
  payload: Omit<ExampleRecord, 'id' | 'date'>,
): Promise<ExampleRecord> {
  const { data } = await apiClient.post<ExampleRecord>(ENDPOINTS.example.create, payload);
  return data;
}

export async function updateExample(
  id: string,
  payload: Partial<Omit<ExampleRecord, 'id'>>,
): Promise<ExampleRecord> {
  const { data } = await apiClient.patch<ExampleRecord>(ENDPOINTS.example.update(id), payload);
  return data;
}

export async function deleteExample(id: string): Promise<void> {
  await apiClient.delete(ENDPOINTS.example.delete(id));
}
