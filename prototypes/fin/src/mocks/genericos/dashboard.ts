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
    id: 'movimientos-pendientes',
    label: 'Movimientos pendientes',
    value: 7,
    trend: 'down',
    href: '/disponibilidades?tab=movimientos',
    hint: 'sin imputación FIN',
  },
  {
    id: 'quotes-por-facturar',
    label: 'Quotes por facturar',
    value: 5,
    trend: 'flat',
    href: '/ventas',
    hint: 'ejecutados pendientes (Ventas — SOON)',
  },
  {
    id: 'retiros-en-cola',
    label: 'Retiros en cola',
    value: 5,
    trend: 'up',
    href: '/disponibilidades',
    hint: 'esperando asignación',
  },
];
