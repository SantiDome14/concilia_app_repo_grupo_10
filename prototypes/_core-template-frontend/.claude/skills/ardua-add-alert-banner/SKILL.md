---
name: ardua-add-alert-banner
description: Add a persistent alert banner to surface system-level state messages (connection lost, read-only mode, scheduled maintenance, unsaved changes, expiring auth token) in an Ardua core frontend. Use when the user wants a persistent in-page notice that stays until dismissed or until the underlying condition is resolved (e.g. "agregá un banner de modo solo lectura", "aviso persistente cuando se pierde la conexión", "banner de mantenimiento programado", "add a persistent warning for X", "necesito un banner arriba para Y"). Enforces the `core-error-handling` alert banners requirement: renders below the Topbar and above the Main content, uses one of four semantic variants (info / warning / danger / success), is dismissible by default (non-dismissible only for system-imposed states), stacks vertically when multiple are active, and is forbidden for single-operation feedback (that is toast territory).
metadata:
  project: ardua
  version: "1.0"
---

# Purpose

Create a persistent in-page alert banner that conveys ongoing system-level state. Unlike toasts (ephemeral, auto-dismiss, for single operations), banners stay visible across route navigations within the session until either the user dismisses them or the underlying condition resolves.

The banner pattern was formalized by the `strengthen-core-ui-patterns` change and is now part of the `core-error-handling` capability. Using toasts for persistent state messages is explicitly forbidden — that is the banner's role.

# When to trigger this skill

Use this skill when the user expresses any of these intents:

- "Agregá un banner de 'X'" / "Mostrar aviso persistente de Y"
- "Necesito un aviso arriba para {modo solo lectura / conexión degradada / mantenimiento}"
- "Add a persistent warning / banner / alert strip"
- "Banner de `{condition}` que no se cierre automáticamente"

Do NOT use this skill for:

- Single-operation feedback (use toasts — see `core-error-handling` toast requirements)
- Form validation errors (render inline under the field — see `core-forms`)
- Modal-scoped warnings (those go inside the modal)
- Temporary "saved!" confirmations (toasts, not banners)

If the user is describing ephemeral feedback ("mostrar que se guardó el registro"), STOP and redirect them to the toast pattern. Do NOT build a banner for that.

# Prerequisites

Before starting, the agent MUST:

1. Read `CLAUDE.md` at the repo root.
2. Read the canonical capability spec:
   ```bash
   openspec show core-error-handling
   ```
   Focus on `### Requirement: Alert banners MUST surface persistent system-level messages` — all 7 scenarios.
3. Inspect `src/components/layout/AppShell.vue` — the banner will render between the Topbar and the Main content area, so the layout shell needs a slot for it.
4. If a shared `AlertBanner.vue` component does not yet exist in `src/components/feedback/`, this skill will create it (first invocation). If it exists, reuse it.

# Steps

## Step 1 — Gather the banner specification

Ask the user via AskUserQuestion:

1. **Banner ID** (kebab-case, stable for the lifetime of the condition; used for dismissal tracking). E.g. `"read-only-mode"`, `"connection-degraded"`, `"maintenance-2026-04-23"`.
2. **Variant** — one of:
   - `info` (blue) — non-blocking informational (scheduled maintenance announcement)
   - `warning` (amber) — attention-required, non-blocking (connection degraded, approaching quota)
   - `danger` (red) — blocking or critical (system in read-only mode, auth token expiring soon)
   - `success` (green) — rare; persistent confirmation of a background operation
3. **Title** (Spanish, bold, concise, max ~6 words). E.g. `"Modo solo lectura"`, `"Conexión degradada"`, `"Mantenimiento programado"`.
4. **Description** (Spanish, one line — wrap if needed, but prefer brevity). E.g. `"No podés editar registros hasta las 22:00."`, `"La sincronización con el backend está interrumpida. Los cambios se guardan localmente."`.
5. **Dismissible** (boolean). Default `true`. Use `false` ONLY when the banner represents a system-imposed ongoing state the user cannot resolve:
   - Read-only mode during maintenance → `false`
   - Connection degraded (will auto-heal) → `true` (user can dismiss acknowledgment)
   - "You have 3 unsaved changes" → `true` (user can dismiss; reappears if condition re-occurs)
6. **Optional action button** — label + handler. E.g. `"Reconectar"` + `reconnect()`, `"Ver detalles"` + `openDetails()`. The action button uses the banner's color variant as its primary color.
7. **Trigger condition** — what drives the banner's visibility? Examples:
   - A ref/store value (`isReadOnly.value === true`)
   - A query result (`connectionStatus.value === 'degraded'`)
   - A scheduled time window (`now >= maintenanceStart && now < maintenanceEnd`)
   - Manually opened/closed by a function call

## Step 2 — Validate against the contract

Stop and report if:

- The banner is describing ephemeral feedback ("operation succeeded", "record saved") → that is a toast, not a banner. Redirect to the toast pattern.
- The banner's trigger condition will fire repeatedly on every page navigation (the dismissal is per-session; if the trigger keeps firing, the banner reappears repeatedly — annoying). Suggest scoping the trigger to the originating event.
- The variant chosen mismatches the semantic: a `success` banner for a broken connection is wrong. Flag and suggest.
- The banner is non-dismissible but the description implies a user action could resolve it ("Tu token expira en 5 min — renová tu sesión"). If the user CAN resolve it, the banner should be dismissible OR the action button should handle the resolution.

## Step 3 — If the shared `AlertBanner.vue` component does not exist, create it

Location: `src/components/feedback/AlertBanner.vue`. Check if it exists first.

If it does not exist, create it:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { X, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-vue-next';
import { cn } from '@/lib/cn';

type Variant = 'info' | 'warning' | 'danger' | 'success';

interface Props {
  variant: Variant;
  title: string;
  description?: string;
  dismissible?: boolean;
  actionLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  dismissible: true,
  actionLabel: undefined,
});

const emit = defineEmits<{
  dismiss: [];
  action: [];
}>();

const variantStyles = computed(() => {
  switch (props.variant) {
    case 'info':
      return { container: 'border-info/40 bg-info-bg text-info', title: 'text-info', iconComp: Info };
    case 'warning':
      return { container: 'border-warning/40 bg-warning-bg text-warning', title: 'text-warning', iconComp: AlertTriangle };
    case 'danger':
      return { container: 'border-danger/40 bg-danger-bg text-danger', title: 'text-danger', iconComp: AlertCircle };
    case 'success':
      return { container: 'border-success/40 bg-success-bg text-success', title: 'text-success', iconComp: CheckCircle2 };
  }
});
</script>

<template>
  <div :class="cn('flex items-start gap-3 border-y px-5 py-3', variantStyles.container)">
    <component :is="variantStyles.iconComp" class="mt-0.5 h-4 w-4 flex-shrink-0" />
    <div class="min-w-0 flex-1">
      <div :class="cn('text-[13px] font-semibold', variantStyles.title)">{{ title }}</div>
      <div v-if="description" class="mt-0.5 text-[12px] leading-relaxed text-t-2">
        {{ description }}
      </div>
    </div>
    <button
      v-if="actionLabel"
      type="button"
      :class="cn('rounded-md px-2.5 py-1 text-[12px] font-semibold', variantStyles.title, 'hover:bg-black/10')"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
    <button
      v-if="dismissible"
      type="button"
      class="rounded-md p-1 text-t-3 transition-colors hover:bg-black/10 hover:text-t-1"
      aria-label="Cerrar aviso"
      @click="emit('dismiss')"
    >
      <X class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
```

Verify the design tokens `--info-bg`, `--warning-bg`, `--danger-bg`, `--success-bg` exist in `src/styles/globals.css`. If any is missing, flag as a follow-up.

## Step 4 — Wire banner state management

The banners are app-level state, not page-level. Use a Pinia store.

### 4a. Create or extend the banners store

Location: `src/stores/banners.ts`. Check if it exists.

If not, create:

```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type BannerVariant = 'info' | 'warning' | 'danger' | 'success';

export interface Banner {
  id: string;
  variant: BannerVariant;
  title: string;
  description?: string;
  dismissible: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export const useBannersStore = defineStore('banners', () => {
  const active = ref<Banner[]>([]);
  const dismissedIds = ref<Set<string>>(new Set());   // session-only

  const visible = computed(() =>
    active.value.filter((b) => !dismissedIds.value.has(b.id)),
  );

  function show(banner: Banner): void {
    if (active.value.some((b) => b.id === banner.id)) return;
    active.value.push(banner);
  }

  function dismiss(id: string): void {
    dismissedIds.value.add(id);
  }

  function hide(id: string): void {
    active.value = active.value.filter((b) => b.id !== id);
    dismissedIds.value.delete(id);
  }

  function reset(): void {
    active.value = [];
    dismissedIds.value.clear();
  }

  return { active, visible, show, dismiss, hide, reset };
});
```

Semantics:
- `show(banner)` — add a banner (idempotent by ID)
- `dismiss(id)` — user-initiated dismissal; banner hides for the rest of the session
- `hide(id)` — system-initiated removal (e.g. the condition is resolved); banner goes away AND its dismissal is cleared so it can re-trigger later

### 4b. Mount the banner area in `AppShell.vue`

Edit `src/components/layout/AppShell.vue` (or wherever the Topbar + Main structure lives). Insert between the Topbar and the Main content:

```vue
<script setup lang="ts">
import { useBannersStore } from '@/stores/banners';
import AlertBanner from '@/components/feedback/AlertBanner.vue';

const banners = useBannersStore();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <Sidebar />
    <Topbar />

    <!-- Alert banners — stacked vertically, most recent on top -->
    <div class="sticky top-0 z-40 flex flex-col">
      <AlertBanner
        v-for="banner in banners.visible"
        :key="banner.id"
        :variant="banner.variant"
        :title="banner.title"
        :description="banner.description"
        :dismissible="banner.dismissible"
        :action-label="banner.actionLabel"
        @dismiss="banners.dismiss(banner.id)"
        @action="banner.onAction?.()"
      />
    </div>

    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
```

Adjust based on actual `AppShell.vue` structure. The key is: banners render between Topbar and Main, full-width.

## Step 5 — Trigger the banner from the originating context

The trigger is usually:

- **Global initialization** (e.g. `main.ts` or an app-level `onMounted` hook) for banners that depend on global state (connection status, auth token expiry).
- **Page-specific** (e.g. inside a page's `<script setup>`) for banners tied to a specific route.
- **Store action** (inside another Pinia store) for banners that reflect domain state.

### 5a. Simple unconditional banner (e.g. read-only mode on)

```ts
import { onMounted, onUnmounted } from 'vue';
import { useBannersStore } from '@/stores/banners';

const banners = useBannersStore();

onMounted(() => {
  banners.show({
    id: 'read-only-mode',
    variant: 'danger',
    title: 'Modo solo lectura',
    description: 'No podés editar registros hasta las 22:00.',
    dismissible: false,
  });
});

onUnmounted(() => {
  banners.hide('read-only-mode');
});
```

### 5b. Banner tied to a reactive condition (e.g. connection status)

```ts
import { watch } from 'vue';
import { useBannersStore } from '@/stores/banners';
import { useConnectionStatus } from '@/composables/useConnectionStatus';

const banners = useBannersStore();
const { status } = useConnectionStatus();

watch(status, (current) => {
  if (current === 'degraded') {
    banners.show({
      id: 'connection-degraded',
      variant: 'warning',
      title: 'Conexión degradada',
      description: 'La sincronización está interrumpida. Los cambios se guardan localmente.',
      dismissible: true,
      actionLabel: 'Reintentar',
      onAction: () => reconnect(),
    });
  } else if (current === 'ok') {
    banners.hide('connection-degraded');
  }
});
```

### 5c. Banner for a scheduled time window

```ts
import { onMounted } from 'vue';
import { useBannersStore } from '@/stores/banners';

const banners = useBannersStore();

onMounted(() => {
  const now = new Date();
  const maintenanceStart = new Date('2026-04-23T22:00:00-03:00');
  const maintenanceEnd = new Date('2026-04-23T23:30:00-03:00');

  if (now >= maintenanceStart && now < maintenanceEnd) {
    banners.show({
      id: 'maintenance-2026-04-23',
      variant: 'info',
      title: 'Mantenimiento programado',
      description: 'El sistema está en ventana de mantenimiento hasta las 23:30.',
      dismissible: true,
    });
  }
});
```

## Step 6 — Run quality gates

```bash
npm run spec:check
npm run type-check
npm run lint
npm run test:run
```

If type-check fails:
- Typically: variant passed to `AlertBanner` does not match the `Variant` union type. Double-check the string literal.
- `useBannersStore` not auto-imported. Add `import { useBannersStore } from '@/stores/banners';` where needed.

## Step 7 — Hand off

Do NOT commit. Report:

- Summary: "Alert banner `{id}` wired with variant `{variant}`. Triggered from: {location}. Dismissible: {yes | no}."
- Files touched: possibly 3-4 files:
  - `src/components/feedback/AlertBanner.vue` (created if first invocation)
  - `src/stores/banners.ts` (created if first invocation)
  - `src/components/layout/AppShell.vue` (modified to mount banners if first invocation)
  - The caller file where `banners.show(...)` is invoked
- Quality gates results (all ✓)

# Files you'll touch

| File | Change |
|---|---|
| `src/components/feedback/AlertBanner.vue` | Create (first time only) — shared variant-driven banner component |
| `src/stores/banners.ts` | Create (first time only) — Pinia store with `active`, `visible`, `show`, `dismiss`, `hide` |
| `src/components/layout/AppShell.vue` | Modify (first time only) — mount `<AlertBanner>` list between Topbar and Main |
| `{caller file}` | Invoke `banners.show({...})` in the right lifecycle hook, store action, or watcher |

# Compliance checklist (vs. `core-error-handling` alert banner requirement)

- [ ] Banner renders BELOW the Topbar and ABOVE the Main content, full-width edge-to-edge
- [ ] Variant is one of: `info`, `warning`, `danger`, `success` (no custom variants)
- [ ] Structure: leading variant-specific icon + bold short title + optional one-line description + optional action button + dismiss `×` (when dismissible)
- [ ] Dismissible banners show the `×` button; non-dismissible banners omit it
- [ ] Dismissal is session-scoped (tracked by ID); banner does not re-appear on subsequent route changes within the session
- [ ] Non-dismissible banners persist until the underlying condition is resolved (via `banners.hide(id)` from system)
- [ ] Multiple banners stack vertically; most recently added on top
- [ ] Banner is NOT used for single-operation feedback (create / edit / delete results) — those go to `toast.*`
- [ ] Colors use semantic tokens (`--info`, `--warning`, `--danger`, `--success` and their `-bg` translucent variants) — no hardcoded hex
- [ ] `npm run spec:check`, `npm run type-check`, `npm run lint`, `npm run test:run` all pass

# Related skills

- `ardua-add-api-endpoint` — chain if the banner's action button invokes a backend call (e.g. `"Reintentar"` that refetches)
- `ardua-add-confirm-dialog` — NOT a companion; these are for different concerns (banner = persistent state; dialog = user choice on destructive op)
