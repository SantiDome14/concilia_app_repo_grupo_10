<script setup lang="ts">
import Skeleton from '@/components/feedback/Skeleton.vue';

// Varied widths per row to mimic a natural-looking list skeleton
const rowSizes = [
  { name: 'w-[140px]', cat: 'w-[70px]', value: 'w-20' },
  { name: 'w-[160px]', cat: 'w-[60px]', value: 'w-[90px]' },
  { name: 'w-[130px]', cat: 'w-[70px]', value: 'w-20' },
  { name: 'w-[150px]', cat: 'w-[60px]', value: 'w-20' },
  { name: 'w-[120px]', cat: 'w-20', value: 'w-[90px]' },
  { name: 'w-[155px]', cat: 'w-[70px]', value: 'w-[85px]' },
  { name: 'w-[135px]', cat: 'w-[60px]', value: 'w-20' },
];
</script>

<template>
  <!-- L1 · Page header -->
  <div class="mb-5 flex items-start justify-between">
    <div>
      <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Módulo C</h1>
      <p class="mt-1 text-xs text-t-3">
        Skeleton · patrón de listado (L1/L2/L3)
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Skeleton class="h-[34px] w-[110px] rounded-md" />
      <Skeleton class="h-[34px] w-[140px] rounded-md" />
    </div>
  </div>

  <!-- L2 · KPI cards (skeleton) -->
  <div class="mb-[22px] grid grid-cols-4 gap-3">
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <Skeleton class="h-2.5 w-[70px]" />
      <Skeleton class="my-2.5 h-6 w-20" />
      <Skeleton class="h-2.5 w-[110px]" />
    </div>
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <Skeleton class="h-2.5 w-20" />
      <Skeleton class="my-2.5 h-6 w-[90px]" />
      <Skeleton class="h-2.5 w-[120px]" />
    </div>
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <Skeleton class="h-2.5 w-[60px]" />
      <Skeleton class="my-2.5 h-6 w-[100px]" />
      <Skeleton class="h-2.5 w-[90px]" />
    </div>
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <Skeleton class="h-2.5 w-[90px]" />
      <Skeleton class="my-2.5 h-6 w-[70px]" />
      <Skeleton class="h-2.5 w-[100px]" />
    </div>
  </div>

  <!-- L3 · Section header (skeleton) -->
  <div class="mb-2.5 flex flex-wrap items-center gap-2">
    <Skeleton class="h-3.5 w-[100px]" />
    <div class="w-4" />
    <Skeleton class="h-8 w-[220px] rounded-md" />
    <div class="flex-1" />
    <Skeleton class="h-8 w-[110px] rounded-md" />
    <Skeleton class="h-8 w-[100px] rounded-md" />
    <Skeleton class="h-8 w-[100px] rounded-md" />
  </div>

  <!-- L3 · Table (skeleton) -->
  <div class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2">
    <!-- Table header -->
    <div class="flex items-center gap-5 border-b border-b-2 px-[18px] py-3">
      <Skeleton class="h-2.5 w-[70px]" />
      <Skeleton class="h-2.5 w-[100px]" />
      <Skeleton class="h-2.5 w-20" />
      <Skeleton class="h-2.5 w-[60px]" />
      <Skeleton class="h-2.5 w-[90px]" />
      <div class="flex-1" />
      <Skeleton class="h-2.5 w-5" />
    </div>
    <!-- Table rows -->
    <div
      v-for="(row, idx) in rowSizes"
      :key="idx"
      :class="[
        'flex items-center gap-5 border-b border-b-1 px-[18px] py-3',
        idx === rowSizes.length - 1 && 'border-b-0',
      ]"
    >
      <Skeleton class="h-3 w-20" />
      <Skeleton class="h-3" :class="row.name" />
      <Skeleton class="h-[18px] rounded-md" :class="row.cat" />
      <Skeleton class="h-3" :class="row.value" />
      <Skeleton class="h-[18px] w-[60px] rounded-md" />
      <div class="flex-1" />
      <Skeleton class="h-6 w-6 rounded-full" />
    </div>
  </div>

  <!-- Pagination (skeleton) -->
  <div class="mt-3.5 flex items-center justify-between">
    <Skeleton class="h-3 w-[180px]" />
    <div class="flex items-center gap-3">
      <Skeleton class="h-[26px] w-[100px] rounded-md" />
      <Skeleton class="h-[30px] w-[150px] rounded-md" />
    </div>
  </div>
</template>
