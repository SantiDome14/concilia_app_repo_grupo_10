import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';

// ════════════════════════════════════════════════════════════════════
// Dashboard KPIs module API calls
// ════════════════════════════════════════════════════════════════════

export interface DashboardKpi {
  id: string;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'flat';
  href: string;
  hint?: string;
}

export async function listDashboardKpis(): Promise<DashboardKpi[]> {
  const { data } = await apiClient.get<DashboardKpi[]>(ENDPOINTS.dashboardKpis.list);
  return data;
}
