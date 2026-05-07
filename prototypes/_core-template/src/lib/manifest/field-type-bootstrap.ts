import { defineComponent, h } from 'vue';
import { registerFieldType } from './field-type-registry';

// ════════════════════════════════════════════════════════════════════
// Field type bootstrap — registers the 9 canonical types
// ────────────────────────────────────────────────────────────────────
// Called automatically on first import. Apps can override any type
// (or add custom domain types) by calling `registerFieldType()`
// AFTER this module has loaded.
//
// The registered components here are `presence markers` — the
// `ManifestField` engine and the `<DynamicForm>` component delegate
// the actual rendering to their internal type-aware switches. The
// registry's purpose is (a) validation that a declared type is
// known, and (b) extensibility — apps can add types without forking
// the engine.
// ════════════════════════════════════════════════════════════════════

const Marker = defineComponent({
  name: 'FieldTypeMarker',
  setup: () => () => h('span'),
});

const CANONICAL = [
  'lookup',
  'text',
  'textarea',
  'select',
  'date',
  'number',
  'boolean',
  'file',
  'multifile',
] as const;

let _bootstrapped = false;
function ensureBootstrapped(): void {
  if (_bootstrapped) return;
  _bootstrapped = true;
  for (const t of CANONICAL) registerFieldType(t, Marker);
}

ensureBootstrapped();

/** Internal — exposed only for tests so they can re-bootstrap after a clear. */
export function _rebootstrapFieldTypes(): void {
  _bootstrapped = false;
  ensureBootstrapped();
}
