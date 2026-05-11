<script setup lang="ts">
import { cn } from '@/lib/cn';

interface Props {
  class?: string;
}

const props = withDefaults(defineProps<Props>(), { class: '' });
</script>

<template>
  <div :class="cn('-mx-1 h-px bg-b-2', props.class)" role="separator" />
</template>
