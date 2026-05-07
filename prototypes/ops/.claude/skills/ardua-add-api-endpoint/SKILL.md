---
name: ardua-add-api-endpoint
description: Add a new HTTP API endpoint to an Ardua core frontend following the canonical pattern — register the URL in `ENDPOINTS`, create or extend the module file in `src/api/modules/`, update the barrel in `src/api/index.ts`, add input/output types, and (optionally) wrap the consumer in `useQuery` or `useMutation`. Use when the user wants to wire a new backend endpoint (e.g. "agregá el endpoint GET /facturas", "necesito una llamada para crear facturas", "add the list invoices API", "integrá el endpoint POST /orders/{id}/void", "wire up a PUT to update the record"). Enforces the `core-api-layer` contract: single shared `apiClient` instance, `ApiError`-normalized errors, `PaginatedResponse<T>` envelope for list endpoints, and vue-query integration with stable query keys.
metadata:
  project: ardua
  version: "1.0"
---

# Purpose

Wire a new HTTP endpoint into the scaffolded API layer with all the conventions the template enforces:

1. The URL goes into the centralized `ENDPOINTS` object — never hardcoded in a module.
2. The call function lives in a resource-scoped file under `src/api/modules/{resource}.ts` — one file per domain resource, one function per endpoint.
3. The barrel `src/api/index.ts` exports the module as a namespace for easy importing.
4. Input and output types live in `src/types/api.ts` (shared envelopes) and `src/types/models.ts` (domain models).
5. The consumer invokes the call through `@tanstack/vue-query`'s `useQuery` (reads) or `useMutation` (writes) — never raw `axios` in a component.

The shared `apiClient` already handles auth token injection and error normalization — the module function just calls the method, the interceptor normalizes errors into `ApiError`, and the consumer branches on `error.isUnauthorized`, `error.isForbidden`, etc.

# When to trigger this skill

Use this skill when the user expresses any of these intents:

- "Agregá el endpoint {GET / POST / PUT / PATCH / DELETE} {path}"
- "Integrá la llamada para {listar / crear / actualizar / eliminar} X"
- "Add / wire up the {endpoint / API call} for Y"
- "Necesito llamar a /resource desde el módulo de Z"
- Any other skill (`ardua-add-module`, `ardua-build-filterable-list`, `ardua-add-confirm-dialog`, `ardua-build-form`) flags a `TODO: wire real API call` that needs to be filled

Do NOT use this skill for:

- Modifying the `apiClient` interceptors themselves (that's an infrastructure change — propose via OpenSpec)
- Adding authentication logic outside the token injector pattern (use `useAuth` / Auth0 plugin)
- WebSocket or SSE connections (out of scope — separate future capability)
- GraphQL integration (out of scope — the template is REST)

# Prerequisites

Before starting, the agent MUST:

1. Read `CLAUDE.md` at the repo root.
2. Read the canonical capability spec:
   ```bash
   openspec show core-api-layer
   ```
3. Inspect the existing API layer structure:
   ```
   src/api/client.ts            → shared axios instance + interceptors (do NOT modify)
   src/api/endpoints.ts         → URL constants grouped by resource
   src/api/modules/example.ts   → reference module: listExamples, getExample, createExample, updateExample, deleteExample
   src/api/index.ts             → barrel: apiClient, ENDPOINTS, exampleApi namespace
   src/types/api.ts             → ApiError, ApiResponse<T>, PaginatedResponse<T>, PaginationParams
   src/types/models.ts          → domain models (ExampleRecord, RecordStatus, User)
   ```

# Steps

## Step 1 — Gather the endpoint specification

Ask the user via AskUserQuestion:

1. **Resource name** (lowercase singular or logical group, e.g. `facturas`, `orders`, `users`, `kyc`). This becomes the key in `ENDPOINTS` and the filename `src/api/modules/{resource}.ts`.
2. **Endpoint(s)** — one or many in a single invocation. For each:
   - **HTTP method**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
   - **Path** — literal string, with `{id}` style placeholders for path params. E.g. `/facturas`, `/facturas/{id}`, `/facturas/{id}/void`
   - **Operation name** (camelCase, verb-first): `listFacturas`, `getFactura`, `createFactura`, `voidFactura`
   - **Input shape** — query params (for GET), body (for POST/PUT/PATCH), path params always
   - **Output shape** — domain model type, paginated envelope, or void
3. **Reuse existing types?** — is there already a matching domain model in `src/types/models.ts`? If not, a new type needs to be added.
4. **Pagination** for list endpoints. Default: yes, use `PaginatedResponse<T>`.
5. **vue-query integration** — should this skill scaffold a composable that wraps the call in `useQuery` / `useMutation`? If yes, ask for the composable name (e.g. `useFacturas`, `useCreateFactura`).
6. **Consumer file** (optional) — if the endpoint is being added to power a specific page, state which page so the composable is wired correctly there.

## Step 2 — Validate the spec

Stop and report if:

- Resource name collides with an existing module but the endpoint is logically different (e.g. user says `users` but the endpoint is actually for `admin-users` — recommend a distinct module name).
- HTTP method does not match the conventional semantics:
  - `GET` for reads, `POST` for creates, `PUT` for full replacements, `PATCH` for partial updates, `DELETE` for deletes
  - A "voiding" operation usually maps to `POST /resource/{id}/void` (custom action) or `PATCH /resource/{id}` with a status field — not `DELETE`. Flag if unusual.
- Path has inconsistent styling vs. existing `ENDPOINTS` (existing uses kebab-case, lowercase plural). Flag and adjust.
- Output shape for list endpoints is not paginated (out of convention). Confirm with user — if the backend genuinely returns a bare array, use `T[]` and acknowledge the deviation.

## Step 3 — Add the endpoint(s) to `ENDPOINTS`

Edit `src/api/endpoints.ts`. Add a new group or extend an existing one. Convention:

```ts
export const ENDPOINTS = {
  example: {
    list: '/examples',
    detail: (id: string) => `/examples/${id}`,
    create: '/examples',
    update: (id: string) => `/examples/${id}`,
    delete: (id: string) => `/examples/${id}`,
  },
  facturas: {                                      // ← new group
    list: '/facturas',
    detail: (id: string) => `/facturas/${id}`,
    create: '/facturas',
    update: (id: string) => `/facturas/${id}`,
    void: (id: string) => `/facturas/${id}/void`,  // custom action
  },
} as const;
```

Path params are expressed as arrow functions that return the interpolated URL. Static paths are plain strings. Never build the URL manually outside `ENDPOINTS` — every call must reference `ENDPOINTS.resource.operation(...)`.

## Step 4 — Add domain types (if not already present)

Edit `src/types/models.ts` (or create a new types file for the domain if it warrants its own).

```ts
/** Status values for facturas. */
export type FacturaStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE';

/** A Factura (invoice) record. */
export interface Factura {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: 'ARS' | 'USD';
  status: FacturaStatus;
}

/** Payload for creating a new Factura. */
export interface CreateFacturaPayload {
  clientId: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: 'ARS' | 'USD';
}

/** Partial payload for updating a Factura. */
export type UpdateFacturaPayload = Partial<CreateFacturaPayload>;
```

Conventions:
- Domain models use PascalCase (`Factura`, not `FacturaModel`)
- Status enums use union literal types in SCREAMING_SNAKE (`'DRAFT' | 'ISSUED' | ...`)
- Payloads are named `{Verb}{Resource}Payload` (`CreateFacturaPayload`, `UpdateFacturaPayload`)
- All fields English in the type; value strings can be domain terms

## Step 5 — Create or extend the module file

Location: `src/api/modules/{resource}.ts`.

If the module file does not exist, create it. If it does, extend it.

```ts
import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { PaginatedResponse, PaginationParams } from '@/types/api';
import type { Factura, CreateFacturaPayload, UpdateFacturaPayload } from '@/types/models';

// ════════════════════════════════════════════════════════════════════
// Facturas module API calls
// ────────────────────────────────────────────────────────────────────
// One function per endpoint. Inputs and outputs are typed. Errors
// propagate as ApiError thanks to the shared client interceptor.
// ════════════════════════════════════════════════════════════════════

export interface ListFacturasParams extends PaginationParams {
  status?: string;
  clientId?: string;
}

export async function listFacturas(
  params: ListFacturasParams = {},
): Promise<PaginatedResponse<Factura>> {
  const { data } = await apiClient.get<PaginatedResponse<Factura>>(
    ENDPOINTS.facturas.list,
    { params },
  );
  return data;
}

export async function getFactura(id: string): Promise<Factura> {
  const { data } = await apiClient.get<Factura>(ENDPOINTS.facturas.detail(id));
  return data;
}

export async function createFactura(payload: CreateFacturaPayload): Promise<Factura> {
  const { data } = await apiClient.post<Factura>(ENDPOINTS.facturas.create, payload);
  return data;
}

export async function updateFactura(
  id: string,
  payload: UpdateFacturaPayload,
): Promise<Factura> {
  const { data } = await apiClient.patch<Factura>(ENDPOINTS.facturas.update(id), payload);
  return data;
}

export async function voidFactura(id: string, reason?: string): Promise<Factura> {
  const { data } = await apiClient.post<Factura>(
    ENDPOINTS.facturas.void(id),
    { reason },
  );
  return data;
}
```

Conventions:
- One function per endpoint
- Function name = HTTP verb mapped to domain verb (GET → `list` / `get`, POST → `create` / custom action, PATCH → `update`, DELETE → `delete`)
- All parameters and return types are explicit (no `any`)
- Pagination is handled via `PaginatedResponse<T>` — never invent a custom shape

## Step 6 — Update the barrel

Edit `src/api/index.ts` to export the new module as a namespace:

```ts
export { apiClient, setAccessTokenGetter } from './client';
export { ENDPOINTS } from './endpoints';
export * as exampleApi from './modules/example';
export * as facturasApi from './modules/facturas';   // ← added
```

Consumers then import with:

```ts
import { facturasApi } from '@/api';
const invoices = await facturasApi.listFacturas({ page: 1 });
```

OR directly:

```ts
import { listFacturas } from '@/api/modules/facturas';
```

Both are acceptable — pick the one that matches existing usage in the consumer file.

## Step 7 — (Optional) Create the vue-query composable

If the user asked for a composable wrapper, create it in `src/composables/{useResourceOperation}.ts`.

### 7a. Read composable (useQuery)

```ts
// src/composables/useFacturas.ts
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { listFacturas, type ListFacturasParams } from '@/api/modules/facturas';

export function useFacturas(params: MaybeRefOrGetter<ListFacturasParams>) {
  const queryKey = computed(() => ['facturas', toValue(params)]);

  return useQuery({
    queryKey,
    queryFn: () => listFacturas(toValue(params)),
    placeholderData: (prev) => prev,   // keep previous page during refetch
  });
}
```

Convention for query keys:
- Array starts with the resource name: `['facturas', ...]`
- Second element is the params object (serializable) so vue-query keys by params
- For detail queries: `['facturas', 'detail', id]`

### 7b. Write composable (useMutation)

```ts
// src/composables/useCreateFactura.ts
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { createFactura } from '@/api/modules/facturas';
import type { CreateFacturaPayload } from '@/types/models';

export function useCreateFactura() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFacturaPayload) => createFactura(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas'] });
    },
  });
}
```

Convention for mutations:
- Always invalidate the relevant list query on success so the UI refetches fresh data
- For fine-grained control, invalidate specific keys; for simplicity, invalidate the resource prefix

## Step 8 — Wire in the consumer (if specified)

If the user named a specific page as the consumer:

### 8a. For a list page (reads)

```ts
// inside src/pages/Facturas.vue
import { ref, computed } from 'vue';
import { useFacturas } from '@/composables/useFacturas';

const page = ref(1);
const pageSize = ref(10);
const search = ref('');
const status = ref<string>('');

const params = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  search: search.value || undefined,
  status: status.value || undefined,
}));

const { data, isLoading, isError, error } = useFacturas(params);

const paged = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.pagination.total ?? 0);
```

### 8b. For a create form (writes)

```ts
// inside a Create modal's <script setup>
import { useCreateFactura } from '@/composables/useCreateFactura';

const { mutate: createFactura, isPending } = useCreateFactura();

function onSubmit(values: CreateFacturaPayload): void {
  createFactura(values, {
    onSuccess: (created) => {
      toast.success('Factura creada', { description: `${created.id} — ${created.number}` });
      closeCreate();
    },
    // errors surface via the global toast interceptor
  });
}
```

## Step 9 — Run quality gates

```bash
npm run spec:check
npm run type-check
npm run lint
npm run test:run
```

If type-check fails:
- Typical: the domain type has a mismatch between what the function expects (payload) and what's passed. Ensure `CreateFacturaPayload` field names match the backend contract.
- Typical: `PaginatedResponse<T>` type not imported. Add the import.
- Typical: query key not typed correctly. Use `['facturas', toValue(params)] as const` if TS complains about readonly.

## Step 10 — Hand off

Do NOT commit. Report:

- Summary: "{N} endpoint(s) registered under `{resource}` namespace: {list}. Types added in `models.ts`. Barrel updated. Composables created: {list}. Wired in: {consumer}."
- Files touched:
  - `src/api/endpoints.ts` (endpoint paths)
  - `src/api/modules/{resource}.ts` (created or extended)
  - `src/api/index.ts` (barrel)
  - `src/types/models.ts` (domain types)
  - `src/composables/{useResource}.ts` (optional)
  - `{consumer file}` (optional)
- Quality gates results (all ✓)
- If the backend endpoint is not yet live: flag "mock the response in the request interceptor during local dev, or point `VITE_API_BASE_URL` to a mock server"

# Files you'll touch

| File | Change |
|---|---|
| `src/api/endpoints.ts` | Add endpoint URLs under the resource key |
| `src/api/modules/{resource}.ts` | Create or extend — add one exported function per endpoint |
| `src/api/index.ts` | Export the module as a namespace (`{resource}Api`) |
| `src/types/models.ts` | Add domain types + payloads (if not already present) |
| `src/composables/{useResource}.ts` | (Optional) Wrap in `useQuery` / `useMutation` |
| `{consumer file}` | (Optional) Wire the composable in the page/component |

This skill does NOT touch `src/api/client.ts` (interceptors are infra-level) or `src/types/api.ts` (envelopes are fixed).

# Compliance checklist (vs. `core-api-layer` capability)

- [ ] Endpoint URL registered in `ENDPOINTS`, never hardcoded in the module function
- [ ] Module function uses the shared `apiClient` (no new axios instances)
- [ ] Function signature has explicit input and output types (no `any`)
- [ ] List endpoints return `PaginatedResponse<T>` (unless explicitly stated otherwise)
- [ ] Module namespace exported from barrel as `{resource}Api`
- [ ] Domain types live in `src/types/models.ts` (or domain-specific types file)
- [ ] Consumer uses `useQuery` / `useMutation` from `@tanstack/vue-query` (never raw `axios` in a component)
- [ ] Query keys start with the resource name (`['facturas', ...]`)
- [ ] Mutations invalidate the corresponding list query on success
- [ ] `npm run spec:check`, `npm run type-check`, `npm run lint`, `npm run test:run` all pass

# Related skills

- `ardua-add-module` — common caller: a new module needs an endpoint to fetch data
- `ardua-build-filterable-list` — chain AFTER this skill to wire the list endpoint into a table with filters
- `ardua-build-form` — chain AFTER this skill to wire the create/update endpoint into a form's submit
- `ardua-add-confirm-dialog` — chain AFTER this skill to wire a destructive endpoint (e.g. `voidFactura`) into a confirm dialog's submit handler
