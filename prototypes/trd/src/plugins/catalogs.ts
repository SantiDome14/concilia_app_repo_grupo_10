// ════════════════════════════════════════════════════════════════════
// catalogs plugin — registers lookup-field data sources
// ────────────────────────────────────────────────────────────────────
// Wired in `main.ts` AFTER Pinia. Every `lookup` dialog field in an
// action manifest references a catalog id (e.g. `framework.users`,
// `app.module.entity`); without these registrations the dropdowns
// resolve to `[]` and the user can't fill imputation forms.
//
// CONTRACT
// ────────────────────────────────────────────────────────────────────
// Resolvers receive whatever `catalog_filter` resolves to from the
// dialog state. Per `core-actions-manifest` Requirement 10, when the
// filter is `null` / `undefined` / `''`, the engine returns `[]`
// BEFORE invoking the resolver, so resolvers MAY assume a non-empty
// filter when called. When the dialog declares NO `catalog_filter`,
// the engine invokes the resolver with NO argument and the resolver
// returns the full catalog.
//
// Resolvers MAY be async — return `Promise<CatalogEntry[]>` when the
// data source is HTTP-backed (MSW handler or real API). The template's
// `framework.users` resolver demonstrates the pattern.
//
// AUTHORING A NEW CATALOG (in a derived app)
// ────────────────────────────────────────────────────────────────────
// 1. Define your mock / data source via an MSW handler in
//    `src/mocks/handlers/<entity>.ts` and an API module in
//    `src/api/modules/<entity>.ts`.
// 2. Add a `registerCatalog('<scope>.<entity>', async (filter) => …)`
//    call here, fetching through the API module and mapping the
//    response to `{ value: string; label: string }[]`.
// 3. Reference the catalog id from your manifest's lookup field via
//    `catalog: '<scope>.<entity>'` and (optionally) a `catalog_filter`
//    pointing to a sibling field that narrows the result set.
// 4. Test the cascading-lookup behaviour with the dialog open / close
//    cycle to confirm re-resolution on every open (Req 10 Scenario 2).
// ════════════════════════════════════════════════════════════════════

import { registerCatalog, type CatalogEntry } from '@/lib/manifest';
import { listUsers } from '@/api/modules/users';

// Module-scope cache for the user catalog. The resolver fires once
// at first dropdown-open and reuses the result on subsequent calls —
// good enough for the demonstrative example. Apps with high-cardinality
// or rapidly-changing catalogs should wire their own cache strategy
// (e.g. queryClient-backed invalidation).
let cachedUsers: CatalogEntry[] | null = null;
let inFlight: Promise<CatalogEntry[]> | null = null;

async function fetchUsersCatalog(): Promise<CatalogEntry[]> {
  if (cachedUsers) return cachedUsers;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const users = await listUsers();
    // Exclude the synthetic 'system' user — it represents automated
    // actions, not a real assignee. Apps with their own role taxonomy
    // override this filter.
    const entries = users
      .filter((u) => u.role !== 'system')
      .map((u) => ({ value: u.id, label: u.name }));
    cachedUsers = entries;
    inFlight = null;
    return entries;
  })();
  return inFlight;
}

export function setupCatalogs(): void {
  // ─── framework.users — demonstrative catalog ──────────────────────
  // Used as the example resolver for any lookup field whose role is
  // "pick a user". Derived apps MAY override this registration to plug
  // in their own user catalogue (e.g. Auth0 users, internal directory).
  registerCatalog('framework.users', fetchUsersCatalog);

  // ─── Add your app's catalogs below ────────────────────────────────
  // Example (cascading lookup — sociedad → cuenta):
  //
  //   registerCatalog('myapp.cuentas', async (filter) => {
  //     if (typeof filter !== 'string') return [];
  //     const cuentas = await listCuentas({ sociedadId: filter });
  //     return cuentas.map((c) => ({ value: c.id, label: c.label }));
  //   });
  //
  // The filter argument is whatever `catalog_filter.from_record` /
  // `from_form` / `value` resolves to at dropdown-open time.
}
