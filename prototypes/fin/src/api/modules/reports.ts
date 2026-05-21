import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { Report, ReportRun } from '@/types/genericos';

// ════════════════════════════════════════════════════════════════════
// Reports module API calls
// ════════════════════════════════════════════════════════════════════

export interface ReportCategoryDef {
  key: string;
  label: string;
  badgeClass: string;
}

export async function listReports(): Promise<Report[]> {
  const { data } = await apiClient.get<Report[]>(ENDPOINTS.reports.list);
  return data;
}

export async function updateReport(id: string, patch: Partial<Report>): Promise<Report> {
  const { data } = await apiClient.patch<Report>(ENDPOINTS.reports.update(id), patch);
  return data;
}

export async function listReportCategories(): Promise<ReportCategoryDef[]> {
  const { data } = await apiClient.get<ReportCategoryDef[]>(ENDPOINTS.reports.categories);
  return data;
}

export async function listReportRuns(): Promise<ReportRun[]> {
  const { data } = await apiClient.get<ReportRun[]>(ENDPOINTS.reports.runs.list);
  return data;
}

export async function createReportRun(payload: ReportRun): Promise<ReportRun> {
  const { data } = await apiClient.post<ReportRun>(ENDPOINTS.reports.runs.create, payload);
  return data;
}
