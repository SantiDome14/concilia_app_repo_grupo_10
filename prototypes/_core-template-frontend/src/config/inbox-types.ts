// ════════════════════════════════════════════════════════════════════
// Inbox types registry — InboxTypeConfig per declared Solicitud / Tarea
// ────────────────────────────────────────────────────────────────────
// Single source of truth for the four Inbox types shipped with the
// template. Apps that clone the template replace the contents of this
// file with their own type declarations; the shape is fixed by
// `InboxTypeConfig` (`@/types/genericos`).
//
// What this registry drives in the Inbox engine:
//
//   1. Close-action choices in the `<ClosureModal>` (drawn from
//      `closeActions[]` of the matching type).
//   2. The main "Crear Solicitud / Tarea" CTA — filtered by
//      `creable_manualmente: true` AND the current user's capabilities.
//   3. Notifications on creation per `push_notification` (in-app badge
//      is always-on; canales opt-in declared per type).
//   4. `triggers_on_create[]` (V1: mocked record of "trigger fired" on
//      the Timeline; full manifest-engine integration is V2-scoped).
//   5. `auto_archive` of records when the declared `condition_ref`
//      evaluates true (closed_by: 'system').
//
// Two of the four types ship with `creable_manualmente: true` to
// exercise the CTA path in the Inbox; the other two ship with
// `creable_manualmente: false` to exercise the gate. All four declare
// `manual_creation_capability: 'INBOX_CREATE'` to make capability gating
// observable in tests.
// ════════════════════════════════════════════════════════════════════

import type { InboxTypeConfig } from '@/types/genericos';

const APROBACION_PAGO: InboxTypeConfig = {
  type: 'aprobacion_pago',
  kind: 'solicitud',
  label: 'Aprobación de pago',
  target_app: 'CORE',
  target_role: 'FIN_OFFICER',
  payload_schema: [
    {
      id: 'title',
      type: 'text',
      label: 'Título',
      placeholder: 'Aprobar pago a proveedor #…',
      required: true,
    },
    {
      id: 'description',
      type: 'textarea',
      label: 'Descripción',
      placeholder: 'Concepto, período, justificación…',
    },
    {
      id: 'amount',
      type: 'number',
      label: 'Monto',
      required: true,
    },
    {
      id: 'currency',
      type: 'select',
      label: 'Moneda',
      required: true,
      options: [
        { value: 'USD', label: 'USD' },
        { value: 'ARS', label: 'ARS' },
        { value: 'EUR', label: 'EUR' },
      ],
      defaults: 'USD',
    },
    {
      id: 'vendor',
      type: 'text',
      label: 'Proveedor',
    },
  ],
  sla_hours: 24,
  creable_manualmente: true,
  manual_creation_capability: 'INBOX_CREATE',
  closeActions: [
    { id: 'approved', label: 'Aprobada', terminal_state: 'completed' },
    { id: 'forwarded', label: 'Derivada', terminal_state: 'completed' },
    { id: 'rejected', label: 'Rechazada', terminal_state: 'rejected' },
  ],
};

const REVISION_LEGAJO: InboxTypeConfig = {
  type: 'revision_legajo',
  kind: 'solicitud',
  label: 'Revisión de legajo',
  target_app: 'CORE',
  target_role: 'LEX_OFFICER',
  payload_schema: [
    {
      id: 'title',
      type: 'text',
      label: 'Título',
      placeholder: 'Revisión de legajo cliente…',
      required: true,
    },
    {
      id: 'description',
      type: 'textarea',
      label: 'Descripción',
      placeholder: 'Documentos pendientes, observaciones…',
    },
    {
      id: 'cliente',
      type: 'text',
      label: 'Cliente',
      required: true,
    },
  ],
  sla_hours: 48,
  creable_manualmente: true,
  manual_creation_capability: 'INBOX_CREATE',
  closeActions: [
    { id: 'approved', label: 'Aprobada', terminal_state: 'completed' },
    { id: 'incomplete', label: 'Devuelta al solicitante', terminal_state: 'rejected' },
  ],
};

const BAJA_USUARIO: InboxTypeConfig = {
  type: 'baja_usuario',
  kind: 'tarea',
  label: 'Baja de usuario',
  target_app: 'CORE',
  target_role: 'ADMIN_OPS',
  payload_schema: [
    {
      id: 'title',
      type: 'text',
      label: 'Título',
      required: true,
    },
    {
      id: 'usuario_id',
      type: 'text',
      label: 'Usuario ID',
      required: true,
    },
    {
      id: 'motivo',
      type: 'textarea',
      label: 'Motivo de la baja',
      required: true,
    },
  ],
  sla_hours: 72,
  // creable_manualmente intentionally omitted — exercises the gate
  // (the CTA SHALL NOT list this type even with the capability).
  manual_creation_capability: 'INBOX_CREATE',
  closeActions: [
    { id: 'completed', label: 'Hecha', terminal_state: 'completed' },
    { id: 'discarded', label: 'No corresponde', terminal_state: 'rejected' },
  ],
};

const CAMBIO_LIMITE: InboxTypeConfig = {
  type: 'cambio_limite',
  kind: 'solicitud',
  label: 'Cambio de límite',
  target_app: 'CORE',
  target_role: 'FIN_OFFICER',
  payload_schema: [
    {
      id: 'title',
      type: 'text',
      label: 'Título',
      required: true,
    },
    {
      id: 'description',
      type: 'textarea',
      label: 'Descripción',
    },
    {
      id: 'cliente',
      type: 'text',
      label: 'Cliente',
      required: true,
    },
    {
      id: 'limite_actual',
      type: 'number',
      label: 'Límite actual',
    },
    {
      id: 'limite_solicitado',
      type: 'number',
      label: 'Límite solicitado',
      required: true,
    },
  ],
  sla_hours: 36,
  creable_manualmente: false,
  manual_creation_capability: 'INBOX_CREATE',
  closeActions: [
    { id: 'approved', label: 'Aprobada', terminal_state: 'completed' },
    { id: 'rejected', label: 'Rechazada', terminal_state: 'rejected' },
  ],
};

/** Frozen registry of Inbox types shipped by the template. */
export const INBOX_TYPES_REGISTRY: Readonly<Record<string, InboxTypeConfig>> =
  Object.freeze({
    aprobacion_pago: APROBACION_PAGO,
    revision_legajo: REVISION_LEGAJO,
    baja_usuario: BAJA_USUARIO,
    cambio_limite: CAMBIO_LIMITE,
  });

/** Type-safe lookup. Returns `undefined` when the type is not declared. */
export function getInboxTypeConfig(type: string): InboxTypeConfig | undefined {
  return INBOX_TYPES_REGISTRY[type];
}

/**
 * Filtered list of types that the current user can create manually from
 * the Inbox main CTA. A type is in the result iff:
 *
 *   1. `creable_manualmente` is `true` (not `undefined`, not `false`); AND
 *   2. the user holds the `manual_creation_capability` declared by the
 *      type, OR the user holds the wildcard `'*'` capability (the
 *      template's dev-fallback shortcut documented on `useCapabilities`),
 *      OR the type declares no capability (any logged-in user passes).
 *
 * Returns the types in registry-declaration order.
 */
export function listCreableTypes(
  userCapabilities: readonly string[],
): InboxTypeConfig[] {
  const caps = new Set(userCapabilities);
  const hasWildcard = caps.has('*');
  const result: InboxTypeConfig[] = [];
  for (const cfg of Object.values(INBOX_TYPES_REGISTRY)) {
    if (cfg.creable_manualmente !== true) continue;
    if (
      cfg.manual_creation_capability &&
      !hasWildcard &&
      !caps.has(cfg.manual_creation_capability)
    ) {
      continue;
    }
    result.push(cfg);
  }
  return result;
}

/** True when at least one registry entry declares `creable_manualmente: true`. */
export function hasAnyCreableType(): boolean {
  for (const cfg of Object.values(INBOX_TYPES_REGISTRY)) {
    if (cfg.creable_manualmente === true) return true;
  }
  return false;
}
