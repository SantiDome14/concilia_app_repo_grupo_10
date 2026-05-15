<script setup lang="ts">
defineProps<{
  level?: 1 | 2 | 3;
  id?: string;
}>();
</script>

<template>
  <h1
    v-if="(level ?? 1) === 1"
    :id="id"
    class="font-display"
    :style="{ marginTop: '0', marginBottom: '12px', fontSize: '32px', fontWeight: 700 }"
  >
    <slot />
  </h1>
  <h2
    v-else-if="level === 2"
    :id="id"
    class="font-display"
    :style="{ marginTop: '32px', marginBottom: '12px', fontSize: '22px', fontWeight: 600 }"
  >
    <slot />
  </h2>
  <h3
    v-else
    :id="id"
    class="font-display"
    :style="{ marginTop: '24px', marginBottom: '8px', fontSize: '16px', fontWeight: 500 }"
  >
    <slot />
  </h3>
</template>
