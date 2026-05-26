# Tasks — add-trd-clients

Implementation walks bottom-up: types → endpoints → API module → MSW → composables → pages → routing/sidebar → tests → docs. Each task is independently verifiable; do NOT mark complete without a clear observable outcome.

## 1. Types and schemas

- [ ] Create `src/types/client.ts` exporting types `Client`, `ClientLimit`, `ClientBalance` and zod schemas `clientSchema`, `clientLimitSchema`, `clientBalanceSchema`, plus a `PaginatedResponse<Client>`-style envelope shape via the existing `paginatedResponseSchema` helper.
- [ ] Add page-local helpers in the same file: `displayValueOrDash(value)` (returns `—` for `null`/`undefined`/`''`).
- [ ] Verify `npm run type-check` is clean.

## 2. Endpoints declaration

- [ ] Edit `src/api/endpoints.ts` — add `ENDPOINTS.clients` group with `list = '/clients'`, `detail = (id) => \`/clients/${id}\``, `limits = (id) => \`/clients/${id}/limits\``, `balances = (id) => \`/clients/${id}/balances\``. Match the per-group style already in the file.

## 3. API module

- [ ] Create `src/api/modules/clients.ts` exposing `listClients`, `getClient`, `getClientLimits`, `getClientBalances`. Each function validates the response against the zod schema from §1; on failure throw `ApiError({ category: 'parse', ... })`.
- [ ] Add `src/api/modules/clients.spec.ts` covering each function's happy path + 404 + 5xx + zod-parse failure. Mock `apiClient` via `vi.mock` or pass a typed test instance per project convention.
- [ ] Re-export from `src/api/index.ts` (the barrel) following the OPS pattern.

## 4. MSW seed

- [ ] Create `src/mocks/seed/clients.ts` exporting `clientsSeed: Client[]` with ≥ 30 entries, of which ≥ 5 are `is_active = false`, ≥ 5 have `circuit_docket = null`, and id space is stable (`abc-001`...`abc-030` style, NOT random).
- [ ] In the same file, export `clientLimitsSeed: Record<string, ClientLimit[]>` and `clientBalancesSeed: Record<string, ClientBalance[]>` such that ≥ 20 clients have limits, ≥ 20 have balances, and ≥ 5 have neither.
- [ ] Export `resetClientsSeed()` that restores all three structures to their initial state.
- [ ] Wire the reset helper into `src/mocks/seed/index.ts` and the cross-app reset entry point.

## 5. MSW handler

- [ ] Create `src/mocks/handlers/clients.ts` with four handlers built via `apiPath(ENDPOINTS.clients.*)`:
  - `GET /clients` — applies `q` substring match across `name` + `ardua_docket`, paginates by `page` and `pageSize`, returns `{ items, total, page, pageSize }`.
  - `GET /clients/:id` — 200 with the client or 404 with `{ error: 'CLIENT_NOT_FOUND' }`.
  - `GET /clients/:id/limits` — returns the limits array (possibly empty).
  - `GET /clients/:id/balances` — returns the balances array (possibly empty).
- [ ] Add the 200ms artificial delay (mirrors the cross-app MSW convention).
- [ ] Honour `MSW_FAULT_INJECT === 'clients:limits-5xx'` for the limits handler when the request carries `?fault=on`.
- [ ] Register the handler array in `src/mocks/handlers/index.ts` AFTER the cross-cutting handlers (no overlap with `users`/`alertas`/etc).

## 6. Composables (vue-query wrappers)

- [ ] Create `src/composables/useClientsList.ts` with `useClientsList(filters: Ref<{ q?: string; page: number; pageSize: number }>)` returning `useQuery({ queryKey: ['clients', filters], queryFn, keepPreviousData: true })`.
- [ ] Create `src/composables/useClient.ts` with `useClient(id: Ref<string>)` returning `useQuery({ queryKey: ['clients', id], queryFn })`.
- [ ] Create `src/composables/useClientLimits.ts` and `src/composables/useClientBalances.ts` following the same pattern, with `enabled: computed(() => !!id.value)`.
- [ ] Add tests for at least `useClientsList` query-key stability (the page-component tests cover the rest).

## 7. Page: `Clients.vue` (master)

- [ ] Create `src/pages/Clients.vue` following the L1 / L3 / table / footer pattern from `core-layout`:
  - L1: page header with title `Clientes`, no CTA in v1.
  - L3: single `<Input>` with placeholder `Buscar por nombre o legajo...`, debounced 300ms via `@vueuse/core useDebouncedRef` or equivalent.
  - Table: shadcn-vue `<Table>` with columns `Nombre · Legajo Ardua · Estado`. Row click navigates via `router.push({ name: 'client-detail', params: { id } })`.
  - Footer: `<TablePagination>` with the four canonical page-size options. Page-size persisted via `usePersistedPageSize('trd.clients.pageSize', 25)`.
- [ ] URL sync: read `q`, `page`, `pageSize` from `route.query` on mount; on any change, `router.replace({ query: { q, page, pageSize } })`. Use the existing `useQuerySync` composable if one exists in the template; otherwise add a thin local helper documented inline.
- [ ] Empty state: when `data.items.length === 0`, render `<EmptyState>` from `@/components/feedback`; hint copy depends on `q` being active or not.
- [ ] Skeleton: while `isLoading` first-time, render `<Skeleton>` shaped to header + 5 row placeholders. Subsequent paginations should use `keepPreviousData` (no flicker).
- [ ] Add `src/pages/Clients.spec.ts` covering: initial render with seed, search-and-debounce, URL-sync, row click, empty state.

## 8. Page: `ClientDetail.vue` (detail)

- [ ] Create `src/pages/ClientDetail.vue`:
  - L1 header: `<BackAffordance>` (or `←` icon + title), title = client `name`, status pill via shared `<Badge variant=...>`.
  - Sections in order: `<ClientInfoCard>`, `<ClientLimitsCard>`, `<ClientBalancesCard>`. Place each card under `src/trd/clients/` to keep the page narrative-only (≤ 200 LOC).
- [ ] `<ClientInfoCard>`: 2-column label/value grid with `ID · Nombre · Legajo Ardua · Legajo Circuit · Estado`. Null values render as `—`. `Estado` re-uses the same badge.
- [ ] `<ClientLimitsCard>`: `<Table>` with columns `Entidad · Moneda · Límite · Disponible · Usado`. Empty → `<EmptyState>` "Sin límites configurados". 5xx → inline retry banner with `<Button variant="outline">Reintentar</Button>` that calls `useClientLimits` refetch.
- [ ] `<ClientBalancesCard>`: `<Table>` with columns `Moneda · Balance · Última actualización`. Empty → `<EmptyState>` "Sin balances disponibles". 5xx mirrors limits.
- [ ] Unknown `id`: when `useClient` resolves to 404, render the full page as `<EmptyState>` "Cliente no encontrado" with a `Volver a Clientes` button. No section renders.
- [ ] Add `src/pages/ClientDetail.spec.ts` covering: initial render of all three sections, 404 EmptyState, Limits 5xx retry banner.

## 9. Routing + sidebar

- [ ] Edit `src/config/routes.ts` — add `CLIENTS = '/clients'` and `CLIENT_DETAIL = '/clients/:id'` to `ROUTE_PATHS`, and the matching `clients` / `client-detail` constants to `ROUTE_NAMES`.
- [ ] Edit `src/router/routes.ts` — register `/clients` (Clients.vue) and `/clients/:id` (ClientDetail.vue) with the meta from the spec. Place the records under the now-existing `Domain modules` comment block.
- [ ] Edit `src/components/layout/Sidebar.vue` — add a new `NavBlock` labelled `Catálogos` with the first entry `Clientes` (icon `Users` from `lucide-vue-next`). Import the icon at the top.
- [ ] Confirm the active style appears on the `Clientes` sidebar entry when the route matches `/clients` or `/clients/:id`.

## 10. Manifest engine

- [ ] **No-op in v1.** No `trd.clients` manifest is registered. Document this explicitly in `src/plugins/manifests.ts` (a one-line comment) so future contributors do not assume an oversight. Future actions land in `extend-trd-clients-edit`.

## 11. Quality gates

- [ ] `npm run lint` exit 0.
- [ ] `npm run type-check` exit 0.
- [ ] `npm run test:run` exit 0. Coverage of `src/api/modules/clients.ts`, `src/pages/Clients.vue`, `src/pages/ClientDetail.vue` is each ≥ 90 % per `vitest --coverage`.
- [ ] `npm run spec:check` exit 0 — `add-trd-clients` validates strict, baseline still validates.
- [ ] `npm run build:qa` exit 0. Bundle delta is reported in PR description.

## 12. Manual smoke

- [ ] `npm run dev` boots with `VITE_USE_MOCKS=true`; the sidebar shows `Catálogos / Clientes`.
- [ ] Navigate to `/clients` — the list shows ≥ 30 rows, search debounces, page-size selector works, URL syncs.
- [ ] Click a row — detail page mounts with three sections; back button restores list state.
- [ ] Open `/clients/does-not-exist` — `Cliente no encontrado` empty state renders without crash.
- [ ] Toggle the fault flag — Limits section shows the retry banner, Información and Balances still render.

## 13. Doc bookkeeping

- [ ] Update `prototypes/trd/TASKS-TRD.md` Stage 1 row #1 from `Not started` → `Archived` (after archive step), and add a session log entry.
- [ ] Bump `MIGRATION-NOTES.md` frontmatter `updated_at`.
- [ ] If the legacy backend changes flagged in `design.md` (T2 + T3) need a separate backend REQ, capture the open item in `MIGRATION-NOTES.md §15` Decision A under "API endpoints needing backend changes".

## 14. Archive

- [ ] `npx openspec validate add-trd-clients --strict` clean.
- [ ] `npx openspec validate --all --strict` clean.
- [ ] `/opsx:archive add-trd-clients` (move to `openspec/changes/archive/YYYY-MM-DD-add-trd-clients/`, apply spec deltas under `openspec/specs/trd-clients/`).
- [ ] PR title `Add Clientes module to core-trd (Catálogos block)` — mirrors the proposal H1.
- [ ] Commit conventions: `feat(trd/clients): ...` for the implementation, `specs(trd): add trd-clients capability` for the spec apply.
