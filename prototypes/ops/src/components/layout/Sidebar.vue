<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import {
  LayoutDashboard,
  Inbox as InboxIcon,
  BellRing,
  FileText,
  List,
  LayoutGrid,
  Database,
  ChevronLeft,
  ChevronDown,
  Settings,
  HelpCircle,
  LogOut,
  FlaskConical,
  BarChart3,
  Columns,
  ClipboardList,
  Users,
} from 'lucide-vue-next';
import { ROUTE_PATHS, ROUTE_NAMES } from '@/config/routes';
import { useAuth } from '@/composables/useAuth';
import { useSettingsDialog } from '@/composables/useSettingsDialog';
import { cn } from '@/lib/cn';

// Sidebar structure (see `core-navigation` + `core-modulo-genericos`):
//   Brand -> Generics (Dashboard / Inbox / Alertas / Reportes)
//          -> [Bloques -> Modulos] -> spacer -> Account
//
// The four "generics" entries live at the TOP of the sidebar, NOT
// wrapped in any <SidebarBlock>. The order is mandatory:
//   Dashboard → Inbox → Alertas → Reportes
//
// Collapsible: 200px (icons + labels) <-> 60px (icons only).
// `<body class="sb-collapsed">` is toggled for cases where outside
// elements (e.g. account menu) need to reposition.

interface NavItem {
  to: string;
  name: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavBlock {
  label: string;
  items: NavItem[];
}

// Cross-cutting standard modules (per `core-modulo-genericos`).
// MUST live at the top of the sidebar, NOT inside a <SidebarBlock>,
// in this exact order: Dashboard → Inbox → Alertas → Reportes.
const generics: NavItem[] = [
  { to: ROUTE_PATHS.DASHBOARD, name: ROUTE_NAMES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTE_PATHS.INBOX, name: ROUTE_NAMES.INBOX, label: 'Inbox', icon: InboxIcon },
  { to: ROUTE_PATHS.ALERTAS, name: ROUTE_NAMES.ALERTAS, label: 'Alertas', icon: BellRing },
  { to: ROUTE_PATHS.REPORTES, name: ROUTE_NAMES.REPORTES, label: 'Reportes', icon: FileText },
];

const blocks: NavBlock[] = [
  {
    label: 'Bloque 1',
    items: [
      { to: ROUTE_PATHS.MODULO_A, name: ROUTE_NAMES.MODULO_A, label: 'Módulo A', icon: List },
    ],
  },
  {
    label: 'Bloque 2',
    items: [
      { to: ROUTE_PATHS.MODULO_B, name: ROUTE_NAMES.MODULO_B, label: 'Módulo B', icon: LayoutGrid },
      { to: ROUTE_PATHS.MODULO_C, name: ROUTE_NAMES.MODULO_C, label: 'Módulo C', icon: Database },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      {
        to: ROUTE_PATHS.CLIENTS,
        name: ROUTE_NAMES.CLIENTS,
        label: 'Clientes',
        icon: Users,
      },
    ],
  },
  {
    label: 'Configuración',
    items: [
      {
        to: ROUTE_PATHS.INSTRUCTIONS,
        name: ROUTE_NAMES.INSTRUCTIONS,
        label: 'Instrucciones',
        icon: ClipboardList,
      },
    ],
  },
];

// Dev-only block: component playground. Gated by import.meta.env.DEV
// so production builds (and apps cloned from this template) do NOT
// inflate their sidebar nor their bundle with showcase pages.
// The routes are always registered (they're code-split anyway), but
// the entries are only rendered in dev.
const devBlocks: NavBlock[] = import.meta.env.DEV
  ? [
      {
        label: 'Componentes (dev)',
        items: [
          {
            to: ROUTE_PATHS.PLAYGROUND_FORMS,
            name: ROUTE_NAMES.PLAYGROUND_FORMS,
            label: 'Forms',
            icon: FlaskConical,
          },
          {
            to: ROUTE_PATHS.PLAYGROUND_CHARTS,
            name: ROUTE_NAMES.PLAYGROUND_CHARTS,
            label: 'Charts',
            icon: BarChart3,
          },
          {
            to: ROUTE_PATHS.PLAYGROUND_LAYOUT,
            name: ROUTE_NAMES.PLAYGROUND_LAYOUT,
            label: 'Layout',
            icon: Columns,
          },
        ],
      },
    ]
  : [];

const collapsed = ref(false);
const accountOpen = ref(false);
const route = useRoute();
const { user, logout } = useAuth();

const initials = computed(() => {
  const name = user.value?.name ?? user.value?.email ?? 'User';
  return name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
});

const displayName = computed(() => user.value?.name ?? 'User');
const displayEmail = computed(() => user.value?.email ?? '');

function toggleCollapsed(): void {
  collapsed.value = !collapsed.value;
  document.body.classList.toggle('sb-collapsed', collapsed.value);
  accountOpen.value = false;
}

function toggleAccount(e: MouseEvent): void {
  e.stopPropagation();
  accountOpen.value = !accountOpen.value;
}

function closeAccount(): void {
  accountOpen.value = false;
}

async function handleLogout(): Promise<void> {
  closeAccount();
  await logout();
}

// Settings opens the shared dialog mounted in App.vue. Each derived app
// MAY surface app-specific tabs by extending `<SettingsDialog>`; this
// handler stays generic.
const settings = useSettingsDialog();
function handleSettings(): void {
  closeAccount();
  settings.open();
}

function handleHelp(): void {
  closeAccount();
  // eslint-disable-next-line no-console
  console.log('[account] Get Help — implementar en cada app');
}
</script>

<template>
  <nav
    :class="
      cn(
        'fixed left-0 top-0 bottom-0 z-50 flex min-h-screen flex-col gap-0.5 border-r border-b-1 bg-surf px-2.5 py-4 transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-[200px]',
      )
    "
  >
    <!-- Toggle -->
    <button
      type="button"
      :class="
        cn(
          'absolute -right-2.5 top-[18px] z-[51] flex h-5 w-5 items-center justify-center rounded-full border border-b-3 bg-card-2 text-t-3 transition-colors hover:border-b-3 hover:bg-card hover:text-t-1',
        )
      "
      aria-label="Toggle sidebar"
      @click="toggleCollapsed"
    >
      <ChevronLeft
        :class="cn('h-2.5 w-2.5 transition-transform', collapsed && 'rotate-180')"
      />
    </button>

    <!-- Brand -->
    <div
      :class="
        cn(
          'mb-1.5 flex items-center gap-2.5 border-b border-b-1 px-2.5 pb-[18px] pt-1.5',
          collapsed && 'justify-center gap-0 px-0',
        )
      "
    >
      <div
        class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-brand text-xs font-extrabold text-white"
      >
        A
      </div>
      <div v-if="!collapsed" class="flex flex-col gap-px">
        <span class="text-[13px] font-bold tracking-tight text-t-1">APP · Ardua</span>
        <span class="text-[10px] font-medium text-t-4">Tagline</span>
      </div>
    </div>

    <!-- Generics (Dashboard / Inbox / Alertas / Reportes) — flat list -->
    <RouterLink
      v-for="item in generics"
      :key="item.to"
      :to="item.to"
      :title="item.label"
      :data-testid="`sidebar-generic-${item.name}`"
      :class="
        cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-t-3 transition-colors hover:bg-card hover:text-t-2',
          route.name === item.name && 'bg-brand-bg font-semibold text-brand',
          collapsed && 'justify-center gap-0 px-0 py-2.5',
        )
      "
    >
      <component :is="item.icon" class="h-[15px] w-[15px] flex-shrink-0" />
      <span v-if="!collapsed">{{ item.label }}</span>
    </RouterLink>

    <!-- Blocks -->
    <template v-for="block in [...blocks, ...devBlocks]" :key="block.label">
      <div
        v-if="!collapsed"
        class="px-2.5 pb-[5px] pt-3 text-[9px] font-extrabold uppercase tracking-wider text-t-4"
      >
        {{ block.label }}
      </div>
      <RouterLink
        v-for="item in block.items"
        :key="item.to"
        :to="item.to"
        :title="item.label"
        :class="
          cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-t-3 transition-colors hover:bg-card hover:text-t-2',
            route.name === item.name && 'bg-brand-bg font-semibold text-brand',
            collapsed && 'justify-center gap-0 px-0 py-2.5',
          )
        "
      >
        <component :is="item.icon" class="h-[15px] w-[15px] flex-shrink-0" />
        <span v-if="!collapsed">{{ item.label }}</span>
      </RouterLink>
    </template>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Account -->
    <div class="relative mt-1.5 border-t border-b-1 pt-3.5">
      <button
        type="button"
        :class="
          cn(
            'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-card',
            collapsed && 'justify-center gap-0 px-0',
          )
        "
        @click="toggleAccount"
      >
        <div
          class="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-info to-[#A78BFA] text-[10px] font-bold text-white"
        >
          {{ initials }}
        </div>
        <div v-if="!collapsed" class="min-w-0 flex-1 overflow-hidden text-left">
          <div class="truncate text-xs font-semibold text-t-2">{{ displayName }}</div>
          <div class="truncate text-[10px] text-t-4">{{ displayEmail }}</div>
        </div>
        <ChevronDown
          v-if="!collapsed"
          :class="
            cn(
              'h-3 w-3 flex-shrink-0 text-t-4 transition-transform',
              accountOpen && 'rotate-180',
            )
          "
        />
      </button>

      <!-- Account menu -->
      <div
        v-if="accountOpen"
        class="absolute bottom-[66px] left-2.5 z-[200] w-[180px] rounded-lg border border-b-3 bg-card-2 p-1.5 shadow-[0_-4px_24px_rgba(0,0,0,0.6)]"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-t-2 transition-colors hover:bg-white/[0.06] hover:text-t-1"
          @click="handleSettings"
        >
          <Settings class="h-3.5 w-3.5 flex-shrink-0" />
          Settings
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-t-2 transition-colors hover:bg-white/[0.06] hover:text-t-1"
          @click="handleHelp"
        >
          <HelpCircle class="h-3.5 w-3.5 flex-shrink-0" />
          Get Help
        </button>
        <div class="my-1 h-px bg-b-1" />
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-danger transition-colors hover:bg-danger-bg"
          @click="handleLogout"
        >
          <LogOut class="h-3.5 w-3.5 flex-shrink-0" />
          Logout
        </button>
      </div>
    </div>
  </nav>
</template>
