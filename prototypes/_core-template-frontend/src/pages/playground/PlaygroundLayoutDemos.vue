<script setup lang="ts">
import PlaygroundCard from './PlaygroundCard.vue';
import ResizablePanel from '@/components/layout/ResizablePanel.vue';
import { Carousel } from '@/components/ui/carousel';

// ════════════════════════════════════════════════════════════════════
// PlaygroundLayoutDemos — showroom for layout primitives
// ────────────────────────────────────────────────────────────────────
// Currently: ResizablePanel (horizontal + vertical) and Carousel
// (multi-item, dots, arrows). Add new layout primitives here as they
// land in the template.
// ════════════════════════════════════════════════════════════════════

const carouselSlides = [
  { title: 'Slide 1', tone: 'BTC/USD' },
  { title: 'Slide 2', tone: 'ETH/USD' },
  { title: 'Slide 3', tone: 'USDT/ARS' },
  { title: 'Slide 4', tone: 'USDC/USD' },
  { title: 'Slide 5', tone: 'EUR/USD' },
];
</script>

<template>
  <div class="space-y-8 px-6 py-6">
    <header class="space-y-1">
      <h1 class="text-xl font-bold text-t-1">Layout — primitives showcase</h1>
      <p class="text-sm text-t-3">
        Splits, carousels, layouts. Cada componente aquí en sus modos
        principales. Drag-resizable y carousel con keyboard nav.
      </p>
    </header>

    <!-- ─── ResizablePanel ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">ResizablePanel</h2>

      <PlaygroundCard
        title="Horizontal split (defaultSize 40%)"
        description="Drag handle entre paneles · keyboard ←/→ con foco en el separator (5%, 10% con Shift)."
      >
        <div class="h-64 w-full">
          <ResizablePanel :default-size="40" storage-key="playground-h">
            <template #panel-1>
              <div class="flex h-full items-center justify-center bg-card-2 text-sm text-t-2">
                Panel izquierdo
              </div>
            </template>
            <template #panel-2>
              <div class="flex h-full items-center justify-center bg-bg text-sm text-t-2">
                Panel derecho
              </div>
            </template>
          </ResizablePanel>
        </div>
      </PlaygroundCard>

      <PlaygroundCard
        title="Vertical split (defaultSize 60%)"
        description="Mismo componente, orientation='vertical'. Keyboard ↑/↓."
      >
        <div class="h-64 w-full">
          <ResizablePanel
            orientation="vertical"
            :default-size="60"
            storage-key="playground-v"
          >
            <template #panel-1>
              <div class="flex h-full items-center justify-center bg-card-2 text-sm text-t-2">
                Panel superior
              </div>
            </template>
            <template #panel-2>
              <div class="flex h-full items-center justify-center bg-bg text-sm text-t-2">
                Panel inferior
              </div>
            </template>
          </ResizablePanel>
        </div>
      </PlaygroundCard>
    </section>

    <!-- ─── Carousel ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">Carousel</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <PlaygroundCard
          title="1 item per view (default)"
          description="Embla-backed · dots + arrows · keyboard ←/→ con foco."
        >
          <Carousel :slides="carouselSlides">
            <template #slide="{ slide }">
              <div class="flex h-32 items-center justify-center rounded-md bg-card-2 text-base font-semibold text-t-1">
                {{ slide.title }} · {{ slide.tone }}
              </div>
            </template>
          </Carousel>
        </PlaygroundCard>

        <PlaygroundCard
          title="3 items per view, loop, autoplay"
          description="autoplay con pausa on hover. Loop sigue rotando al final."
        >
          <Carousel
            :slides="carouselSlides"
            :items-per-view="3"
            loop
            autoplay
            :autoplay-interval="3000"
          >
            <template #slide="{ slide }">
              <div class="flex h-32 items-center justify-center rounded-md bg-card-2 text-sm font-semibold text-t-1">
                {{ slide.tone }}
              </div>
            </template>
          </Carousel>
        </PlaygroundCard>

        <PlaygroundCard
          title="Sin dots ni arrows"
          description="showDots: false · showArrows: false. Keyboard sigue funcionando."
        >
          <Carousel :slides="carouselSlides" :show-dots="false" :show-arrows="false">
            <template #slide="{ slide }">
              <div class="flex h-32 items-center justify-center rounded-md bg-card-2 text-sm font-semibold text-t-1">
                {{ slide.tone }}
              </div>
            </template>
          </Carousel>
        </PlaygroundCard>
      </div>
    </section>
  </div>
</template>
