## ADDED Requirements

### Requirement: Top-level RouterView MUST remount its slot when the route name changes

The top-level `<RouterView>` in `App.vue` SHALL render its slot through a keyed `<component :is="Component" :key="String(route.name ?? route.path)" />` wrapper. The key MUST be derived from `route.name` (with `route.path` as fallback when a route has no `name`), NOT from `route.fullPath`.

This keying SHALL force a clean unmount-then-mount cycle on every transition between two routes with different `route.name` values, ensuring that:

- Teleported portals (`<Dialog>`, `<Sheet>`, `<Popover>`) from the outgoing page do not survive the navigation.
- Pending async fetches whose `.then` mutates refs after unmount cannot visually leak into the next route.
- HMR-stale routed components are replaced on every navigation, not just on hard refresh.
- `watch`-driven calls to `router.replace` on the way out cannot cause render glitches in the next route.

Transitions where only `route.query` changes (e.g. filter / pagination / tab-state updates) SHALL NOT trigger a remount, because `route.name` is stable across query changes. Such transitions remain in-place updates of the same component instance.

#### Scenario: Navigating between two modules forces a clean remount

- **GIVEN** the operator is on module X with `route.name === 'modulo-x'`
- **AND** the `<RouterView>` in App.vue is configured with `:key="String(route.name ?? route.path)"`
- **WHEN** the operator navigates to module Y with `route.name === 'modulo-y'`
- **THEN** the keyed `<component>` receives a new key value
- **AND** Vue unmounts module X's component before mounting module Y's component
- **AND** module Y's content is the only content visible in the Main region

#### Scenario: In-module query change does NOT force a remount

- **GIVEN** the operator is on module X with `route.fullPath === '/modulo-x?tab=lista'`
- **AND** the route name is `'modulo-x'`
- **WHEN** the operator changes a filter that updates `route.query` to `{tab: 'tablero'}`
- **THEN** `route.name` remains `'modulo-x'`
- **AND** the keyed `<component>` retains its key
- **AND** Vue updates the existing module X component instance in place, preserving its local state

#### Scenario: HMR-stale routed component is replaced on route change

- **GIVEN** during local development the operator hot-reloads a change to module X
- **AND** the dev server retains a stale instance of module X in memory
- **WHEN** the operator navigates to module Y and then back to module X
- **THEN** the keyed `<component>` mounts a fresh module X instance on the return navigation
- **AND** the previously-stale instance is discarded

#### Scenario: Route with no name falls back to path as key

- **GIVEN** a route record declares no `name` field (only a `path`)
- **WHEN** the operator navigates to that route
- **THEN** the key resolves to `String(route.path)` per the `route.name ?? route.path` expression
- **AND** the keyed `<component>` still distinguishes this route from any other previously-mounted route
