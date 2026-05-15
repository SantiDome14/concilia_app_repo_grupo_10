<script setup lang="ts">
defineProps<{
  columns: string[];
  rows: string[][];
}>();
</script>

<template>
  <div
    class="my-4 overflow-x-auto"
    :style="{
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
    }"
  >
    <table class="w-full text-sm">
      <thead>
        <tr :style="{ background: 'var(--bg-elevated)' }">
          <th
            v-for="col in columns"
            :key="col"
            class="px-4 py-2 text-left text-[11px] font-semibold tracking-wider uppercase"
            :style="{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }"
          >
            {{ col }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, ridx) in rows"
          :key="ridx"
          :style="{
            borderTop: ridx === 0 ? 'none' : '1px solid var(--border-subtle)',
          }"
        >
          <td
            v-for="(cell, cidx) in row"
            :key="cidx"
            class="px-4 py-2 align-top"
            :style="{ color: cidx === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }"
          >
            <code
              v-if="cidx === 0"
              class="font-mono text-[13px]"
              :style="{
                background: 'var(--accent-violet-soft)',
                color: 'var(--accent-violet)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
              }"
            >
              {{ cell }}
            </code>
            <template v-else>{{ cell }}</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
