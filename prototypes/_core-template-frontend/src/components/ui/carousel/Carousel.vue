<script setup lang="ts" generic="T">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import emblaCarouselVue from 'embla-carousel-vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// Carousel — multi-item slide gallery (Embla-backed)
// ────────────────────────────────────────────────────────────────────
// Spec: `core-layout` + `core-theming` (extended).
// ════════════════════════════════════════════════════════════════════

const props = withDefaults(
  defineProps<{
    slides: T[];
    itemsPerView?: number;
    showDots?: boolean;
    showArrows?: boolean;
    loop?: boolean;
    autoplay?: boolean;
    autoplayInterval?: number;
  }>(),
  {
    itemsPerView: 1,
    showDots: true,
    showArrows: true,
    loop: false,
    autoplay: false,
    autoplayInterval: 5000,
  },
);

const [emblaRef, emblaApi] = emblaCarouselVue({
  loop: props.loop,
  align: 'start',
  slidesToScroll: 1,
});

const currentIndex = ref(0);

watch(emblaApi, (api) => {
  if (!api) return;
  api.on('select', () => {
    currentIndex.value = api.selectedScrollSnap();
  });
  currentIndex.value = api.selectedScrollSnap();
});

let _timer: ReturnType<typeof setInterval> | null = null;
let _paused = false;

function clearTimer(): void {
  if (_timer !== null) {
    clearInterval(_timer);
    _timer = null;
  }
}

function startTimer(): void {
  clearTimer();
  if (!props.autoplay) return;
  _timer = setInterval(() => {
    if (_paused || !emblaApi.value) return;
    if (props.loop || emblaApi.value.canScrollNext()) {
      emblaApi.value.scrollNext();
    }
  }, props.autoplayInterval);
}

function onPointerEnter(): void {
  _paused = true;
}
function onPointerLeave(): void {
  _paused = false;
}

function scrollTo(index: number): void {
  emblaApi.value?.scrollTo(index);
}

function scrollPrev(): void {
  emblaApi.value?.scrollPrev();
}
function scrollNext(): void {
  emblaApi.value?.scrollNext();
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    scrollPrev();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    scrollNext();
  }
}

onMounted(() => startTimer());
onUnmounted(() => clearTimer());

watch(
  () => props.autoplay,
  () => startTimer(),
);

const slideWidthClass = computed(() => {
  const n = Math.max(1, props.itemsPerView);
  if (n === 1) return 'w-full';
  if (n === 2) return 'w-1/2';
  if (n === 3) return 'w-1/3';
  if (n === 4) return 'w-1/4';
  return 'w-auto';
});
</script>

<template>
  <div
    role="region"
    tabindex="0"
    class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @keydown="onKeydown"
  >
    <div class="relative">
      <div ref="emblaRef" class="overflow-hidden">
        <div role="tablist" class="flex">
          <div
            v-for="(slide, idx) in props.slides"
            :key="idx"
            role="tab"
            :aria-current="currentIndex === idx ? 'true' : undefined"
            :class="cn('shrink-0 px-2', slideWidthClass)"
          >
            <slot name="slide" :slide="slide" :index="idx" />
          </div>
        </div>
      </div>

      <Button
        v-if="props.showArrows"
        type="button"
        variant="ghost"
        size="sm"
        class="absolute left-1 top-1/2 -translate-y-1/2"
        aria-label="Anterior"
        @click="scrollPrev"
      >
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <Button
        v-if="props.showArrows"
        type="button"
        variant="ghost"
        size="sm"
        class="absolute right-1 top-1/2 -translate-y-1/2"
        aria-label="Siguiente"
        @click="scrollNext"
      >
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>

    <div
      v-if="props.showDots && props.slides.length > 1"
      class="mt-3 flex items-center justify-center gap-1.5"
      role="tablist"
      aria-label="Navegación de slides"
    >
      <button
        v-for="(_, idx) in props.slides"
        :key="idx"
        type="button"
        role="tab"
        :aria-current="currentIndex === idx ? 'true' : undefined"
        :aria-label="`Ir al slide ${idx + 1}`"
        :class="
          cn(
            'h-2 w-2 rounded-full transition-colors',
            currentIndex === idx ? 'bg-brand' : 'bg-card-2 hover:bg-b-4',
          )
        "
        @click="scrollTo(idx)"
      />
    </div>
  </div>
</template>
