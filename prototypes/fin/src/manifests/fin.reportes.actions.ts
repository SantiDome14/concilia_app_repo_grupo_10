// ════════════════════════════════════════════════════════════════════
// Reportes manifest — fin.reportes
// ────────────────────────────────────────────────────────────────────
// Catálogo actions:
//   - reportes.generar_report   — start a new ReportRun from a Report.
//                                  Disabled with chip "Dependencia" when
//                                  any dependency is unfulfilled and within
//                                  the SLA window (depsStatus.blocked).
//   - reportes.configurar_cron  — toggle automatic generation, adjust the
//                                  next emission date, and the alerts
//                                  anticipation window. Available on every
//                                  non-locked card regardless of whether
//                                  CRON is currently enabled.
// Ejecución actions:
//   - reportes.descargar        — emit toast that download started.
//                                  Enabled only when status === 'completed'.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const REPORTES_MANIFEST_KEY = 'fin.reportes' as const;

export const REPORTES_MANIFEST: Manifest = {
  app: 'fin',
  module: 'reportes',
  scope: 'module',
  schema_version: '1',
  actions: [
    {
      id: 'reportes.generar_report',
      dimension: 'documentacion',
      label: 'Generar',
      description: 'Inicia una nueva corrida del reporte',
      icon: 'play',
      dialog: {
        title: 'Generar {record.name}',
        description: '{record.category} · {record.format}',
        info_banner: {
          variant: 'info',
          text: '{record.description}',
        },
        fields: [
          {
            id: 'period',
            label: 'Período',
            type: 'text',
            placeholder: 'Ej. Marzo 2026',
            required: true,
          },
          {
            id: 'granularity',
            label: 'Granularidad',
            type: 'select',
            placeholder: 'Valor',
            options: [
              { value: 'daily', label: 'Diaria' },
              { value: 'weekly', label: 'Semanal' },
              { value: 'monthly', label: 'Mensual' },
            ],
          },
          {
            id: 'sociedad',
            label: 'Sociedad',
            type: 'text',
            placeholder: 'Valor',
          },
        ],
        confirm_label: 'Generar ahora',
      },
      on_confirm: {
        audit: true,
        toast: 'Generación de reporte iniciada',
      },
    },
    {
      id: 'reportes.configurar_cron',
      dimension: 'documentacion',
      label: 'Configurar CRON',
      description:
        'Activá o pausá la generación automática y ajustá la próxima fecha y la anticipación de alertas.',
      icon: 'clock',
      dialog: {
        title: 'Configurar CRON',
        description: '{record.name}',
        info_banner: {
          variant: 'info',
          text: 'Activá o pausá la generación automática y ajustá la próxima fecha y la anticipación de alertas.',
        },
        fields: [
          {
            id: 'cron_active',
            label: 'Estado',
            type: 'boolean',
            placeholder: 'Generación automática activa',
          },
          {
            id: 'next',
            label: 'Próxima fecha de emisión',
            type: 'date',
          },
          {
            id: 'antic',
            label: 'Anticipación alertas (días)',
            type: 'number',
            min: 0,
            max: 90,
            default: 3,
          },
        ],
        confirm_label: 'Guardar',
        cancel_label: 'Cancelar',
      },
      on_confirm: {
        audit: true,
        update_fields: ['cron_active', 'next', 'antic'],
        toast: 'Configuración de CRON guardada',
      },
    },
    {
      id: 'reportes.descargar',
      dimension: 'documentacion',
      label: 'Descargar',
      description: 'Descarga la salida del reporte completado',
      icon: 'download',
      enable_when: {
        field_equals: { field: 'status', value: 'completed' },
      },
      disable_reason: 'Solo disponible cuando la corrida está completada',
      disable_tag: 'Estado',
      on_confirm: {
        audit: true,
        toast: 'Descarga iniciada',
      },
    },
  ],
};
