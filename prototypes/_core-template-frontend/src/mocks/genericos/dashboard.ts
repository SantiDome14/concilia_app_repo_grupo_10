// ════════════════════════════════════════════════════════════════════
// Mock Dashboard KPIs — seed data for the consolidated home
// ────────────────────────────────────────────────────────────────────
// Each tile is clickable and navigates to its `href`. The Dashboard
// page also computes 3 dynamic counters from the Inbox/Alertas/Reportes
// mock data (unread Solicitudes, critical Alertas, pending Reportes).
// ════════════════════════════════════════════════════════════════════

export interface DashboardKpi {
  id: string;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'flat';
  href: string;
  hint?: string;
}

export const DASHBOARD_KPIS: DashboardKpi[] = [
  {
    id: 'volumen-mes',
    label: 'Volumen procesado del mes',
    value: 'USD 1.2M',
    trend: 'up',
    href: '/modulo-a',
    hint: '+12% vs. mes anterior',
  },
  {
    id: 'tasa-aprobacion',
    label: 'Tasa de aprobación',
    value: '94.7%',
    trend: 'flat',
    href: '/modulo-b',
    hint: 'estable últimos 30 días',
  },
  {
    id: 'tiempo-promedio',
    label: 'Tiempo promedio de resolución',
    value: '4.2h',
    trend: 'down',
    href: '/inbox',
    hint: '−18% vs. semana pasada',
  },
];
