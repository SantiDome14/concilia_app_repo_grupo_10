<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Search } from 'lucide-vue-next';
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
import type { KanbanAxis, KanbanState } from '@/types/kanban';
import { useManifestModule } from '@/composables/useManifestModule';
import { ALERTAS_MANIFEST_KEY } from '@/manifests/fin.alertas.actions';
import { ALERTS } from '@/mocks/genericos/alertas';
import { CURRENT_USER } from '@/mocks/genericos/users';
import type {
  Alerta,
  AlertaState,
  Severity,
  TimelineEvent,
} from '@/types/genericos';

// ════════════════════════════════════════════════════════════════════
// Alertas — system-detected events surface (L1/L2/L3, profile A default)
// ────────────────────────────────────────────────────────────────────
//   L1 — title + ViewToggle.
//   L2 — KPI cards (Críticas hoy, En revisión, Resueltas mes, Descartadas mes).
//   L3 — search + filters (Tipo / Severidad / Estado) + body (list / cards / kanban).
//   Detail surface — side <Drawer> with Timeline + Comments.
//
// Terminal-state transitions (resolved / dismissed) require the
// shared <ClosureModal> via the manifest's `mode: 'modal'` actions
// (alertas.marcar_resolved, alertas.marcar_dismissed).
//
// NOTE: the legacy "Nuevas / Histórico" Segmenter has been removed.
// Filtering by lifecycle is expressed via the Estado filter in L3.
// ════════════════════════════════════════════════════════════════════

const alertasMod = useManifestModule(ALERTAS_MANIFEST_KEY);

// ─── State ───────────────────────────────────────────────────────────
const view = ref<ViewMode>('list');
const search = ref('');
const filterType = ref<string>('');
const filterSeverity = ref<string>('');
const filterState = ref<string>('');

const alertas = ref<Alerta[]>(ALERTS.map((a) => ({ ...a })));

const ACTIVE_TYPES = computed(() => {
  const set = new Set<string>();
  for (const a of alertas.value) set.add(a.type);
  return Array.from(set).sort();
});

const filteredAlertas = computed<Alerta[]>(() => {
  const term = search.value.trim().toLowerCase();
  return alertas.value.filter((a) => {
    if (filterType.value && a.type !== filterType.value) return false;
    if (filterSeverity.value && a.severity !== filterSeverity.value) return false;
    if (filterState.value && a.state !== filterState.value) return false;
    if (term) {
      const haystack = `${a.id} ${a.title} ${a.summary ?? ''}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
});

// ─── KPIs ────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    criticasHoy: alertas.value.filter(
      (a) =>
        a.severity === 'critical' &&
        a.state === 'new' &&
        a.detected_at.startsWith(today),
    ).length,
    enRevision: alertas.value.filter((a) => a.state === 'in_review').length,
    resueltasMes: alertas.value.filter((a) => a.state === 'resolved').length,
    descartadasMes: alertas.value.filter((a) => a.state === 'dismissed').length,
  };
});

// ─── Drawer ──────────────────────────────────────────────────────────
const drawerOpen = ref(false);
const drawerAlerta = ref<Alerta | null>(null);

function openDrawer(a: Alerta): void {
  drawerAlerta.value = a;
  drawerOpen.value = true;
}

function closeDrawer(): void {
  drawerOpen.value = false;
  drawerAlerta.value = null;
}

function statusVariant(state: AlertaState): BadgeVariants['variant'] {
  if (state === 'resolved') return 'success';
  if (state === 'dismissed') return 'neutral';
  if (state === 'in_review') return 'info';
  if (state === 'new') return 'danger';
  return 'neutral';
}

const STATE_LABELS: Record<string, string> = {
  new: 'Nueva',
  in_review: 'En revisión',
  resolved: 'Resuelta',
  dismissed: 'Descartada',
};
function stateLabel(state: AlertaState): string {
  return STATE_LABELS[state] ?? state;
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

function severityVariant(severity?: Severity): BadgeVariants['variant'] {
  if (severity === 'critical') return 'danger';
  if (severity === 'high') return 'warning';
  if (severity === 'medium') return 'info';
  return 'neutral';
}

// ─── Comments ────────────────────────────────────────────────────────
function addComment(payload: { body: string; parent_id?: string | null }): void {
  if (!drawerAlerta.value) return;
  const id = `cmt-${drawerAlerta.value.id}-${Date.now()}`;
  drawerAlerta.value.comments.push({
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
  drawerAlerta.value.timeline.push(evt);
}

// ─── Manifest wiring ─────────────────────────────────────────────────
onMounted(() => {
  alertasMod.registerRecordResolver((ref) => {
    if (typeof ref === 'string') {
      return alertas.value.find((a) => a.id === ref) as
        | Record<string, unknown>
        | undefined;
    }
    if (ref && typeof ref === 'object' && typeof ref.id === 'string') {
      return alertas.value.find((a) => a.id === ref.id) as
        | Record<string, unknown>
        | undefined;
    }
    return undefined;
  });
  alertasMod.registerAfterMutation(() => {
    // mock-backed; real apps would invalidate query cache here.
  });
});

function rowActions(a: Alerta): ReturnType<typeof alertasMod.resolveActionsFor> {
  return alertasMod.resolveActionsFor(a as unknown as Record<string, unknown>);
}

function performAction(actionId: string, a: Alerta): void {
  alertasMod.openDialog(actionId, a as unknown as Record<string, unknown>);
}

// ─── Kanban axis (Tablero) ───────────────────────────────────────────
const ALERTAS_KANBAN_STATES: KanbanState[] = [
  { id: 'new', label: 'Nueva', column_label: 'Nuevas', order: 1 },
  { id: 'in_review', label: 'En revisión', column_label: 'En revisión', order: 2 },
  { id: 'resolved', label: 'Resuelta', column_label: 'Resueltas', order: 3, terminal: true },
  { id: 'dismissed', label: 'Descartada', column_label: 'Descartadas', order: 4, terminal: true },
];

const ALERTAS_KANBAN_AXIS: KanbanAxis = {
  axis_id: 'alertas.lifecycle',
  label: 'Estado',
  description: 'Lifecycle de la alerta',
  state_field: 'state',
  states: ALERTAS_KANBAN_STATES,
  transitions: [
    { from: 'new', to: 'in_review', mode: 'free' },
    { from: 'new', to: 'resolved', mode: 'modal' },
    { from: 'new', to: 'dismissed', mode: 'modal' },
    { from: 'in_review', to: 'resolved', mode: 'modal' },
    { from: 'in_review', to: 'dismissed', mode: 'modal' },
  ],
};

function handleKanbanTransition(payload: {
  recordId: string;
  fromState: string;
  toState: string;
  mode: string;
}): void {
  const a = alertas.value.find((row) => row.id === payload.recordId);
  if (!a) return;
  if (payload.mode === 'modal') {
    if (payload.toState === 'resolved') {
      alertasMod.openDialog(
        'alertas.marcar_resolved',
        a as unknown as Record<string, unknown>,
      );
    } else if (payload.toState === 'dismissed') {
      alertasMod.openDialog(
        'alertas.marcar_dismissed',
        a as unknown as Record<string, unknown>,
      );
    }
    return;
  }
  a.state = payload.toState as AlertaState;
  a.timeline.push({
    id: `evt-${a.id}-${Date.now()}`,
    at: new Date().toISOString(),
    actor_id: CURRENT_USER.id,
    actor_name: CURRENT_USER.name,
    kind: 'state_change',
    label: `Estado: ${stateLabel(payload.toState)}`,
  });
}

// ─── Filter options ──────────────────────────────────────────────────
const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];
const STATE_FILTER_OPTIONS: AlertaState[] = ['new', 'in_review', 'resolved', 'dismissed'];
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="alertas-page">
    <!-- L1 -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Alertas</h1>
        <p class="mt-1 text-xs text-t-3">
          Eventos detectados por el sistema que requieren atención humana.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <ViewToggle v-model="view" :views="['list', 'cards', 'kanban']" />
      </div>
    </header>

    <!-- L2 -->
    <section
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      data-testid="alertas-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Críticas hoy</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-danger">
          {{ kpis.criticasHoy }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">requieren acción inmediata</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">En revisión</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-info">
          {{ kpis.enRevision }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">en análisis</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Resueltas mes</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
          {{ kpis.resueltasMes }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">cerradas con justificación</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Descartadas mes</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-2">
          {{ kpis.descartadasMes }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">falsos positivos</div>
      </div>
    </section>

    <!-- L3 header -->
    <div class="flex flex-wrap items-center gap-2" data-testid="alertas-section-header">
      <span class="text-sm font-bold text-t-2">Alertas</span>
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
        <option v-for="t in ACTIVE_TYPES" :key="t" :value="t">{{ t }}</option>
      </select>
      <select
        v-model="filterSeverity"
        class="rounded-md border border-b-2 bg-card px-3 py-2 text-xs text-t-2"
        aria-label="Filtrar por severidad"
        data-testid="filter-severity"
      >
        <option value="">Severidad · Todas</option>
        <option v-for="sv in SEVERITIES" :key="sv" :value="sv">{{ SEVERITY_LABELS[sv] }}</option>
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

    <!-- L3 body -->
    <section data-testid="alertas-body">
      <EmptyState
        v-if="filteredAlertas.length === 0"
        title="No hay alertas en este momento"
        description="Cuando el sistema detecte eventos aparecerán aquí."
      />

      <!-- LIST view -->
      <div
        v-else-if="view === 'list'"
        class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
        data-testid="alertas-list"
      >
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-2">
              <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Título</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Severidad</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Detectada</th>
              <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="a in filteredAlertas"
              :key="a.id"
              class="cursor-pointer border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              :data-testid="`alerta-row-${a.id}`"
              @click="openDrawer(a)"
            >
              <td class="px-[18px] py-2.5">
                <span class="font-mono text-xs text-t-3">{{ a.id }}</span>
              </td>
              <td class="px-3.5 py-2.5 text-[13px] font-semibold text-t-2">{{ a.title }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ a.type }}</td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="severityVariant(a.severity)">
                  {{ a.severity ? SEVERITY_LABELS[a.severity] : '—' }}
                </Badge>
              </td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="statusVariant(a.state)">{{ stateLabel(a.state) }}</Badge>
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ a.detected_at.slice(0, 16).replace('T', ' ') }}</td>
              <td class="px-3.5 py-2.5 text-center" @click.stop>
                <div class="flex items-center justify-center">
                  <ManifestActionsMenu
                    :manifest-key="ALERTAS_MANIFEST_KEY"
                    :record="a as unknown as Record<string, unknown>"
                    variant="table"
                    :data-testid="`alerta-row-${a.id}-actions`"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- CARDS view -->
      <CardsGrid v-else-if="view === 'cards'" data-testid="alertas-cards">
        <CardItem
          v-for="a in filteredAlertas"
          :key="a.id"
          :record="a as unknown as Record<string, unknown>"
          :severity="a.severity"
          :data-testid="`alerta-card-${a.id}`"
          @click="openDrawer(a)"
        >
          <template #header>
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <span class="font-mono text-[11px] text-t-4">{{ a.id }}</span>
              <span class="truncate text-sm font-semibold text-t-1">{{ a.title }}</span>
            </div>
            <Badge :variant="statusVariant(a.state)">{{ stateLabel(a.state) }}</Badge>
            <span @click.stop>
              <ManifestActionsMenu
                :manifest-key="ALERTAS_MANIFEST_KEY"
                :record="a as unknown as Record<string, unknown>"
                variant="card"
              />
            </span>
          </template>
          <template #body>
            <p class="line-clamp-3 text-xs text-t-3">{{ a.summary || '—' }}</p>
          </template>
          <template #footer>
            <span>{{ a.detected_at.slice(0, 10) }}</span>
            <Badge :variant="severityVariant(a.severity)">
              {{ a.severity ? SEVERITY_LABELS[a.severity] : '—' }}
            </Badge>
          </template>
        </CardItem>
      </CardsGrid>

      <!-- KANBAN view -->
      <div v-else class="min-h-[480px]" data-testid="alertas-kanban-wrapper">
        <KanbanBoard
          :axis="ALERTAS_KANBAN_AXIS"
          :records="filteredAlertas as unknown as Record<string, unknown>[] as never"
          title="Alertas"
          @transition="handleKanbanTransition"
        >
          <template #card="{ record }">
            <CardItem
              :record="record"
              :severity="(record as Alerta).severity"
              @click="openDrawer(record as unknown as Alerta)"
            >
              <template #header>
                <div class="flex min-w-0 flex-1 items-center gap-2">
                  <span class="font-mono text-[11px] text-t-4">{{ (record as Alerta).id }}</span>
                  <span class="truncate text-sm font-semibold text-t-1">{{ (record as Alerta).title }}</span>
                </div>
                <span @click.stop>
                  <ManifestActionsMenu
                    :manifest-key="ALERTAS_MANIFEST_KEY"
                    :record="record"
                    variant="card"
                  />
                </span>
              </template>
              <template #body>
                <p class="line-clamp-2 text-xs text-t-3">{{ (record as Alerta).summary || '—' }}</p>
              </template>
              <template #footer>
                <span>{{ (record as Alerta).type }}</span>
                <Badge :variant="severityVariant((record as Alerta).severity)">
                  {{ (record as Alerta).severity ? SEVERITY_LABELS[(record as Alerta).severity!] : '—' }}
                </Badge>
              </template>
            </CardItem>
          </template>
        </KanbanBoard>
      </div>
    </section>

    <!-- Drawer detail -->
    <Drawer
      v-if="drawerAlerta"
      :open="drawerOpen"
      :record-id="drawerAlerta.id"
      :title="drawerAlerta.title"
      :subtitle="drawerAlerta.summary"
      :status-badge="{ label: stateLabel(drawerAlerta.state), variant: statusVariant(drawerAlerta.state) }"
      data-testid="alertas-drawer"
      @update:open="(v) => (v ? null : closeDrawer())"
    >
      <!-- Primary actions — top of body, matches prototype layout -->
      <template #primary-actions>
        <Button
          v-for="ra in rowActions(drawerAlerta).filter((r) => r.visible)"
          :key="ra.action.id"
          :variant="ra.action.danger ? 'danger' : 'primary'"
          size="sm"
          :disabled="!ra.enabled"
          :title="ra.reason ?? ''"
          :data-testid="`alerta-drawer-action-${ra.action.id}`"
          @click="performAction(ra.action.id, drawerAlerta)"
        >
          {{ ra.action.label }}
        </Button>
      </template>

      <!-- INFORMACIÓN DE LA ALERTA section -->
      <div class="flex flex-col gap-2.5">
        <h3 class="text-[11px] font-semibold uppercase tracking-wider text-t-3">
          Información de la alerta
        </h3>
        <div
          v-if="drawerAlerta.summary"
          class="rounded-md border border-b-2 bg-card-2 p-3"
        >
          <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Contexto</div>
          <div class="whitespace-pre-wrap text-[13px] text-t-2">{{ drawerAlerta.summary }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2.5 text-sm">
          <div class="rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Tipo</div>
            <div class="text-[13px] font-semibold text-t-2">{{ drawerAlerta.type }}</div>
          </div>
          <div class="rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Severidad</div>
            <Badge :variant="severityVariant(drawerAlerta.severity)">
              {{ drawerAlerta.severity ? SEVERITY_LABELS[drawerAlerta.severity] : '—' }}
            </Badge>
          </div>
          <div class="rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Perfil</div>
            <div class="text-[13px] font-semibold text-t-2">{{ drawerAlerta.profile }}</div>
          </div>
          <div class="rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Origen</div>
            <div class="text-[13px] font-semibold text-t-2">
              {{ drawerAlerta.source_app }} · {{ drawerAlerta.source_module }}
            </div>
          </div>
          <div
            v-if="drawerAlerta.closure_comment"
            class="col-span-2 rounded-md border border-b-2 bg-card-2 p-3"
          >
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Justificación de cierre</div>
            <div class="whitespace-pre-wrap text-[13px] text-t-2">{{ drawerAlerta.closure_comment }}</div>
          </div>
        </div>
      </div>

      <template #timeline>
        <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-t-3">Timeline</h3>
        <Timeline :events="drawerAlerta.timeline" />
      </template>
      <template #comments>
        <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-t-3">Comentarios</h3>
        <CommentsThread
          :comments="drawerAlerta.comments"
          :current-user-id="CURRENT_USER.id"
          @add="addComment"
        />
      </template>
    </Drawer>
  </div>
</template>
