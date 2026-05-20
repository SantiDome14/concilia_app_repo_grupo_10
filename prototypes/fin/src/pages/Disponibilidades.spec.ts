import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Disponibilidades from './Disponibilidades.vue';
import { ROUTE_PATHS, ROUTE_NAMES } from '@/config/routes';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import {
  FIN_DISPONIBILIDADES_MANIFEST,
  FIN_DISPONIBILIDADES_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.actions';
import {
  FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST,
  FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.bancos_cuentas.actions';
import {
  FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST,
  FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.movimientos.actions';

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: ROUTE_PATHS.DISPONIBILIDADES,
        name: ROUTE_NAMES.DISPONIBILIDADES,
        component: Disponibilidades,
      },
    ],
  });
}

function registerManifests(): void {
  const registry = useManifestRegistryStore();
  registry.register(FIN_DISPONIBILIDADES_MANIFEST_KEY, FIN_DISPONIBILIDADES_MANIFEST);
  registry.register(
    FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY,
    FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST,
  );
  registry.register(
    FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY,
    FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST,
  );
}

async function mountPage(initialPath = ROUTE_PATHS.DISPONIBILIDADES) {
  setActivePinia(createPinia());
  registerManifests();
  const router = makeRouter();
  router.push(initialPath);
  await router.isReady();
  const wrapper = mount(Disponibilidades, {
    global: { plugins: [router] },
  });
  return { wrapper, router };
}

describe('Disponibilidades page · FIN (REQ-50)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders with three sub-tabs in canonical order: Posición / Bancos-Cuentas / Movimientos', async () => {
    const { wrapper } = await mountPage();
    const segmenter = wrapper.find('[data-testid="disponibilidades-segmenter"]');
    expect(segmenter.exists()).toBe(true);
    const text = segmenter.text();
    expect(text).toContain('Posición');
    expect(text).toContain('Bancos / Cuentas');
    expect(text).toContain('Movimientos');
    // Order: Posición comes before Bancos / Cuentas comes before Movimientos.
    const posIdx = text.indexOf('Posición');
    const bcIdx = text.indexOf('Bancos / Cuentas');
    const movIdx = text.indexOf('Movimientos');
    expect(posIdx).toBeLessThan(bcIdx);
    expect(bcIdx).toBeLessThan(movIdx);
  });

  it('defaults to the Posición sub-tab on initial mount', async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="posicion-tree"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="bancos-cuentas-table"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="movimientos-table"]').exists()).toBe(false);
  });

  it('renders Bancos / Cuentas sub-tab when route.query.tab === "bancos_cuentas"', async () => {
    const { wrapper } = await mountPage(
      `${ROUTE_PATHS.DISPONIBILIDADES}?tab=bancos_cuentas`,
    );
    expect(wrapper.find('[data-testid="bancos-cuentas-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="posicion-tree"]').exists()).toBe(false);
  });

  it('renders Movimientos sub-tab when route.query.tab === "movimientos"', async () => {
    const { wrapper } = await mountPage(
      `${ROUTE_PATHS.DISPONIBILIDADES}?tab=movimientos`,
    );
    expect(wrapper.find('[data-testid="movimientos-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="posicion-tree"]').exists()).toBe(false);
  });

  it('exposes the Posición KPI strip with the 4 ecuación-maestra cards (Bancos / Obligaciones / Pendientes / Capacidad Operativa)', async () => {
    const { wrapper } = await mountPage();
    const kpis = wrapper.find('[data-testid="posicion-kpis"]');
    expect(kpis.exists()).toBe(true);
    const text = kpis.text();
    expect(text).toContain('Bancos');
    expect(text).toContain('Obligaciones');
    expect(text).toContain('Pendientes');
    expect(text).toContain('Capacidad operativa');
    // Per-moneda rows are present in moneda nativa (no USD-equivalent in V1).
    expect(wrapper.find('[data-testid="posicion-kpi-bancos"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="posicion-kpi-obligaciones"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="posicion-kpi-pendientes"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="posicion-kpi-capacidad-operativa"]').exists()).toBe(true);
  });

  it('Posición tree does NOT expose Propio / Cliente columns or badges', async () => {
    const { wrapper } = await mountPage();
    const tree = wrapper.find('[data-testid="posicion-tree"]');
    expect(tree.exists()).toBe(true);
    const text = tree.text();
    // Per the omnibus model, the "¿de qué cliente es la plata?" question is
    // malformed — the columns/badges that materialised that question are gone.
    expect(text).not.toContain('Propio');
    expect(text).not.toContain('Total Propio');
    expect(text).not.toContain('Total Cliente');
  });

  it('Posición tree exposes BANCO / CUENTA / MONEDA / SALDO columns and the agrupación title', async () => {
    const { wrapper } = await mountPage();
    const title = wrapper.find('[data-testid="posicion-tree-title"]');
    expect(title.exists()).toBe(true);
    expect(title.text().toLowerCase()).toContain('saldos por cuentas');
    const tree = wrapper.find('[data-testid="posicion-tree"]');
    const headers = tree.findAll('th').map((th) => th.text());
    expect(headers).toEqual(['Banco', 'Cuenta', 'Moneda', 'Saldo']);
  });

  it('renders one Sociedad node per entry of POSICION_TREE in the Posición tree', async () => {
    const { wrapper } = await mountPage();
    const tree = wrapper.find('[data-testid="posicion-tree"]');
    expect(tree.exists()).toBe(true);
    const sociedades = tree.findAll('button');
    // At least one Sociedad node renders.
    expect(sociedades.length).toBeGreaterThan(0);
  });

  it('drill-down on a Posición Cuenta row navigates to Movimientos with cuenta_id query', async () => {
    const { wrapper, router } = await mountPage();
    // Find a Posición row and click on it.
    const rows = wrapper.findAll('[data-testid^="posicion-row-"]');
    expect(rows.length).toBeGreaterThan(0);
    await rows[0]!.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.tab).toBe('movimientos');
    expect(router.currentRoute.value.query.cuenta_id).toBeTypeOf('string');
  });

  it('shows the drill-down banner with a "Limpiar filtro" link when cuenta_id is set', async () => {
    const { wrapper } = await mountPage(
      `${ROUTE_PATHS.DISPONIBILIDADES}?tab=movimientos&cuenta_id=cu-hp-coinag-1`,
    );
    const banner = wrapper.find('[data-testid="movimientos-drill-banner"]');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain('cu-hp-coinag-1');
    expect(banner.text()).toContain('Limpiar filtro');
  });

  it('exposes the Movimientos KPI strip with 5 omnibus-model KPIs (per-moneda volumes + pendientes de imputación / asignación; no supervisión card)', async () => {
    const { wrapper } = await mountPage(
      `${ROUTE_PATHS.DISPONIBILIDADES}?tab=movimientos`,
    );
    const kpis = wrapper.find('[data-testid="movimientos-kpis"]');
    expect(kpis.exists()).toBe(true);
    const text = kpis.text();
    expect(text).toContain('Movimientos del día');
    expect(text).toContain('Volumen ingresado');
    expect(text).toContain('Volumen egresado');
    expect(text).toContain('Pendientes de imputación');
    expect(text).toContain('Pendientes de asignación');
    expect(text).not.toContain('Pendientes de supervisión');
    // Per-moneda rows in volume cards.
    expect(wrapper.find('[data-testid="movimientos-kpi-ingresado"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="movimientos-kpi-egresado"]').exists()).toBe(true);
  });

  it('exposes the Bancos / Cuentas KPI strip with the four REQ-50 §4.2 KPIs', async () => {
    const { wrapper } = await mountPage(
      `${ROUTE_PATHS.DISPONIBILIDADES}?tab=bancos_cuentas`,
    );
    const kpis = wrapper.find('[data-testid="bancos-cuentas-kpis"]');
    expect(kpis.exists()).toBe(true);
    const text = kpis.text();
    expect(text).toContain('Estructuras totales');
    expect(text).toContain('Cuentas activas');
    expect(text).toContain('Con configuración contable');
    expect(text).toContain('Sin configurar');
  });

  it('"Sin configurar" badge renders in warning tone on Bancos / Cuentas rows without cuenta_contable', async () => {
    const { wrapper } = await mountPage(
      `${ROUTE_PATHS.DISPONIBILIDADES}?tab=bancos_cuentas`,
    );
    const html = wrapper.html();
    // The "Sin configurar" badge appears at least once given the mock mix.
    expect(html).toContain('Sin configurar');
  });

  it('Movimientos table renders one row per movimiento with no Supervisión column (supervisión removed in V1)', async () => {
    const { wrapper } = await mountPage(
      `${ROUTE_PATHS.DISPONIBILIDADES}?tab=movimientos`,
    );
    const rows = wrapper.findAll('[data-testid^="movimientos-row-"]');
    expect(rows.length).toBeGreaterThan(0);
    const allHtml = wrapper.html();
    expect(allHtml).not.toContain('pendiente_de_supervision');
    expect(allHtml).not.toContain('estado_de_supervision');
  });

  it('Movimientos exposes search + Período / Tipo / Rail / Partner / Estructura·Cuenta filters', async () => {
    const { wrapper } = await mountPage(
      `${ROUTE_PATHS.DISPONIBILIDADES}?tab=movimientos`,
    );
    const filters = wrapper.find('[data-testid="movimientos-filters"]');
    expect(filters.exists()).toBe(true);
    expect(filters.find('[data-testid="movimientos-search"]').exists()).toBe(true);
    const labels = filters.text();
    expect(labels).toContain('Período');
    expect(labels).toContain('Tipo');
    expect(labels).toContain('Rail');
    expect(labels).toContain('Partner');
    expect(labels).toContain('Estructura / Cuenta');
  });

  it('Movimientos Lista view exposes the new columns Rail / Partner / Banco-Cuenta', async () => {
    const { wrapper } = await mountPage(
      `${ROUTE_PATHS.DISPONIBILIDADES}?tab=movimientos`,
    );
    const table = wrapper.find('[data-testid="movimientos-table"]');
    expect(table.exists()).toBe(true);
    const headers = table.findAll('th').map((th) => th.text());
    expect(headers).toContain('Rail');
    expect(headers).toContain('Partner');
    expect(headers).toContain('Banco / Cuenta');
  });

  it('Bancos / Cuentas exposes search + Sociedad / Estructura / Cuenta / Moneda / Estado / Config filters', async () => {
    const { wrapper } = await mountPage(
      `${ROUTE_PATHS.DISPONIBILIDADES}?tab=bancos_cuentas`,
    );
    const filters = wrapper.find('[data-testid="bancos-cuentas-filters"]');
    expect(filters.exists()).toBe(true);
    expect(filters.find('[data-testid="bancos-cuentas-search"]').exists()).toBe(true);
    const text = filters.text();
    expect(text).toContain('Sociedad');
    expect(text).toContain('Estructura');
    expect(text).toContain('Moneda');
    expect(text).toContain('Estado');
    expect(text).toContain('Config');
  });
});
