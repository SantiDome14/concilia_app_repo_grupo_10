<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { useAuth } from '@/composables/useAuth';

const { login } = useAuth();
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-bg px-4">
    <div class="w-full max-w-sm rounded-xl border border-b-2 bg-card-2 p-6 shadow-lg">
      <div class="mb-6 flex flex-col items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-lg font-extrabold text-white"
        >
          A
        </div>
        <h1 class="text-lg font-bold text-t-1">APP · Ardua</h1>
        <p class="text-center text-xs text-t-3">
          Autenticá con tu cuenta corporativa para continuar
        </p>
      </div>

      <Button variant="primary" size="lg" class="w-full" @click="login">
        Iniciar sesión
      </Button>

      <p class="mt-4 text-center text-[11px] text-t-4">
        Protegido por Auth0
      </p>
    </div>
  </div>
</template>
