## ADDED Requirements

### Requirement: Manifest engine MUST support runtime field schemas via the `useDynamicForm` composable

The manifest engine's type registry (the `Map<ManifestFieldType, Component>` resolved by `core-actions-manifest` at module setup) SHALL be a single source consumed by both build-time manifests AND runtime schemas. Runtime consumers reach the registry exclusively via the `useDynamicForm(schema, options)` composable defined in `core-dynamic-forms`. The engine SHALL NOT expose a separate runtime-only registry — there is one registry, populated by app bootstrap, used in both modes. When `useDynamicForm` resolves a field type, it MUST consult the same registry that build-time manifest validation consults.

#### Scenario: Build-time manifests and runtime schemas share the same type registry

- **GIVEN** an app registers a custom type `account-tag` with `useManifestTypeRegistry().register('account-tag', AccountTagInput)` at bootstrap
- **WHEN** a build-time manifest field with `type: 'account-tag'` AND a runtime `FieldConfig` with `type: 'account-tag'` are processed
- **THEN** both resolve to the same `AccountTagInput` component — there is no mode-specific lookup; one registry serves both

#### Scenario: Adding a parallel runtime-only registry is forbidden

- **GIVEN** a developer attempts to instantiate a `runtimeRegistry` separate from the build-time registry
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the engine has exactly one registry; runtime forms consume it via `useDynamicForm`, build-time manifests consume it via the manifest validator
