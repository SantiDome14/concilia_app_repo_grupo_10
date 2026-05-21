// ════════════════════════════════════════════════════════════════════
// MSW seed — alertas
// ────────────────────────────────────────────────────────────────────
// 6 entries spanning new / in_review / resolved / dismissed states.
// All `triage` category (the canonical template default). Apps that
// need `workflow` / `metric` / `cross_app_panel` extend this list.
// ════════════════════════════════════════════════════════════════════

import type { Alerta } from '@/types/genericos';

const initial: Alerta[] = [
  {
    id: 'ALT-001',
    concept: 'saldo_anomaly',
    category: 'triage',
    source_app: 'CORE',
    source_module: 'alertas',
    state: 'new',
    severity: 'critical',
    detected_at: '2026-04-29T07:30:00Z',
    title: 'Saldo negativo detectado en cuenta interna',
    summary: 'Cuenta -123.456,78 — superó umbral de tolerancia',
    timeline: [
      {
        id: 'altevt-001-1',
        at: '2026-04-29T07:30:00Z',
        actor_id: 'u-4',
        actor_name: 'Sistema',
        kind: 'system',
        label: 'Anomalía detectada por monitor',
      },
    ],
    comments: [],
  },
  {
    id: 'ALT-002',
    concept: 'login_failure',
    category: 'triage',
    source_app: 'CORE',
    source_module: 'alertas',
    state: 'new',
    severity: 'high',
    detected_at: '2026-04-29T09:10:00Z',
    title: '5 intentos de login fallidos',
    summary: 'Usuario consultor.acme — 5 fallos en 2 minutos',
    timeline: [
      {
        id: 'altevt-002-1',
        at: '2026-04-29T09:10:00Z',
        actor_id: 'u-4',
        actor_name: 'Sistema',
        kind: 'system',
        label: 'Brute-force candidate',
      },
    ],
    comments: [],
  },
  {
    id: 'ALT-003',
    concept: 'cron_failed',
    category: 'triage',
    source_app: 'CORE',
    source_module: 'alertas',
    state: 'in_review',
    severity: 'medium',
    detected_at: '2026-04-29T03:00:00Z',
    title: 'Job nocturno falló — recompute_daily',
    summary: 'Timeout tras 30s — ejecutado a las 03:00',
    timeline: [
      {
        id: 'altevt-003-1',
        at: '2026-04-29T03:00:00Z',
        actor_id: 'u-4',
        actor_name: 'Sistema',
        kind: 'system',
        label: 'Cron job timed out',
      },
      {
        id: 'altevt-003-2',
        at: '2026-04-29T08:15:00Z',
        actor_id: 'u-1',
        actor_name: 'Yasmani Rodríguez',
        kind: 'state_change',
        label: 'En revisión',
      },
    ],
    comments: [
      {
        id: 'altcmt-003-1',
        at: '2026-04-29T08:18:00Z',
        author_id: 'u-1',
        author_name: 'Yasmani Rodríguez',
        body: 'Investigando — sospecha de bloqueo en upstream DB.',
        parent_id: null,
      },
    ],
  },
  {
    id: 'ALT-004',
    concept: 'saldo_anomaly',
    category: 'triage',
    source_app: 'CORE',
    source_module: 'alertas',
    state: 'resolved',
    severity: 'medium',
    detected_at: '2026-04-25T14:20:00Z',
    title: 'Diferencia de conciliación — corregida',
    summary: 'Diferencia de USD 12,50 detectada y reconciliada',
    closure_comment: 'Diferencia regularizó al cierre — falsa alarma por timing de asiento.',
    timeline: [
      {
        id: 'altevt-004-1',
        at: '2026-04-25T14:20:00Z',
        actor_id: 'u-4',
        actor_name: 'Sistema',
        kind: 'system',
        label: 'Anomalía detectada',
      },
      {
        id: 'altevt-004-2',
        at: '2026-04-25T18:00:00Z',
        actor_id: 'u-2',
        actor_name: 'María González',
        kind: 'closed',
        label: 'Resuelta',
      },
    ],
    comments: [],
  },
  {
    id: 'ALT-005',
    concept: 'login_failure',
    category: 'triage',
    source_app: 'CORE',
    source_module: 'alertas',
    state: 'dismissed',
    severity: 'low',
    detected_at: '2026-04-24T08:00:00Z',
    title: 'Login fallido único — usuario olvidó password',
    summary: 'Usuario contactó por mesa de ayuda; sin amenaza',
    closure_comment: 'Usuario contactó al helpdesk y reseteó su password. No hay riesgo.',
    timeline: [
      {
        id: 'altevt-005-1',
        at: '2026-04-24T08:00:00Z',
        actor_id: 'u-4',
        actor_name: 'Sistema',
        kind: 'system',
        label: 'Detectado',
      },
      {
        id: 'altevt-005-2',
        at: '2026-04-24T09:30:00Z',
        actor_id: 'u-1',
        actor_name: 'Yasmani Rodríguez',
        kind: 'closed',
        label: 'Descartada',
      },
    ],
    comments: [],
  },
  {
    id: 'ALT-006',
    concept: 'capacity_warning',
    category: 'triage',
    source_app: 'CORE',
    source_module: 'alertas',
    state: 'new',
    severity: 'medium',
    detected_at: '2026-04-29T05:00:00Z',
    title: 'Uso de almacenamiento al 87%',
    summary: 'Disco principal — recomendación: planificar expansión',
    timeline: [
      {
        id: 'altevt-006-1',
        at: '2026-04-29T05:00:00Z',
        actor_id: 'u-4',
        actor_name: 'Sistema',
        kind: 'system',
        label: 'Umbral 85% superado',
      },
    ],
    comments: [],
  },
];

export let alertasSeed: Alerta[] = initial.map((a) => ({ ...a }));

export function resetAlertasSeed(): void {
  alertasSeed = initial.map((a) => ({ ...a }));
}
