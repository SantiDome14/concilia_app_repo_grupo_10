// ════════════════════════════════════════════════════════════════════
// Mock dataset · FIN dashboard activity feed
// ────────────────────────────────────────────────────────────────────
// "Actividad reciente" sidebar on the FIN dashboard. Mirrors the
// legacy `prototypes/fin-old/fin-prototype.html` dashboard activity
// list. Every entry is a free-form string + a relative time chip + a
// semantic dot color matching the action's nature (success / info /
// warning).
// ════════════════════════════════════════════════════════════════════

export type ActivityKind = 'success' | 'info' | 'warning';

export interface DashboardActivityEntry {
  id: string;
  kind: ActivityKind;
  /** Plain text — the page renders bold tokens via dangerouslySetInnerHTML
   *  IS NOT used; instead the consumer composes the string with <b> spans. */
  text: string;
  time: string;
}

export const DASHBOARD_ACTIVITY: DashboardActivityEntry[] = [
  {
    id: 'act-001',
    kind: 'success',
    text: 'Yasmani R. imputó 12 movimientos al cliente ACME Corp',
    time: '8 min',
  },
  {
    id: 'act-002',
    kind: 'info',
    text: 'Juan Cruz L. generó factura A-0001-00043 para Tecno SA',
    time: '22 min',
  },
  {
    id: 'act-003',
    kind: 'warning',
    text: 'CRON ejecutó Reporte de Revenue · Diario',
    time: '1 hora',
  },
  {
    id: 'act-004',
    kind: 'success',
    text: 'Belén G. aprobó carga manual por USD 50.000 en Bridge',
    time: '2 horas',
  },
  {
    id: 'act-005',
    kind: 'info',
    text: 'Asignación de cuenta para retiro de Inversiones Norte · Pool BitGo USDC',
    time: '3 horas',
  },
];
