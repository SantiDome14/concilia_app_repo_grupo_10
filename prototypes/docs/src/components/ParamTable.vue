<script setup lang="ts">
type Location = 'PATH' | 'QUERY' | 'HEADER' | 'BODY';

export type Param = {
  name: string;
  type: string;
  location?: Location;
  required?: boolean;
  description: string;
};

defineProps<{
  params: Param[];
  hideLocation?: boolean;
}>();

function locationStyle(loc: Location) {
  const map: Record<Location, string> = {
    PATH: 'var(--accent-violet)',
    QUERY: 'var(--method-post)',
    HEADER: 'var(--method-get)',
    BODY: 'var(--method-put)',
  };
  return map[loc];
}
</script>

<template>
  <div class="my-3 flex flex-col">
    <div
      v-for="(p, idx) in params"
      :key="p.name"
      class="flex flex-col gap-1 py-3 md:flex-row md:gap-6"
      :style="{
        borderTop: idx === 0 ? '1px solid var(--border-subtle)' : 'none',
        borderBottom: '1px solid var(--border-subtle)',
      }"
    >
      <div class="flex shrink-0 flex-wrap items-center gap-2 md:w-2/5">
        <code
          class="font-mono text-[13px]"
          :style="{
            color: 'var(--accent-violet)',
            background: 'var(--accent-violet-soft)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-sm)',
          }"
        >
          {{ p.name }}
        </code>
        <span class="font-mono text-xs" :style="{ color: 'var(--text-muted)' }">{{ p.type }}</span>
        <span
          v-if="!hideLocation && p.location"
          class="font-mono text-[10px] font-semibold tracking-wide uppercase"
          :style="{
            color: locationStyle(p.location),
            padding: '1px 5px',
            border: `1px solid ${locationStyle(p.location)}40`,
            borderRadius: 'var(--radius-sm)',
          }"
        >
          {{ p.location }}
        </span>
        <span
          v-if="p.required"
          class="text-[10px] font-semibold tracking-wide uppercase"
          :style="{
            color: 'var(--method-delete)',
            background: 'rgba(239, 68, 68, 0.10)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-sm)',
          }"
        >
          required
        </span>
      </div>
      <p class="m-0 flex-1 text-sm" :style="{ color: 'var(--text-secondary)' }">
        {{ p.description }}
      </p>
    </div>
  </div>
</template>
