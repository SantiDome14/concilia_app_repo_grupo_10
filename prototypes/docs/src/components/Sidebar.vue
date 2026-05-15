<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ChevronDown, Search } from 'lucide-vue-next';
import { sidebar, type SidebarItem } from '@/router/navigation';
import MethodBadge from './MethodBadge.vue';

const route = useRoute();
const query = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const collapsed = ref<Record<string, boolean>>({});

function isCollapsed(key: string): boolean {
  return collapsed.value[key] === true;
}
function toggle(key: string): void {
  collapsed.value[key] = !collapsed.value[key];
}

function matches(item: SidebarItem): boolean {
  if (!query.value.trim()) return true;
  const q = query.value.toLowerCase();
  return item.label.toLowerCase().includes(q);
}

const filteredSections = computed(() =>
  sidebar.map((section) => ({
    ...section,
    items: section.items.filter(matches),
    groups: section.groups?.map((g) => ({
      ...g,
      items: g.items.filter(matches),
    })),
  })),
);

function onGlobalKey(e: KeyboardEvent) {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault();
    searchInput.value?.focus();
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKey));
onUnmounted(() => window.removeEventListener('keydown', onGlobalKey));

function isActive(item: SidebarItem): boolean {
  return route.name === item.routeName;
}
</script>

<template>
  <aside
    class="fixed bottom-0 left-0 flex flex-col overflow-y-auto border-r"
    :style="{
      top: 'var(--layout-topbar-h)',
      width: 'var(--layout-sidebar-w)',
      background: 'var(--bg-surface)',
      borderColor: 'var(--border-subtle)',
    }"
  >
    <!-- Search -->
    <div class="p-4">
      <div
        class="flex items-center gap-2 px-3 py-1.5 text-sm"
        :style="{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
        }"
      >
        <Search :size="14" :style="{ color: 'var(--text-muted)' }" />
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          placeholder="Search endpoints"
          class="w-full bg-transparent outline-none"
          :style="{ color: 'var(--text-primary)' }"
        />
        <kbd
          v-if="!query"
          class="font-mono text-[10px]"
          :style="{
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1px 5px',
          }"
        >
          /
        </kbd>
      </div>
    </div>

    <!-- Sections -->
    <nav class="flex flex-col gap-4 px-3 pb-8">
      <section v-for="section in filteredSections" :key="section.title">
        <button
          type="button"
          class="flex w-full items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
          :style="{ color: 'var(--text-muted)' }"
          @click="toggle(section.title)"
        >
          {{ section.title }}
          <ChevronDown
            :size="12"
            :style="{
              transform: isCollapsed(section.title) ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 120ms ease',
            }"
          />
        </button>

        <div v-show="!isCollapsed(section.title)" class="mt-1 flex flex-col">
          <RouterLink
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors"
            :style="{
              color: isActive(item) ? 'var(--accent-violet)' : 'var(--text-secondary)',
              background: isActive(item) ? 'var(--accent-violet-soft)' : 'transparent',
              borderRadius: 'var(--radius-sm)',
            }"
          >
            {{ item.label }}
          </RouterLink>

          <div v-for="group in section.groups" :key="group.title" class="mt-2">
            <div
              class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider"
              :style="{ color: 'var(--text-muted)' }"
            >
              {{ group.title }}
            </div>
            <RouterLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors"
              :style="{
                color: isActive(item) ? 'var(--accent-violet)' : 'var(--text-secondary)',
                background: isActive(item) ? 'var(--accent-violet-soft)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
              }"
            >
              <MethodBadge v-if="item.method" :method="item.method" size="sm" />
              <span class="font-mono text-xs">{{ item.label }}</span>
            </RouterLink>
          </div>
        </div>
      </section>
    </nav>
  </aside>
</template>

<style scoped>
a:hover {
  background: rgba(255, 255, 255, 0.03) !important;
}
a[aria-current='page'] {
  background: var(--accent-violet-soft) !important;
  color: var(--accent-violet) !important;
}
</style>
