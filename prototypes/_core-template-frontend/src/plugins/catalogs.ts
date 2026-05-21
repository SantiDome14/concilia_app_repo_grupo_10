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
// AUTHORING A NEW CATALOG (in a derived app)
// ────────────────────────────────────────────────────────────────────
// 1. Define your mock / data source under `src/mocks/<app>/`.
// 2. Add a `registerCatalog('<scope>.<entity>', (filter) => …)` call
//    here, returning `{ value: string; label: string }[]`.
// 3. Reference the catalog id from your manifest's lookup field via
//    `catalog: '<scope>.<entity>'` and (optionally) a `catalog_filter`
//    pointing to a sibling field that narrows the result set.
// 4. Test the cascading-lookup behaviour with the dialog open / close
//    cycle to confirm re-resolution on every open (Req 10 Scenario 2).
//
// The template ships ONE demonstrative catalog (`framework.users`) so
// derived apps see the pattern end-to-end. Real data sources live in
// the consuming app, not in the template.
// ════════════════════════════════════════════════════════════════════

import { registerCatalog } from '@/lib/manifest';

export function setupCatalogs(): void {
  // ─── framework.users — demonstrative catalog ──────────────────────
  // Used as the example resolver for any lookup field whose role is
  // "pick a user". Derived apps MAY override this registration to plug
  // in their own user catalogue (e.g. Auth0 users, internal directory).
  registerCatalog('framework.users', () => [
    { value: 'u-1', label: 'Yasmani Rodríguez' },
    { value: 'u-2', label: 'María González' },
    { value: 'u-3', label: 'Juan Pérez' },
    { value: 'u-5', label: 'Lucía Fernández' },
  ]);

  // ─── Add your app's catalogs below ────────────────────────────────
  // Example (cascading lookup — sociedad → cuenta):
  //
  //   registerCatalog('myapp.sociedades', () =>
  //     SOCIEDADES.map((s) => ({ value: s.id, label: s.nombre })),
  //   );
  //
  //   registerCatalog('myapp.cuentas', (filter) => {
  //     if (typeof filter !== 'string') return [];
  //     return CUENTAS
  //       .filter((c) => c.sociedad_id === filter)
  //       .map((c) => ({ value: c.id, label: c.label }));
  //   });
  //
  // The filter argument is whatever `catalog_filter.from_record` /
  // `from_form` / `value` resolves to at dropdown-open time.
}
