// ════════════════════════════════════════════════════════════════════
// MSW seed — dashboard KPIs
// ────────────────────────────────────────────────────────────────────
// Three placeholder KPI tiles plus a fourth dynamic one computed at
// page-level from the inbox/alertas/reports queries.
// ════════════════════════════════════════════════════════════════════

import type { DashboardKpi } from '@/api/modules/dashboardKpis';

const initial: DashboardKpi[] = [
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

export let dashboardKpisSeed: DashboardKpi[] = [...initial];

export function resetDashboardKpisSeed(): void {
  dashboardKpisSeed = [...initial];
}
