# Design — add-lex-usuarios

## Context

`/usuarios` es la **lista de operadores Lex** — el universo humano autorizado a usar la app. No es la lista de clientes (esa vive en `/clientes`). El legacy `usuarios.vue` lo implementa como una tabla simple read-only con dos filtros (Nombre por texto, Rol por dropdown) y tres badges de color por rol. La página tiene tres particularidades técnicas que el migration debe domar:

1. **Pagination index mismatch.** El backend de Lex usa páginas 1-indexed (`?page=1` para la primera página), mientras que `@tanstack/vue-query` y la UI del template son 0-indexed. El legacy parchea `getUsers()` con un `+1` ad-hoc, que se filtra a otras páginas que copian el patrón.
2. **Sort fields uppercased.** El backend espera `?sort=NAME&order=ASC`, no `name`/`asc`. Otra transformación que vive escondida en el call site.
3. **Role label inconsistency.** `ADMIN_LEX` se renderiza como `"Admin Lex"` en una tabla, `"Administrador"` en un breadcrumb, y `"admin lex"` en una toast — el legacy no centraliza el formateo.

```mermaid
flowchart LR
    Page[/usuarios/] --> L1[L1 PageHeader · Usuarios]
    Page --> L3[L3 FilterBar · Nombre · Rol]
    Page --> Table[UsuariosTable]
    Table --> Query[useQuery key=['lex','users',...]]
    Query --> Transformer[page +1 · sort uppercase]
    Transformer --> API[GET /user]
```

La página es read-only en v1 — Lex no expone CRUD de usuarios desde la UI; eso vive en otro sistema (Auth0 management, panel de administración corporativo). Por eso la columna Acciones está deliberadamente ausente.

---

## Decision 1 — Pagination + sort translation lives in the API layer, never in the page

### The question

Cuando la UI pide "página 0" y el backend espera "página 1", ¿quién hace el `+1`? Opciones: (a) la página, antes de pasar el param a `useQuery`; (b) el composable que envuelve `useQuery`; (c) un módulo dedicado `src/lex/users/api.ts` que expone `fetchUsers(params)` y traduce internamente.

### The decision

**Opción (c): traducción aislada en `src/lex/users/api.ts`.** La página llama `fetchUsers({ page, pageSize, name, role, sort })` con índices 0-indexed y campos lowercase. El módulo translates internally — `outboundPage = page + 1`, `outboundSort = sort.toUpperCase()`.

```ts
// src/lex/users/api.ts
export async function fetchUsers(params: UsersListParams): Promise<UsersListResponse> {
  const apiParams = {
    page: params.page + 1,
    page_size: params.pageSize,
    name: params.name || undefined,
    role: params.role || undefined,
    sort: params.sort?.field?.toUpperCase(),
    order: params.sort?.order?.toUpperCase(),
  };
  return apiClient.get('/user', { params: apiParams });
}
```

### Rationale

- **Single transformation point.** Si el backend cambia a 0-indexed mañana, una sola modificación.
- **El page component habla en su lenguaje natural** (0-indexed, lowercase) — no necesita saber del cuirk del backend.
- **Tests unitarios sencillos.** Mockear `apiClient.get` y assertar los params transformados.

### Tradeoff accepted

Una página avanzada que necesite construir su propio params shape para casos especiales (e.g. exportar todos los usuarios sin paginación) tiene que extender `fetchUsers()` o agregar otra función al módulo, no pasar params crudos al cliente HTTP. Aceptado — la disciplina vale más que la flexibilidad.

---

## Decision 2 — `formatRole()` is the single label transformer; inline `replaceAll` is rejected

### The question

¿Cómo se transforma `ADMIN_LEX` a `"Admin Lex"`? Inline en cada template (`{{ user.role.replaceAll('_', ' ') }}`)? Composable? Helper exportado? Si va al template, ¿toma el formato de Title Case del browser o lo hardcodeamos?

### The decision

**Helper puro `formatRole(role: string): string` en `src/lex/users/format.ts`** con un map explícito para los identificadores conocidos y fallback a Title Case con replace de `_` por espacio para los desconocidos.

```ts
const KNOWN: Record<string, string> = {
  ADMIN_LEX: 'Admin Lex',
  COMMERCIAL_LEX: 'Comercial Lex',
  VIEWER_LEX: 'Viewer Lex',
  COMPLIANCE: 'Compliance',
};

export function formatRole(role: string): string {
  if (role in KNOWN) return KNOWN[role];
  return role
    .replaceAll(/[-_]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}
```

### Rationale

- **El map explícito mantiene control.** "Comercial" en español, no la traducción literal "Commercial".
- **Inline `replaceAll` es prohibido.** Una página que escriba `{{ user.role.replaceAll('_', ' ') }}` se rechaza en review.
- **Roles desconocidos pasan por Title Case** — si Compliance crea un nuevo rol mañana, la página lo muestra razonablemente sin código nuevo.

### Tradeoff accepted

Si el negocio quiere cambiar `"Comercial Lex"` a `"Comercial"` (drop "Lex" del label), es un cambio de OpenSpec en `lex-usuarios`, no una edición silenciosa por página. Aceptado — la consistencia entre superficies es el objetivo.

---

## Decision 3 — Role badge colours from a registry, three known + neutral fallback

### The question

¿Dónde viven los colores de badge por rol? Inline en la celda? CSS variables? Registro typed?

### The decision

**Registro typed en `src/lex/users/roleBadge.ts`** mapeando rol → CSS variable token. Los conocidos: `COMMERCIAL_LEX → --badge-role-commercial` (azul), `COMPLIANCE → --badge-role-compliance` (púrpura), `ADMIN_LEX → --badge-role-admin` (verde). Cualquier otro rol cae a `--badge-role-neutral` (gris).

### Rationale

- **Theme-able.** Cambiar el tono se hace en `tokens.css`, no en una clase tailwind hardcodeada.
- **Resiliente a roles nuevos.** Roles desconocidos no rompen visualmente.

### Tradeoff accepted

Agregar un nuevo rol con un color reservado requiere un cambio en `roleBadge.ts` Y en `tokens.css`. Aceptado — mismo costo que cualquier nueva categoría visual.

---

## Decision 4 — Visible to all three Lex roles, no Acciones column in v1

### The question

¿Qué roles ven `/usuarios`? ¿Hay alguna acción? ¿Edit? ¿Delete? ¿Resend invite?

### The decision

**Visible a `VIEWER_LEX`, `COMMERCIAL_LEX`, `ADMIN_LEX`. Sin columna Acciones, sin CTAs.** La página es puramente informativa en v1: mostrar quiénes operan en Lex y con qué rol. CRUD de usuarios vive en otro sistema.

### Rationale

- **Visibilidad universal.** Saber con quién comparte uno la herramienta no es información sensible.
- **Sin acciones = sin gating extra.** No hay decisiones de "qué puede ver `COMMERCIAL_LEX`" porque no hay nada que hacer.
- **Acciones futuras (e.g. "Ver auditoría del usuario") se agregan en un nuevo OpenSpec change**, no se filtran ad-hoc.

### Tradeoff accepted

Un admin que quiera invitar a un nuevo usuario tiene que ir a Auth0 management u otro sistema. Aceptado — el legacy ya tiene esa restricción y mover la funcionalidad a Lex sería un alcance mucho más grande.

---

## Out of scope

- **CRUD de usuarios** — Auth0 management, no Lex UI.
- **Cambio de rol desde Lex** — mismo motivo.
- **Auditoría de actividad de un usuario** — capability separada (`lex-auditoria` futura).
- **Sort en columnas** — el legacy sortea por `NAME` por default; esto vive en el server y no requiere UI extra en v1, sólo el campo uppercase translation.
