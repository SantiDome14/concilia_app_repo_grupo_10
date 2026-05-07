## ADDED Requirements

### Requirement: Toasts MUST use `vue-sonner` with the shared Toaster instance

The application SHALL render feedback toasts through a single `<Toaster>` component mounted at the root level of `App.vue`. Every component SHALL emit toasts via `import { toast } from 'vue-sonner'`. Custom toast implementations are forbidden.

#### Scenario: Single Toaster instance is mounted at the root

- **GIVEN** the application bootstraps
- **WHEN** `App.vue` renders
- **THEN** `<Toaster position="bottom-right" theme="dark" :duration="4500" rich-colors />` is rendered exactly once

#### Scenario: Components emit toasts via the shared toast API

- **GIVEN** a component needs to surface feedback
- **WHEN** the component calls for user feedback
- **THEN** it calls `toast.success(...)`, `toast.error(...)`, `toast.info(...)`, or `toast.warning(...)` — it does not mount its own toast surface

### Requirement: Toasts MUST follow the title + description contract

Every toast SHALL include a short title (3–5 words, verb-first) AND a description that identifies the affected record or provides actionable context.

#### Scenario: Success toast identifies the record

- **GIVEN** a record operation succeeds
- **WHEN** the toast is emitted
- **THEN** the toast renders a short title (e.g. `Registro creado`) and a description in the form `{id} — {name}` or equivalent domain-specific identifier

#### Scenario: Error toast explains the failure

- **GIVEN** an operation fails due to an `ApiError`
- **WHEN** the toast is emitted
- **THEN** the toast renders an explicit title (e.g. `No se pudo guardar`) and a description derived from `error.message` or a mapped user-friendly string

### Requirement: Empty states MUST use the shared `EmptyState` component

Any surface that has zero data (empty search result, empty table, empty list) SHALL render the shared `EmptyState` component with a title, optional description, and optional icon. Ad-hoc empty-state markup is forbidden.

#### Scenario: Empty list uses EmptyState

- **GIVEN** a list or grid has zero items and no filters are active
- **WHEN** the surface renders its empty state
- **THEN** it uses `<EmptyState title="..." description="..." :icon="..." />`

#### Scenario: Filtered empty result differs from truly empty

- **GIVEN** filters produce zero results but the underlying dataset is non-empty
- **WHEN** the empty state renders
- **THEN** the title clarifies that filters are applied (e.g. `Sin resultados para los filtros aplicados`)

### Requirement: Loading states MUST use the shared `Skeleton` component

Surfaces that are waiting for data SHALL render `Skeleton` blocks that mirror the shape of the final content. Spinners are forbidden except for button-internal loading indicators.

#### Scenario: Table loads with row-shaped skeletons

- **GIVEN** a table is fetching its first page
- **WHEN** the loading state renders
- **THEN** the table shows skeleton rows that match the height and column layout of real rows

#### Scenario: Dashboard loads with card-shaped skeletons

- **GIVEN** a dashboard is fetching KPI or chart data
- **WHEN** the loading state renders
- **THEN** the dashboard shows skeleton cards in the same grid layout as the final content

### Requirement: 401 errors MUST trigger a logout and redirect

When any query or mutation surfaces a 401 `ApiError`, the app SHALL clear the auth state and redirect to the Login route. Individual components SHALL NOT handle 401 locally.

#### Scenario: Stale token triggers logout

- **GIVEN** the user has a stale or invalid auth token
- **WHEN** any API call returns a 401 `ApiError`
- **THEN** the global error handler (vue-query `queryCache.onError` or axios interceptor) clears the Pinia auth store and redirects to `/login`

### Requirement: 403 errors MUST surface a "no permission" message

When any query or mutation returns a 403 `ApiError`, the app SHALL surface a non-dismissive error toast with a clear message explaining that the operation is not permitted. The user SHALL NOT be logged out.

#### Scenario: Forbidden operation surfaces a toast

- **GIVEN** the user attempts an operation they lack permission for
- **WHEN** any API call returns a 403 `ApiError`
- **THEN** a danger-variant toast appears with a title like `Operación no permitida` and a description explaining the capability gap

### Requirement: Network and 5xx errors MUST offer retry affordance

When an operation fails with a network error (`status: 0`) or a 5xx `ApiError`, the UI SHALL surface a toast with a `Reintentar` action that re-invokes the failed operation.

#### Scenario: Network failure offers retry

- **GIVEN** a mutation fails with `error.code === 'NETWORK'` or `error.isServerError`
- **WHEN** the error toast is emitted
- **THEN** the toast exposes an action button labeled `Reintentar` that re-runs the mutation

### Requirement: Unhandled errors MUST be caught by a global error boundary

The root application SHALL register a Vue `app.config.errorHandler` that logs unhandled component errors and surfaces a generic error toast, so that a single component failure does not crash the whole shell.

#### Scenario: Component error is contained

- **GIVEN** a Vue component throws during render or in a lifecycle hook
- **WHEN** the error bubbles to the global handler
- **THEN** the error handler logs to the console in development, emits a generic error toast in production, and keeps the rest of the UI functional
