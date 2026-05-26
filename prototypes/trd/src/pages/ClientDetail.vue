<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ArrowLeft, UserX, Users } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Skeleton from '@/components/feedback/Skeleton.vue';
import ClientInfoCard from '@/trd/clients/ClientInfoCard.vue';
import ClientLimitsCard from '@/trd/clients/ClientLimitsCard.vue';
import ClientBalancesCard from '@/trd/clients/ClientBalancesCard.vue';
import { ROUTE_NAMES } from '@/config/routes';
import { useClient } from '@/composables/useClient';
import type { ApiError } from '@/types/api';

// ════════════════════════════════════════════════════════════════════
// TRD — Cliente Detail (Type-B detail page)
// ────────────────────────────────────────────────────────────────────
// Contract: openspec/changes/add-trd-clients/specs/trd-clients/spec.md
//
// Three sections: Información · Límites · Balances. Limits and
// Balances own their own queries (they error- and empty-state in
// isolation) so a 5xx on Limits doesn't break Balances rendering.
// ════════════════════════════════════════════════════════════════════

const router = useRouter();
const route = useRoute();

const id = computed(() => String(route.params.id ?? ''));
const idRef = toRef(() => id.value);

const clientQuery = useClient(idRef);
const isNotFound = computed(() => {
  const err = clientQuery.error.value as ApiError | null;
  return !!err && 'isNotFound' in err && err.isNotFound;
});

function goBackToList(): void {
  // Browser back if there's history (preserves filters); otherwise push.
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push({ name: ROUTE_NAMES.CLIENTS });
  }
}
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="client-detail-page">
    <!-- 404 — full-page EmptyState, no sections -->
    <template v-if="isNotFound">
      <header class="flex items-center gap-3">
        <Button variant="ghost" size="sm" data-testid="back-to-clients" @click="goBackToList">
          <ArrowLeft class="mr-1 h-4 w-4" /> Clientes
        </Button>
      </header>
      <div class="flex flex-col items-center gap-4" data-testid="client-not-found">
        <EmptyState
          :icon="UserX"
          title="Cliente no encontrado"
          :description="`No existe un cliente con el ID ${id}.`"
        />
        <Button variant="primary" @click="router.push({ name: ROUTE_NAMES.CLIENTS })">
          Volver a Clientes
        </Button>
      </div>
    </template>

    <!-- Loading -->
    <template v-else-if="clientQuery.isLoading.value">
      <header class="flex items-center gap-3">
        <Button variant="ghost" size="sm" @click="goBackToList">
          <ArrowLeft class="mr-1 h-4 w-4" /> Clientes
        </Button>
      </header>
      <div class="space-y-4">
        <Skeleton class="h-10 w-1/3" />
        <Skeleton class="h-40 w-full" />
        <Skeleton class="h-40 w-full" />
        <Skeleton class="h-40 w-full" />
      </div>
    </template>

    <!-- Loaded -->
    <template v-else-if="clientQuery.data.value">
      <!-- L1 — back affordance + title + status pill -->
      <header class="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          class="-ml-2 self-start"
          data-testid="back-to-clients"
          @click="goBackToList"
        >
          <ArrowLeft class="mr-1 h-4 w-4" /> Clientes
        </Button>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-md bg-brand-bg text-brand"
            >
              <Users class="h-5 w-5" />
            </div>
            <h1 class="text-[22px] font-extrabold tracking-tight text-t-1" data-testid="client-name">
              {{ clientQuery.data.value.name }}
            </h1>
          </div>
          <Badge :variant="clientQuery.data.value.is_active ? 'success' : 'neutral'">
            {{ clientQuery.data.value.is_active ? 'Activo' : 'Inactivo' }}
          </Badge>
        </div>
      </header>

      <!-- Sections -->
      <ClientInfoCard :client="clientQuery.data.value" />
      <ClientLimitsCard :id="id" />
      <ClientBalancesCard :id="id" />
    </template>
  </div>
</template>
