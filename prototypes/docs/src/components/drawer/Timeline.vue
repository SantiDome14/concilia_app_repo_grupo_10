<script setup lang="ts">
import { computed } from 'vue';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { groupByDay } from '@/lib/drawer/groupByDay';
import type { TimelineEvent } from '@/types/drawer';

// ════════════════════════════════════════════════════════════════════
// <Timeline> — chronological event list inside the Drawer
// ────────────────────────────────────────────────────────────────────
// Renders the record's `timeline[]` as a vertical timeline grouped by
// calendar day. Within each day group, events are sorted DESC (most
// recent on top) and rendered as a row with:
//   - A small left dot (color varies by `event.kind`).
//   - A connector line that visually links rows in the same group.
//   - A content block: relative timestamp (with absolute on hover via
//     `title`), actor name, event label.
//
// Empty state: "Sin eventos en el timeline".
// ════════════════════════════════════════════════════════════════════

interface Props {
  events: TimelineEvent[];
  /** Override `now` for deterministic rendering in tests. */
  now?: Date;
}

const props = withDefaults(defineProps<Props>(), {
  now: () => new Date(),
});

// Sort DESC then group; keep within-day order as inserted (already DESC).
const sortedDesc = computed(() =>
  [...props.events].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)),
);

const groups = computed(() => groupByDay(sortedDesc.value, props.now));

const hasEvents = computed(() => sortedDesc.value.length > 0);

// Dot color per event kind. Falls back to neutral for unknown kinds.
// The extended kinds (`assigned`, `taken`, `released`, `action_invoked`)
// land here from the Inbox Solicitud lifecycle per `core-modulo-genericos`
// Requirement: Solicitud assignee is distinct from owner.
function dotClass(kind: TimelineEvent['kind']): string {
  switch (kind) {
    case 'state_change':
    case 'taken':
    case 'released':
      return 'bg-brand';
    case 'field_update':
    case 'assigned':
      return 'bg-info';
    case 'comment_added':
      return 'bg-t-3';
    case 'action_invoked':
      return 'bg-success';
    case 'system':
      return 'bg-warning';
    default:
      return 'bg-t-4';
  }
}

function relativeTime(at: string): string {
  const date = safeParse(at);
  if (!date) return at;
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

function absoluteTime(at: string): string {
  const date = safeParse(at);
  if (!date) return at;
  return format(date, "dd/MM/yyyy HH:mm", { locale: es });
}

function safeParse(at: string): Date | null {
  try {
    const d = parseISO(at);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
</script>

<template>
  <div data-testid="timeline">
    <div
      v-if="!hasEvents"
      class="rounded-md border border-b-2 bg-card-2 px-4 py-6 text-center text-sm text-t-3"
      data-testid="timeline-empty"
    >
      Sin eventos en el timeline
    </div>
    <div v-else class="flex flex-col gap-5">
      <div
        v-for="group in groups"
        :key="group.day"
        class="flex flex-col gap-3"
        data-testid="timeline-group"
      >
        <h4
          class="text-[11px] font-semibold uppercase tracking-wide text-t-4"
          data-testid="timeline-group-label"
        >
          {{ group.label }}
        </h4>
        <ol class="relative ml-1.5 flex flex-col gap-3 border-l border-b-2 pl-5">
          <li
            v-for="event in group.events"
            :key="event.id"
            class="relative"
            data-testid="timeline-event"
            :data-kind="event.kind"
          >
            <span
              :class="
                cn(
                  'absolute -left-[26px] top-1.5 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-card',
                  dotClass(event.kind),
                )
              "
              data-testid="timeline-dot"
            />
            <div class="flex flex-col gap-0.5">
              <span
                class="text-[11px] uppercase tracking-wide text-t-4"
                :title="absoluteTime(event.at)"
                data-testid="timeline-relative"
              >
                {{ relativeTime(event.at) }}
              </span>
              <p class="text-sm text-t-1">
                <span class="font-semibold text-t-2" data-testid="timeline-actor">
                  {{ event.actor_name }}
                </span>
                <span class="text-t-3"> · </span>
                <span data-testid="timeline-label">{{ event.label }}</span>
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>
