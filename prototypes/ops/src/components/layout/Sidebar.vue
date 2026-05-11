<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import {
  LayoutDashboard,
  Inbox as InboxIcon,
  BellRing,
  FileText,
  ChevronLeft,
  ChevronDown,
  Settings,
  HelpCircle,
  LogOut,
  ClipboardList,
  Users,
  Banknote,
  ArrowLeftRight,
  TrendingUp,
  Landmark,
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
  {
    to: ROUTE_PATHS.DASHBOARD,
    name: ROUTE_NAMES.DASHBOARD,
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  { to: ROUTE_PATHS.INBOX, name: ROUTE_NAMES.INBOX, label: 'Inbox', icon: InboxIcon },
  { to: ROUTE_PATHS.ALERTAS, name: ROUTE_NAMES.ALERTAS, label: 'Alertas', icon: BellRing },
  { to: ROUTE_PATHS.REPORTES, name: ROUTE_NAMES.REPORTES, label: 'Reportes', icon: FileText },
];

const blocks: NavBlock[] = [
  {
    label: 'Operaciones',
    items: [
      {
        to: ROUTE_PATHS.MOVIMIENTOS,
        name: ROUTE_NAMES.MOVIMIENTOS,
        label: 'Movimientos',
        icon: ArrowLeftRight,
      },
      {
        to: ROUTE_PATHS.COTIZACIONES,
        name: ROUTE_NAMES.COTIZACIONES,
        label: 'Cotizaciones',
        icon: TrendingUp,
      },
    ],
  },
  {
    label: 'Custodia',
    items: [
      {
        to: ROUTE_PATHS.PSP,
        name: ROUTE_NAMES.PSP,
        label: 'PSP',
        icon: Banknote,
      },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      {
        to: ROUTE_PATHS.CLIENTS,
        name: ROUTE_NAMES.CLIENTS,
        label: 'Clientes',
        icon: Users,
      },
      {
        to: ROUTE_PATHS.INSTRUCTIONS,
        name: ROUTE_NAMES.INSTRUCTIONS,
        label: 'Instrucciones',
        icon: ClipboardList,
      },
      {
        to: ROUTE_PATHS.BANKS_ACCOUNTS,
        name: ROUTE_NAMES.BANKS_ACCOUNTS,
        label: 'Bancos / Cuentas',
        icon: Landmark,
      },
    ],
  },
];

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
  <!--
    z-[600] is intentional: it stacks the Sidebar ABOVE the Dialog/Sheet
    overlay (z-[500]) and content (z-[501]) so navigation stays accessible
    while a modal/drawer is open. Without this, clicking a sidebar entry
    while a modal is open hits the overlay (which closes the modal but
    does NOT propagate to the RouterLink), trapping the operator on the
    page. See `_core-template-frontend/MIGRATION-PLAYBOOK.md` antipattern #15.
  -->
  <nav
    :class="
      cn(
        'bg-surf fixed top-0 bottom-0 left-0 z-[600] flex min-h-screen flex-col gap-0.5 border-r border-b-1 px-2.5 py-4 transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-[200px]',
      )
    "
  >
    <!-- Toggle -->
    <button
      type="button"
      :class="
        cn(
          'bg-card-2 text-t-3 hover:bg-card hover:text-t-1 absolute top-[18px] -right-2.5 z-[601] flex h-5 w-5 items-center justify-center rounded-full border border-b-3 transition-colors hover:border-b-3',
        )
      "
      aria-label="Toggle sidebar"
      @click="toggleCollapsed"
    >
      <ChevronLeft :class="cn('h-2.5 w-2.5 transition-transform', collapsed && 'rotate-180')" />
    </button>

    <!-- Brand -->
    <div
      :class="
        cn(
          'mb-1.5 flex items-center gap-2.5 border-b border-b-1 px-2.5 pt-1.5 pb-[18px]',
          collapsed && 'justify-center gap-0 px-0',
        )
      "
    >
      <div
        class="bg-brand flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-xs font-extrabold text-white"
      >
        O
      </div>
      <div v-if="!collapsed" class="flex flex-col gap-px">
        <span class="text-t-1 text-[13px] font-bold tracking-tight">OPS</span>
        <span class="text-t-4 text-[10px] font-medium">Ardua Financial Core</span>
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
          'text-t-3 hover:bg-card hover:text-t-2 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
          route.name === item.name && 'bg-brand-bg text-brand font-semibold',
          collapsed && 'justify-center gap-0 px-0 py-2.5',
        )
      "
    >
      <component :is="item.icon" class="h-[15px] w-[15px] flex-shrink-0" />
      <span v-if="!collapsed">{{ item.label }}</span>
    </RouterLink>

    <!-- Blocks -->
    <template v-for="block in blocks" :key="block.label">
      <div
        v-if="!collapsed"
        class="text-t-4 px-2.5 pt-3 pb-[5px] text-[9px] font-extrabold tracking-wider uppercase"
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
            'text-t-3 hover:bg-card hover:text-t-2 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
            route.name === item.name && 'bg-brand-bg text-brand font-semibold',
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
            'hover:bg-card flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors',
            collapsed && 'justify-center gap-0 px-0',
          )
        "
        @click="toggleAccount"
      >
        <div
          class="from-info flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br to-[#A78BFA] text-[10px] font-bold text-white"
        >
          {{ initials }}
        </div>
        <div v-if="!collapsed" class="min-w-0 flex-1 overflow-hidden text-left">
          <div class="text-t-2 truncate text-xs font-semibold">{{ displayName }}</div>
          <div class="text-t-4 truncate text-[10px]">{{ displayEmail }}</div>
        </div>
        <ChevronDown
          v-if="!collapsed"
          :class="
            cn('text-t-4 h-3 w-3 flex-shrink-0 transition-transform', accountOpen && 'rotate-180')
          "
        />
      </button>

      <!-- Account menu -->
      <div
        v-if="accountOpen"
        class="bg-card-2 absolute bottom-[66px] left-2.5 z-[200] w-[180px] rounded-lg border border-b-3 p-1.5 shadow-[0_-4px_24px_rgba(0,0,0,0.6)]"
      >
        <button
          type="button"
          class="text-t-2 hover:text-t-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors hover:bg-white/[0.06]"
          @click="handleSettings"
        >
          <Settings class="h-3.5 w-3.5 flex-shrink-0" />
          Settings
        </button>
        <button
          type="button"
          class="text-t-2 hover:text-t-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors hover:bg-white/[0.06]"
          @click="handleHelp"
        >
          <HelpCircle class="h-3.5 w-3.5 flex-shrink-0" />
          Get Help
        </button>
        <div class="bg-b-1 my-1 h-px" />
        <button
          type="button"
          class="text-danger hover:bg-danger-bg flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors"
          @click="handleLogout"
        >
          <LogOut class="h-3.5 w-3.5 flex-shrink-0" />
          Logout
        </button>
      </div>
    </div>
  </nav>
</template>
