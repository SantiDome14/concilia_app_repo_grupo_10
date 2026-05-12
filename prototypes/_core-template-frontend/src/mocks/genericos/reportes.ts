// ════════════════════════════════════════════════════════════════════
// Mock Reports + ReportRuns — seed data for the Reportes module
// ────────────────────────────────────────────────────────────────────
// CATALOG mirrors the prototype (`prototypes/_core-template-frontend.html`,
// lines 5149-5185) — five reports including a CRON Mensual, a CRON
// Semanal, an On-demand, one with two dependencies (one completed),
// and one locked. HISTORY runs span success/error and manual/cron.
//
// 2026-05-10 product-spec alignment additions (mandatory on every Report):
//   - `permissions: ReportPermissions` — 4 independent capability lists
//   - `consumer_apps: ConsumerAppRef[]` — empty = headless
//   - `allows_auto_generation: boolean` — drives próximo-emisión and
//     dependency-incomplete event bifurcation
// ════════════════════════════════════════════════════════════════════

import type { Report, ReportRun, ReportPermissions } from '@/types/genericos';

/**
 * Baseline category configuration. Apps extend or override this map
 * with their own keys; the page reads it to render category sections
 * + badges in the catalog.
 */
export interface ReportCategoryDef {
  key: string;
  label: string;
  badgeClass: string;
}

export const REPORT_CATEGORIES: ReportCategoryDef[] = [
  { key: 'INTERNO', label: 'Internos', badgeClass: 'border-success/30 text-success' },
  { key: 'OPERATIVO', label: 'Operativos', badgeClass: 'border-info/30 text-info' },
];

export const REPORT_CATEGORY_BY_KEY: Record<string, ReportCategoryDef> = Object.fromEntries(
  REPORT_CATEGORIES.map((c) => [c.key, c]),
);

// Default permissions shared by template-shipped reports. Apps that
// clone the template tighten these per-report using their own
// capability catalog (per `core-modulo-genericos` Requirement:
// Reportes MUST declare ReportPermissions with secure defaults).
const TEMPLATE_DEFAULT_PERMISSIONS: ReportPermissions = {
  view: ['VIEW_REPORTS'],
  execute: ['EXECUTE_REPORTS'],
  edit: ['EDIT_REPORTS'],
  delete: ['DELETE_REPORTS'],
};

export const REPORTS_CATALOG: Report[] = [
  {
    id: 'rpt_001',
    name: 'Reporte Genérico Mensual',
    description: 'Reporte placeholder · descripción del propósito y alcance.',
    category: 'INTERNO',
    periodicity: 'Mensual',
    next: '2026-05-05',
    cron_enabled: true,
    cron_active: true,
    format: 'PDF',
    retention: '5 años',
    params: ['Período (mes/año)'],
    antic: 7,
    permissions: TEMPLATE_DEFAULT_PERMISSIONS,
    consumer_apps: [{ app: 'CORE' }],
    allows_auto_generation: true,
  },
  {
    id: 'rpt_002',
    name: 'Indicadores Operativos',
    description: 'Métricas operativas semanales · placeholder.',
    category: 'OPERATIVO',
    periodicity: 'Semanal',
    next: '2026-05-04',
    cron_enabled: true,
    cron_active: true,
    format: 'XLSX',
    retention: '2 años',
    params: ['Semana', 'Año'],
    antic: 2,
    permissions: TEMPLATE_DEFAULT_PERMISSIONS,
    consumer_apps: [{ app: 'CORE' }],
    allows_auto_generation: true,
  },
  {
    id: 'rpt_003',
    name: 'Reporte Ad-hoc Ejemplo',
    description: 'Reporte sin periodicidad fija — se genera bajo demanda.',
    category: 'INTERNO',
    periodicity: 'On-demand',
    next: null,
    cron_enabled: false,
    format: 'CSV',
    retention: '1 año',
    params: ['Descripción del caso'],
    permissions: TEMPLATE_DEFAULT_PERMISSIONS,
    consumer_apps: [{ app: 'CORE' }],
    // On-demand: no auto-generation path. Próximo-emisión events
    // (when applicable) route to the consumer Inbox as a Tarea.
    allows_auto_generation: false,
  },
  {
    id: 'rpt_004',
    name: 'Reporte Consolidado Inter-Área',
    description:
      'Reporte placeholder que requiere coordinación de varias apps antes de poder generarse.',
    category: 'INTERNO',
    periodicity: 'Mensual',
    next: '2026-05-10',
    cron_enabled: true,
    cron_active: true,
    format: 'PDF',
    retention: '10 años',
    params: ['Período (mes/año)'],
    antic: 5,
    dependencies: [
      {
        app: 'OPS',
        module: 'Movimientos',
        task: 'Conciliación operativa cerrada',
        owner_role: 'OPS_OFFICER',
        sla_days_before: 2,
        completed: false,
        // Binds to a recurring Inbox series (Decision 10): when an
        // instance of `daily_reconciliation` closes, the dependency
        // auto-resolves and any open `report_dependency_block` Tarea
        // auto-archives.
        recurring_definition_id: 'series-daily-reconciliation',
      },
      {
        app: 'LEX',
        module: 'Alertas',
        task: 'Cierre de alertas del período',
        owner_role: 'COMPLIANCE',
        sla_days_before: 1,
        completed: true,
      },
    ],
    permissions: TEMPLATE_DEFAULT_PERMISSIONS,
    consumer_apps: [{ app: 'CORE' }],
    allows_auto_generation: true,
  },
  {
    id: 'rpt_005',
    name: 'Análisis Especializado (Bloqueado)',
    description: 'Ejemplo de reporte futuro · visible en el catálogo pero no generable aún.',
    category: 'OPERATIVO',
    periodicity: 'Mensual',
    next: null,
    cron_enabled: false,
    format: 'PDF',
    locked: true,
    locked_reason: 'Bloqueado · ejemplo de reporte futuro',
    permissions: TEMPLATE_DEFAULT_PERMISSIONS,
    consumer_apps: [{ app: 'CORE' }],
    allows_auto_generation: false,
  },
];

export const REPORT_RUNS: ReportRun[] = [
  {
    id: 'g001',
    report_id: 'rpt_001',
    requested_at: '2026-04-05T02:00:00Z',
    completed_at: '2026-04-05T02:04:23Z',
    status: 'completed',
    output_url: 'https://example.com/reports/g001.pdf',
    requested_by_name: 'Sistema (CRON)',
    trigger: { type: 'cron' },
    params: 'Período: Marzo 2026',
  },
  {
    id: 'g002',
    report_id: 'rpt_001',
    requested_at: '2026-03-05T02:00:00Z',
    completed_at: '2026-03-05T02:03:11Z',
    status: 'completed',
    output_url: 'https://example.com/reports/g002.pdf',
    requested_by_name: 'Sistema (CRON)',
    trigger: { type: 'cron' },
    params: 'Período: Febrero 2026',
  },
  {
    id: 'g003',
    report_id: 'rpt_002',
    requested_at: '2026-04-21T08:00:00Z',
    completed_at: '2026-04-21T08:02:18Z',
    status: 'completed',
    output_url: 'https://example.com/reports/g003.xlsx',
    requested_by_name: 'Sistema (CRON)',
    trigger: { type: 'cron' },
    params: 'Semana: 17 | Año: 2026',
  },
  {
    id: 'g004',
    report_id: 'rpt_002',
    requested_at: '2026-04-14T08:00:00Z',
    completed_at: '2026-04-14T08:02:55Z',
    status: 'completed',
    output_url: 'https://example.com/reports/g004.xlsx',
    requested_by_name: 'Sistema (CRON)',
    trigger: { type: 'cron' },
    params: 'Semana: 16 | Año: 2026',
  },
  {
    id: 'g005',
    report_id: 'rpt_002',
    requested_at: '2026-04-07T08:00:00Z',
    completed_at: '2026-04-07T08:14:22Z',
    status: 'failed',
    error_message: 'Error de conexión con origen de datos',
    requested_by_name: 'Sistema (CRON)',
    trigger: { type: 'cron' },
    params: 'Semana: 15 | Año: 2026',
  },
  {
    id: 'g006',
    report_id: 'rpt_003',
    requested_at: '2026-04-18T11:23:00Z',
    completed_at: '2026-04-18T11:24:12Z',
    status: 'completed',
    output_url: 'https://example.com/reports/g006.csv',
    requested_by_name: 'Juan García',
    trigger: { type: 'manual', user_id: 'u-jg', user_name: 'Juan García' },
    params: 'Caso: Ejemplo placeholder',
  },
  {
    id: 'g007',
    report_id: 'rpt_004',
    requested_at: '2026-04-10T06:00:00Z',
    completed_at: '2026-04-10T06:09:33Z',
    status: 'completed',
    output_url: 'https://example.com/reports/g007.pdf',
    requested_by_name: 'Sistema (CRON)',
    trigger: { type: 'cron' },
    params: 'Período: Marzo 2026',
    // Example: this run was generated with one dependency still pending
    // (rpt_004 has `allows_auto_generation: true`). The snapshot is
    // persisted so an audit can reconstruct what was incomplete.
    dependencies_unmet: [
      {
        app: 'OPS',
        module: 'Movimientos',
        task: 'Conciliación operativa cerrada',
        owner_role: 'OPS_OFFICER',
        sla_days_before: 2,
        recurring_definition_id: 'series-daily-reconciliation',
        state_at_run: 'pending',
      },
    ],
  },
  {
    id: 'g008',
    report_id: 'rpt_001',
    requested_at: '2026-04-12T14:22:00Z',
    completed_at: '2026-04-12T14:23:18Z',
    status: 'completed',
    output_url: 'https://example.com/reports/g008.pdf',
    requested_by_name: 'Yasmani Rodríguez',
    trigger: { type: 'manual', user_id: 'u-yr', user_name: 'Yasmani Rodríguez' },
    params: 'Período: Marzo 2026 (reenvío)',
  },
];
