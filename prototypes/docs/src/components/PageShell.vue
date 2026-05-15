<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="flex w-full">
    <!-- Center column -->
    <section
      class="flex w-full min-w-0 flex-col"
      :style="{ maxWidth: 'calc(var(--layout-content-max) + 48px * 2)' }"
    >
      <header
        class="sticky z-20 flex items-baseline justify-between gap-4 px-12 py-4"
        :style="{
          top: 'var(--layout-topbar-h)',
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--border-subtle)',
        }"
      >
        <span
          class="font-display text-sm font-semibold"
          :style="{ color: 'var(--text-primary)' }"
        >
          {{ title }}
        </span>
        <span
          v-if="subtitle"
          class="text-xs"
          :style="{ color: 'var(--text-muted)' }"
        >
          {{ subtitle }}
        </span>
      </header>

      <div class="prose-doc px-12 py-8" :style="{ maxWidth: 'var(--layout-content-max)' }">
        <slot />
      </div>
    </section>

    <!-- Right panel -->
    <aside
      class="hidden shrink-0 border-l xl:flex xl:flex-col"
      :style="{
        width: 'var(--layout-rightpanel-w)',
        borderColor: 'var(--border-subtle)',
        position: 'sticky',
        top: 'var(--layout-topbar-h)',
        height: 'calc(100vh - var(--layout-topbar-h))',
        overflowY: 'auto',
      }"
    >
      <slot name="rightpanel">
        <div
          class="flex h-full items-center justify-center px-8 text-center text-sm"
          :style="{ color: 'var(--text-muted)' }"
        >
          No hay código de ejemplo para esta sección
        </div>
      </slot>
    </aside>
  </div>
</template>
