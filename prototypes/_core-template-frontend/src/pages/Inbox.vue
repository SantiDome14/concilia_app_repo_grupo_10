<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Clock, Search } from 'lucide-vue-next';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/feedback/EmptyState.vue';
import {
  ViewToggle,
  CardsGrid,
  CardItem,
  type ViewMode,
} from '@/components/views';
import {
  Drawer,
  Timeline,
  CommentsThread,
} from '@/components/drawer';
import { KanbanBoard } from '@/components/kanban';
import { ManifestActionsMenu } from '@/components/manifest';
import { InboxCreateCTA, TriggeredActionsPanel } from '@/components/inbox';
import type { KanbanAxis, KanbanState } from '@/types/kanban';
import { useManifestModule } from '@/composables/useManifestModule';
import { INBOX_MANIFEST_KEY } from '@/manifests/framework.template.inbox.actions';
import { INBOX_SOLICITUDES } from '@/mocks/genericos/inbox';
import { CURRENT_USER, MOCK_USERS, findUser } from '@/mocks/genericos/users';
import type {
  InboxType,
  Solicitud,
  SolicitudState,
  TimelineEvent,
} from '@/types/genericos';

// ─── Display helpers ─────────────────────────────────────────────────
// `Solicitud<TPayload>` lifts type-specific text into `payload`; for the
// generic Inbox UI we look the headline / summary up from a payload
// convention (`title`, `description` or `summary`). Type-specific
// renderers MAY override later via per-type config.
type DisplayPayload = {
  title?: string;
  summary?: string;
  description?: string;
};

function solicitudTitle(s: Solicitud): string {
  const p = (s.payload ?? {}) as DisplayPayload;
  return p.title ?? s.type ?? s.id;
}

function solicitudSummary(s: Solicitud): string {
  const p = (s.payload ?? {}) as DisplayPayload;
  return p.description ?? p.summary ?? '';
}

function solicitudOwnerName(s: Solicitud): string {
  return findUser(s.owner)?.name ?? '';
}

function solicitudAssigneeName(s: Solicitud): string {
  return findUser(s.assignee)?.name ?? '';
}

function typeLabel(type: InboxType): string {
  return type === 'tarea' ? 'Tarea' : 'Solicitud';
}

function typeVariant(type: InboxType): 'info' | 'neutral' {
  return type === 'tarea' ? 'neutral' : 'info';
}

/** snake_case → UPPERCASE with spaces. e.g. 'aprobacion_pago' → 'APROBACION PAGO'. */
function humanizeConcept(c: string): string {
  if (!c) return '';
  return c.replace(/_/g, ' ').toUpperCase();
}

type SlaChip = {
  variant: BadgeVariants['variant'];
  label: string;
  showIcon: boolean;
};

function slaChip(s: Solicitud): SlaChip {
  if (s.sla_hours === null || s.sla_hours === undefined) {
    return { variant: 'neutral', label: '—', showIcon: false };
  }
  if (isInSla(s)) {
    return { variant: 'success', label: `${s.sla_hours}h`, showIcon: true };
  }
  return { variant: 'danger', label: 'Vencida', showIcon: true };
}

// ════════════════════════════════════════════════════════════════════
// Inbox — Solicitudes management surface (L1/L2/L3)
// ────────────────────────────────────────────────────────────────────
//   L1 — title + ViewToggle.
//   L2 — KPI cards (Activas, En SLA, Vencidas, Cerradas mes).
//   L3 — search + filters (Tipo / Estado) + body (list / cards / kanban).
//   Detail surface — side <Drawer> with Timeline + Comments.
//
// Manifest engine: actions (asignar_owner, cerrar_solicitud, rechazar)
// and the inbox.lifecycle kanban axis are declared in the
// `framework.template.inbox` manifest registered at boot.
//
// NOTE: the legacy "Activos / Histórico" Segmenter has been removed.
// Filtering by lifecycle is expressed via the Estado filter in L3,
// which lists all four states simultaneously.
// ════════════════════════════════════════════════════════════════════

const inbox = useManifestModule(INBOX_MANIFEST_KEY);

// ─── Page state ──────────────────────────────────────────────────────
const view = ref<ViewMode>('list');
const search = ref('');
const filterConcept = ref<string>('');
const filterState = ref<string>('');
const filterType = ref<'' | InboxType>('');
/** '' = Todos · '__unassigned__' = Sin asignar · '<user_id>' = filtered to that user. */
const filterAssignee = ref<string>('');

/** Human users available as assignee filter options (system actor excluded). */
const ASSIGNEE_FILTER_USERS = MOCK_USERS.filter((u) => u.role !== 'system');

// ─── Reactive dataset (mock-backed) ──────────────────────────────────
const solicitudes = ref<Solicitud[]>(
  INBOX_SOLICITUDES.map((s) => ({ ...s })),
);

const TERMINAL_STATES: SolicitudState[] = ['completed', 'rejected'];

const ACTIVE_CONCEPTS = computed(() => {
  const set = new Set<string>();
  for (const s of solicitudes.value) set.add(s.concept);
  return Array.from(set).sort();
});

const filteredSolicitudes = computed<Solicitud[]>(() => {
  const term = search.value.trim().toLowerCase();
  return solicitudes.value.filter((s) => {
    if (filterType.value && s.type !== filterType.value) return false;
    if (filterConcept.value && s.concept !== filterConcept.value) return false;
    if (filterAssignee.value) {
      if (filterAssignee.value === '__unassigned__') {
        if (s.assignee !== null && s.assignee !== undefined) return false;
      } else if (s.assignee !== filterAssignee.value) return false;
    }
    if (filterState.value && s.state !== filterState.value) return false;
    if (term) {
      const haystack = `${s.id} ${solicitudTitle(s)} ${solicitudSummary(s)}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
});

// ─── KPIs ────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const total = solicitudes.value;
  const active = total.filter((s) => !TERMINAL_STATES.includes(s.state));
  const enSla = active.filter((s) => isInSla(s));
  const vencidas = active.filter((s) => !isInSla(s));
  const cerradasMes = total.filter((s) => TERMINAL_STATES.includes(s.state));
  return {
    activas: active.length,
    enSla: enSla.length,
    vencidas: vencidas.length,
    cerradasMes: cerradasMes.length,
  };
});

function isInSla(s: Solicitud): boolean {
  if (s.sla_hours === null || s.sla_hours === undefined) return true;
  const created = Date.parse(s.created_at);
  if (Number.isNaN(created)) return true;
  const deadline = created + s.sla_hours * 3_600_000;
  return Date.now() <= deadline;
}

// ─── Drawer state ────────────────────────────────────────────────────
const drawerOpen = ref(false);
const drawerSolicitud = ref<Solicitud | null>(null);

function openDrawer(s: Solicitud): void {
  drawerSolicitud.value = s;
  drawerOpen.value = true;
}

// ─── Main CTA wiring ──────────────────────────────────────────────────
// `<InboxCreateCTA>` emits the newly-created Solicitud; we persist into
// the reactive mock dataset. The audit entry was already emitted by
// `<InboxCreateDialog>` (single source for `AuditEntryCTA`).
function handleCreatedSolicitud(s: Solicitud): void {
  solicitudes.value.push(s);
  drawerSolicitud.value = s;
  drawerOpen.value = true;
}

function closeDrawer(): void {
  drawerOpen.value = false;
  drawerSolicitud.value = null;
}

function statusVariant(state: SolicitudState): BadgeVariants['variant'] {
  if (state === 'completed') return 'success';
  if (state === 'rejected') return 'danger';
  if (state === 'en_proceso') return 'info';
  if (state === 'pendiente') return 'warning';
  return 'neutral';
}

const STATE_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completed: 'Completada',
  rejected: 'Rechazada',
};

function stateLabel(state: SolicitudState): string {
  return STATE_LABELS[state] ?? state;
}

// ─── Comments ────────────────────────────────────────────────────────
function addComment(payload: { body: string; parent_id?: string | null }): void {
  if (!drawerSolicitud.value) return;
  const id = `cmt-${drawerSolicitud.value.id}-${Date.now()}`;
  drawerSolicitud.value.comments.push({
    id,
    at: new Date().toISOString(),
    author_id: CURRENT_USER.id,
    author_name: CURRENT_USER.name,
    body: payload.body,
    parent_id: payload.parent_id ?? null,
  });
  const evt: TimelineEvent = {
    id: `evt-${id}`,
    at: new Date().toISOString(),
    actor_id: CURRENT_USER.id,
    actor_name: CURRENT_USER.name,
    kind: 'comment_added',
    label: 'Agregó un comentario',
  };
  drawerSolicitud.value.timeline.push(evt);
}

// ─── Manifest wiring (record resolver + after-mutation refetch) ──────
onMounted(() => {
  inbox.registerRecordResolver((ref) => {
    if (typeof ref === 'string') {
      return solicitudes.value.find((s) => s.id === ref) as
        | Record<string, unknown>
        | undefined;
    }
    if (ref && typeof ref === 'object' && typeof ref.id === 'string') {
      return solicitudes.value.find((s) => s.id === ref.id) as
        | Record<string, unknown>
        | undefined;
    }
    return undefined;
  });
  inbox.registerAfterMutation(() => {
    // The manifest engine mutates records in place; nothing to re-fetch
    // for the mock-backed dataset. Real apps invalidate their query cache
    // here.
  });
});

// ─── Action menu (per-row) ───────────────────────────────────────────
function rowActions(s: Solicitud): ReturnType<typeof inbox.resolveActionsFor> {
  return inbox.resolveActionsFor(s as unknown as Record<string, unknown>);
}

function performAction(actionId: string, s: Solicitud): void {
  inbox.openDialog(actionId, s as unknown as Record<string, unknown>);
}

// ─── Kanban axis (Tablero view) ──────────────────────────────────────
const INBOX_KANBAN_STATES: KanbanState[] = [
  { id: 'pendiente', label: 'Pendiente', column_label: 'Pendiente', order: 1 },
  { id: 'en_proceso', label: 'En proceso', column_label: 'En proceso', order: 2 },
  { id: 'completed', label: 'Completada', column_label: 'Completada', order: 3, terminal: true },
  { id: 'rejected', label: 'Rechazada', column_label: 'Rechazada', order: 4, terminal: true },
];

const INBOX_KANBAN_AXIS: KanbanAxis = {
  axis_id: 'inbox.lifecycle',
  label: 'Estado',
  description: 'Lifecycle de la Solicitud',
  state_field: 'state',
  states: INBOX_KANBAN_STATES,
  transitions: [
    { from: 'pendiente', to: 'en_proceso', mode: 'free' },
    { from: 'en_proceso', to: 'completed', mode: 'modal' },
    { from: 'en_proceso', to: 'rejected', mode: 'modal' },
    { from: 'pendiente', to: 'completed', mode: 'modal' },
    { from: 'pendiente', to: 'rejected', mode: 'modal' },
  ],
};

function handleKanbanTransition(payload: {
  recordId: string;
  fromState: string;
  toState: string;
  mode: string;
}): void {
  const s = solicitudes.value.find((row) => row.id === payload.recordId);
  if (!s) return;
  if (payload.mode === 'modal') {
    if (payload.toState === 'completed') {
      inbox.openDialog(
        'inbox.cerrar_solicitud',
        s as unknown as Record<string, unknown>,
      );
    } else if (payload.toState === 'rejected') {
      inbox.openDialog(
        'inbox.rechazar',
        s as unknown as Record<string, unknown>,
      );
    }
    return;
  }
  // Free transition — write the new state immediately + emit a timeline event.
  // For `pendiente → en_proceso` we mirror the `inbox.tomar` manifest action:
  // auto-assign owner to the current user (when null) and use the `taken`
  // event kind. Other free transitions emit a generic `state_change`.
  const wasTomar =
    payload.fromState === 'pendiente'
    && payload.toState === 'en_proceso';
  s.state = payload.toState as SolicitudState;
  s.updated_at = new Date().toISOString();
  if (wasTomar && s.owner === null) {
    s.owner = CURRENT_USER.id;
  }
  s.timeline.push({
    id: `evt-${s.id}-${Date.now()}`,
    at: s.updated_at,
    actor_id: CURRENT_USER.id,
    actor_name: CURRENT_USER.name,
    kind: wasTomar ? 'taken' : 'state_change',
    label: wasTomar
      ? 'Tomada — en proceso'
      : `Estado: ${stateLabel(payload.toState)}`,
  });
}

// ─── State filter options (all states surfaced together) ────────────
const STATE_FILTER_OPTIONS = ['pendiente', 'en_proceso', 'completed', 'rejected'];
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="inbox-page">
    <!-- L1 · Page header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Inbox</h1>
        <p class="mt-1 text-xs text-t-3">
          Solicitudes: alta humana con owner + lifecycle.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <InboxCreateCTA @created="handleCreatedSolicitud" />
        <ViewToggle v-model="view" :views="['list', 'cards', 'kanban']" />
      </div>
    </header>

    <!-- L2 · KPI cards -->
    <section
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      data-testid="inbox-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Activas
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.activas }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">requieren acción</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          En SLA
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
          {{ kpis.enSla }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">dentro de plazo</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Vencidas
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-danger">
          {{ kpis.vencidas }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">SLA superado</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Cerradas mes
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.cerradasMes }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">cerradas en el período</div>
      </div>
    </section>

    <!-- L3 · Section header (search + filters) -->
    <div
      class="flex flex-wrap items-center gap-2"
      data-testid="inbox-section-header"
    >
      <span class="text-sm font-bold text-t-2">Solicitudes</span>
      <div class="w-4" />
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
        <Input
          v-model="search"
          placeholder="Buscar por título o ID…"
          class="w-[220px] pl-8"
        />
      </div>
      <div class="flex-1" />
      <select
        v-model="filterType"
        class="rounded-md border border-b-2 bg-card px-3 py-2 text-xs text-t-2"
        aria-label="Filtrar por tipo"
        data-testid="filter-type"
      >
        <option value="">Tipo · Todos</option>
        <option value="solicitud">Solicitudes</option>
        <option value="tarea">Tareas</option>
      </select>
      <select
        v-model="filterConcept"
        class="rounded-md border border-b-2 bg-card px-3 py-2 text-xs text-t-2"
        aria-label="Filtrar por concepto"
        data-testid="filter-concept"
      >
        <option value="">Concepto · Todos</option>
        <option v-for="c in ACTIVE_CONCEPTS" :key="c" :value="c">{{ c }}</option>
      </select>
      <select
        v-model="filterAssignee"
        class="rounded-md border border-b-2 bg-card px-3 py-2 text-xs text-t-2"
        aria-label="Filtrar por responsable asignado"
        data-testid="filter-assignee"
      >
        <option value="">Asignado a · Todos</option>
        <option value="__unassigned__">Sin asignar</option>
        <option v-for="u in ASSIGNEE_FILTER_USERS" :key="u.id" :value="u.id">
          {{ u.name }}
        </option>
      </select>
      <select
        v-model="filterState"
        class="rounded-md border border-b-2 bg-card px-3 py-2 text-xs text-t-2"
        aria-label="Filtrar por estado"
        data-testid="filter-state"
      >
        <option value="">Estado · Todos</option>
        <option v-for="st in STATE_FILTER_OPTIONS" :key="st" :value="st">
          {{ stateLabel(st) }}
        </option>
      </select>
    </div>

    <!-- L3 · Body -->
    <section data-testid="inbox-body">
      <EmptyState
        v-if="filteredSolicitudes.length === 0"
        title="No hay Solicitudes en este momento"
        description="Cuando se reciban Solicitudes aparecerán aquí."
      />

      <!-- LIST view -->
      <div
        v-else-if="view === 'list'"
        class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
        data-testid="inbox-list"
      >
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-2">
              <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Título</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Concepto</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Origen</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">SLA</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Asignado a</th>
              <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in filteredSolicitudes"
              :key="s.id"
              class="cursor-pointer border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              :data-testid="`row-${s.id}`"
              @click="openDrawer(s)"
            >
              <td class="px-[18px] py-2.5">
                <span class="font-mono text-xs text-t-3">{{ s.id }}</span>
              </td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="typeVariant(s.type)">{{ typeLabel(s.type) }}</Badge>
              </td>
              <td class="px-3.5 py-2.5 text-[13px] font-semibold text-t-2">{{ solicitudTitle(s) }}</td>
              <td class="px-3.5 py-2.5">
                <Badge variant="neutral">{{ humanizeConcept(s.concept) }}</Badge>
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ s.source_module }}</td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="statusVariant(s.state)">{{ stateLabel(s.state) }}</Badge>
              </td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="slaChip(s).variant" class="inline-flex items-center gap-1">
                  <Clock v-if="slaChip(s).showIcon" class="h-3 w-3" />
                  {{ slaChip(s).label }}
                </Badge>
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ solicitudAssigneeName(s) || 'Sin asignar' }}</td>
              <td class="px-3.5 py-2.5 text-center" @click.stop>
                <div class="flex items-center justify-center">
                  <ManifestActionsMenu
                    :manifest-key="INBOX_MANIFEST_KEY"
                    :record="s as unknown as Record<string, unknown>"
                    variant="table"
                    :data-testid="`row-${s.id}-actions`"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- CARDS view -->
      <CardsGrid
        v-else-if="view === 'cards'"
        data-testid="inbox-cards"
      >
        <CardItem
          v-for="s in filteredSolicitudes"
          :key="s.id"
          :record="s as unknown as Record<string, unknown>"
          :severity="s.severity"
          :data-testid="`card-${s.id}`"
          @click="openDrawer(s)"
        >
          <template #header>
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <span class="font-mono text-[11px] text-t-4">{{ s.id }}</span>
              <span class="truncate text-sm font-semibold text-t-1">{{ solicitudTitle(s) }}</span>
            </div>
            <Badge :variant="typeVariant(s.type)">{{ typeLabel(s.type) }}</Badge>
            <Badge :variant="statusVariant(s.state)">{{ stateLabel(s.state) }}</Badge>
            <span @click.stop>
              <ManifestActionsMenu
                :manifest-key="INBOX_MANIFEST_KEY"
                :record="s as unknown as Record<string, unknown>"
                variant="card"
                :data-testid="`card-${s.id}-actions`"
              />
            </span>
          </template>
          <template #body>
            <p class="line-clamp-3 text-xs text-t-3">{{ solicitudSummary(s) || '—' }}</p>
            <div class="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <span class="text-t-4">Concepto</span>
              <span>
                <Badge variant="neutral">{{ humanizeConcept(s.concept) }}</Badge>
              </span>
              <span class="text-t-4">Asignado a</span>
              <span class="text-t-2">{{ solicitudAssigneeName(s) || 'Sin asignar' }}</span>
            </div>
          </template>
          <template #footer>
            <span>{{ s.created_at.slice(0, 10) }}</span>
            <Badge :variant="slaChip(s).variant" class="inline-flex items-center gap-1">
              <Clock v-if="slaChip(s).showIcon" class="h-3 w-3" />
              {{ slaChip(s).label }}
            </Badge>
          </template>
        </CardItem>
      </CardsGrid>

      <!-- KANBAN view -->
      <div
        v-else
        class="min-h-[480px]"
        data-testid="inbox-kanban-wrapper"
      >
        <KanbanBoard
          :axis="INBOX_KANBAN_AXIS"
          :records="filteredSolicitudes as unknown as Record<string, unknown>[] as never"
          title="Solicitudes"
          @transition="handleKanbanTransition"
        >
          <template #card="{ record }">
            <CardItem
              :record="record"
              :severity="(record as Solicitud).severity"
              @click="openDrawer(record as unknown as Solicitud)"
            >
              <template #header>
                <div class="flex min-w-0 flex-1 items-center gap-2">
                  <span class="font-mono text-[11px] text-t-4">{{ (record as Solicitud).id }}</span>
                  <span class="truncate text-sm font-semibold text-t-1">{{ solicitudTitle(record as Solicitud) }}</span>
                </div>
                <Badge :variant="typeVariant((record as Solicitud).type)">
                  {{ typeLabel((record as Solicitud).type) }}
                </Badge>
                <span @click.stop>
                  <ManifestActionsMenu
                    :manifest-key="INBOX_MANIFEST_KEY"
                    :record="record"
                    variant="card"
                  />
                </span>
              </template>
              <template #body>
                <p class="line-clamp-2 text-xs text-t-3">{{ solicitudSummary(record as Solicitud) || '—' }}</p>
              </template>
              <template #footer>
                <span>{{ solicitudAssigneeName(record as Solicitud) || 'Sin asignar' }}</span>
                <Badge
                  :variant="slaChip(record as Solicitud).variant"
                  class="inline-flex items-center gap-1"
                >
                  <Clock v-if="slaChip(record as Solicitud).showIcon" class="h-3 w-3" />
                  {{ slaChip(record as Solicitud).label }}
                </Badge>
              </template>
            </CardItem>
          </template>
        </KanbanBoard>
      </div>
    </section>

    <!-- Drawer detail -->
    <Drawer
      v-if="drawerSolicitud"
      :open="drawerOpen"
      :record-id="drawerSolicitud.id"
      :title="solicitudTitle(drawerSolicitud)"
      :subtitle="solicitudSummary(drawerSolicitud) || undefined"
      :status-badge="{ label: stateLabel(drawerSolicitud.state), variant: statusVariant(drawerSolicitud.state) }"
      data-testid="inbox-drawer"
      @update:open="(v) => (v ? null : closeDrawer())"
    >
      <!-- Primary actions — top of body, matches prototype layout -->
      <template #primary-actions>
        <Button
          v-for="ra in rowActions(drawerSolicitud).filter((r) => r.visible)"
          :key="ra.action.id"
          :variant="ra.action.danger ? 'danger' : 'primary'"
          size="sm"
          :disabled="!ra.enabled"
          :title="ra.reason ?? ''"
          :data-testid="`drawer-action-${ra.action.id}`"
          @click="performAction(ra.action.id, drawerSolicitud)"
        >
          {{ ra.action.label }}
        </Button>
      </template>

      <!-- INFORMACIÓN section -->
      <div class="flex flex-col gap-2.5">
        <h3 class="text-[11px] font-semibold uppercase tracking-wider text-t-3">
          Información
        </h3>
        <div class="grid grid-cols-2 gap-2.5 text-sm">
          <div class="rounded-md border border-b-2 bg-[#111] p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Tipo</div>
            <div>
              <Badge :variant="typeVariant(drawerSolicitud.type)">
                {{ typeLabel(drawerSolicitud.type) }}
              </Badge>
            </div>
          </div>
          <div class="rounded-md border border-b-2 bg-[#111] p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Concepto</div>
            <div>
              <Badge variant="neutral">{{ humanizeConcept(drawerSolicitud.concept) }}</Badge>
            </div>
          </div>
          <div class="rounded-md border border-b-2 bg-[#111] p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Origen</div>
            <div class="text-[13px] font-semibold text-t-2">
              {{ drawerSolicitud.source_app }} · {{ drawerSolicitud.source_module }}
            </div>
          </div>
          <div class="rounded-md border border-b-2 bg-[#111] p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Asignado a</div>
            <div class="text-[13px] font-semibold text-t-2">{{ solicitudAssigneeName(drawerSolicitud) || 'Sin asignar' }}</div>
          </div>
          <div class="rounded-md border border-b-2 bg-[#111] p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Owner</div>
            <div class="text-[13px] font-semibold text-t-2">{{ solicitudOwnerName(drawerSolicitud) || 'Sin asignar' }}</div>
          </div>
          <div class="rounded-md border border-b-2 bg-[#111] p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">SLA</div>
            <div>
              <Badge :variant="slaChip(drawerSolicitud).variant" class="inline-flex items-center gap-1">
                <Clock v-if="slaChip(drawerSolicitud).showIcon" class="h-3 w-3" />
                {{ slaChip(drawerSolicitud).label === '—'
                    ? (drawerSolicitud.sla_hours === null ? 'Sin SLA' : '—')
                    : slaChip(drawerSolicitud).label }}
              </Badge>
            </div>
          </div>
          <div
            v-if="solicitudSummary(drawerSolicitud)"
            class="col-span-2 rounded-md border border-b-2 bg-[#111] p-3"
          >
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Contexto</div>
            <div class="whitespace-pre-wrap text-[13px] text-t-2">{{ solicitudSummary(drawerSolicitud) }}</div>
          </div>
          <div
            v-if="drawerSolicitud.closure_comment"
            class="col-span-2 rounded-md border border-b-2 bg-[#111] p-3"
          >
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Comentario de cierre</div>
            <div class="whitespace-pre-wrap text-[13px] text-t-2">{{ drawerSolicitud.closure_comment }}</div>
          </div>
        </div>
      </div>

      <!-- TRIGGERED ACTIONS panel — rendered only when populated -->
      <TriggeredActionsPanel :entries="drawerSolicitud.triggered_actions" />

      <template #timeline>
        <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-t-3">Timeline</h3>
        <Timeline :events="drawerSolicitud.timeline" />
      </template>
      <template #comments>
        <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-t-3">Comentarios</h3>
        <CommentsThread
          :comments="drawerSolicitud.comments"
          :current-user-id="CURRENT_USER.id"
          @add="addComment"
        />
      </template>
    </Drawer>
  </div>
</template>
