<script setup lang="ts">
import { Search, Sun } from 'lucide-vue-next';
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 flex items-center gap-4 border-b px-6"
    :style="{
      height: 'var(--layout-topbar-h)',
      background: 'var(--bg-surface)',
      borderColor: 'var(--border-subtle)',
    }"
  >
    <!-- Logo cluster -->
    <div class="flex items-center gap-3">
      <div
        class="flex h-8 w-8 items-center justify-center font-display text-lg font-bold"
        :style="{
          background: 'var(--accent-violet)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius-md)',
        }"
      >
        A
      </div>
      <span
        class="font-display text-base font-bold tracking-wide"
        style="color: var(--text-primary)"
      >
        ARDUA
      </span>
      <span class="text-xs" style="color: var(--text-muted)">/ API Documentation</span>
      <span
        class="px-2 py-0.5 font-mono text-[11px] font-medium"
        :style="{
          background: 'var(--accent-lime)',
          color: 'var(--bg-base)',
          borderRadius: 'var(--radius-pill)',
        }"
      >
        v1.0.0
      </span>
    </div>

    <!-- Search (placeholder, search global diferido a v2) -->
    <div class="mx-auto flex max-w-md flex-1 items-center">
      <div
        class="flex w-full items-center gap-2 px-3 py-1.5 text-sm"
        :style="{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-muted)',
        }"
      >
        <Search :size="14" />
        <span class="flex-1">Buscar en la documentación…</span>
        <kbd
          class="font-mono text-[10px]"
          :style="{
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1px 6px',
          }"
        >
          ⌘K
        </kbd>
      </div>
    </div>

    <!-- Right cluster: theme toggle (disabled v1) + status -->
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="flex h-8 w-8 cursor-not-allowed items-center justify-center opacity-40"
        :style="{
          color: 'var(--text-secondary)',
          borderRadius: 'var(--radius-md)',
        }"
        title="Light mode disponible en v2"
        disabled
      >
        <Sun :size="16" />
      </button>

      <div class="flex items-center gap-2 text-xs" style="color: var(--text-secondary)">
        <span
          class="inline-block h-2 w-2"
          :style="{
            background: 'var(--accent-lime)',
            borderRadius: '9999px',
            boxShadow: '0 0 8px var(--accent-lime)',
          }"
        />
        All systems operational
      </div>
    </div>
  </header>
</template>
