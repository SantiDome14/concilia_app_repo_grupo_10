// ════════════════════════════════════════════════════════════════════
// disponibilidadesCatalog — Pinia store for Bancos/Cuentas CRUD
// ────────────────────────────────────────────────────────────────────
// Reactive wrapper around the Estructuras + Cuentas catalogues so:
//   - The Bancos / Cuentas table re-renders on new records.
//   - The Crear Cuenta dialog's `banco` lookup reflects newly-added
//     Estructuras immediately.
//   - The Cargar movimiento manual dialog's Cuenta lookup reflects
//     newly-added Cuentas immediately.
//
// Per Decision 2 of `extend-fin-disponibilidades-bancos-cuentas-crud`,
// this is the canonical state owner. The catalog plugin
// (`plugins/catalogs.ts`) reads from this store to resolve dropdowns;
// the page (`Disponibilidades.vue`) reads via `storeToRefs`.
// ════════════════════════════════════════════════════════════════════

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import type { CuentaBanco, EstructuraBanco } from '@/types/fin';
import { CATALOGO_CUENTAS } from '@/mocks/fin/bancos_cuentas';
import { ESTRUCTURAS_BANCOS } from '@/mocks/fin/estructuras_bancos';

export const useDisponibilidadesCatalogStore = defineStore(
  'disponibilidadesCatalog',
  () => {
    // Seeds are copied (not aliased) so mutations don't bleed back to
    // the exported mock constants — the page reads `.value`, the mock
    // stays canonical.
    const cuentas = ref<CuentaBanco[]>(CATALOGO_CUENTAS.map((c) => ({ ...c })));
    const estructuras = ref<EstructuraBanco[]>(
      ESTRUCTURAS_BANCOS.map((e) => ({ ...e })),
    );

    function addCuenta(c: CuentaBanco): void {
      if (cuentas.value.some((existing) => existing.id === c.id)) {
        toast.error(`La cuenta ${c.id} ya existe`);
        return;
      }
      cuentas.value = [...cuentas.value, c];
    }

    function addEstructura(e: EstructuraBanco): void {
      if (estructuras.value.some((existing) => existing.id === e.id)) {
        toast.error(`La estructura ${e.id} ya existe`);
        return;
      }
      estructuras.value = [...estructuras.value, e];
    }

    // Derived KPIs (REQ-50 §4.2) — recomputed reactively when the
    // cuentas array mutates.
    const kpis = computed(() => ({
      estructurasTotales: new Set(cuentas.value.map((c) => c.banco)).size,
      cuentasActivas: cuentas.value.filter((c) => c.estado === 'Activa').length,
      cuentasConfiguradas: cuentas.value.filter(
        (c) => c.cuenta_contable !== null,
      ).length,
      cuentasSinConfigurar: cuentas.value.filter(
        (c) => c.cuenta_contable === null,
      ).length,
    }));

    /**
     * Generates a unique cuenta id with the convention
     * `cu-<sociedad>-<slugified-banco>-<seq>` where `seq` is the next
     * integer not yet used for that (sociedad, banco) pair.
     */
    function nextCuentaId(sociedad_id: string, banco: string): string {
      const slug = banco.toLowerCase().replace(/\s+/g, '-');
      const prefix = `cu-${sociedad_id}-${slug}-`;
      let n = 1;
      while (cuentas.value.some((c) => c.id === `${prefix}${n}`)) n += 1;
      return `${prefix}${n}`;
    }

    /**
     * Generates a unique estructura id with the convention
     * `est-<slugified-nombre>` or `est-<slugified-nombre>-<seq>` if
     * collision.
     */
    function nextEstructuraId(nombre: string): string {
      const slug = nombre.toLowerCase().replace(/\s+/g, '-');
      const base = `est-${slug}`;
      if (!estructuras.value.some((e) => e.id === base)) return base;
      let n = 2;
      while (estructuras.value.some((e) => e.id === `${base}-${n}`)) n += 1;
      return `${base}-${n}`;
    }

    return {
      cuentas,
      estructuras,
      addCuenta,
      addEstructura,
      kpis,
      nextCuentaId,
      nextEstructuraId,
    };
  },
);
