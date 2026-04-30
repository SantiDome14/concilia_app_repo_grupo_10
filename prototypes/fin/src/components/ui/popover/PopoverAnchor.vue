<script setup lang="ts">
import { PopoverAnchor, type PopoverAnchorProps, useForwardProps } from 'reka-ui';

const props = defineProps<PopoverAnchorProps>();
const forwarded = useForwardProps(props);
</script>

<template>
  <PopoverAnchor v-bind="forwarded">
    <slot />
  </PopoverAnchor>
</template>
