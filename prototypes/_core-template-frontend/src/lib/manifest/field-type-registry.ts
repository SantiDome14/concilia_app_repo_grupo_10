import type { Component } from 'vue';

// ════════════════════════════════════════════════════════════════════
// Field type registry — single source for build-time + runtime forms
// ────────────────────────────────────────────────────────────────────
// Implements the contract from `core-actions-manifest` (extended) and
// `core-dynamic-forms`: ONE Map<type, component> that both the
// manifest engine and `useDynamicForm` consume. Apps register custom
// types at app bootstrap; build-time and runtime forms resolve against
// the same registry.
//
// The defaults are populated lazily on first access so consumers can
// override them at bootstrap by calling `registerFieldType()` before
// the registry is read.
// ════════════════════════════════════════════════════════════════════

const _registry = new Map<string, Component>();

/** Register (or override) a field type. */
export function registerFieldType(type: string, component: Component): void {
  _registry.set(type, component);
}

/** Resolve a field type to its component. */
export function resolveFieldType(type: string): Component | undefined {
  return _registry.get(type);
}

/** True when the type is registered (used by validators). */
export function hasFieldType(type: string): boolean {
  return _registry.has(type);
}

/** All registered type ids — useful for validator error messages. */
export function listRegisteredTypes(): string[] {
  return Array.from(_registry.keys());
}

/** Internal — exposed only for tests. */
export function _clearFieldTypeRegistry(): void {
  _registry.clear();
}
