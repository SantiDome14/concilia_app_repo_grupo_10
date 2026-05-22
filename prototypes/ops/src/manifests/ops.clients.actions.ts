// ════════════════════════════════════════════════════════════════════
// ops.clients — actions manifest
// ────────────────────────────────────────────────────────────────────
// Master list of OPS clients. The module intentionally exposes NO
// header CTAs — every operator-driven flow lives as a per-row action
// (the user explicitly removed Alta de Cliente en APP and Generar
// Statement from the header).
//
// Per-row actions:
//   - clients.generar_statement   — documentacion · opens GenerateStatementModal
//                                   with the row preselected
//   - clients.alta_portal         — governance · opens SignUpUserModal
//                                   (only visible when the portal is
//                                   not yet active and the client has
//                                   email + is_active)
//   - clients.habilitar_cuenta    — governance · opens WhitelistAccountModal
//                                   (only visible when the row has a
//                                   COINAG instruction)
//   - clients.activar             — governance · re-enables is_active
//   - clients.desactivar          — governance · danger · suspends is_active
//
// `Activar` / `Desactivar` are split into two actions whose `show_when`
// predicates branch on the current `is_active` value — that way only
// the relevant toggle surfaces in the menu.
//
// "Ver detalle" is intentionally NOT a per-row action: clicking the row
// already navigates to `/clients/:id`, so a menu entry would be noise.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const OPS_CLIENTS_MANIFEST_KEY = 'ops.clients' as const;

export const OPS_CLIENTS_MANIFEST: Manifest = {
  app: 'ops',
  module: 'clients',
  scope: 'module',
  schema_version: '1',
  actions: [
    {
      id: 'clients.generar_statement',
      dimension: 'documentacion',
      label: 'Generar statement',
      description: 'Genera el statement preseleccionando este cliente.',
      icon: 'file-text',
      on_confirm: {
        set_fields: { _action: 'generar_statement' },
      },
    },
    {
      id: 'clients.alta_portal',
      dimension: 'governance',
      label: 'Alta en el portal',
      description: 'Envía la invitación de portal a este cliente (requiere step-up MFA).',
      icon: 'user-plus',
      show_when: {
        all: [
          { field_equals: { field: 'is_active', value: true } },
          { field_is_not_null: 'email' },
          { field_in: { field: 'portal_status', values: ['NOT_CREATED', 'PENDING'] } },
        ],
      },
      on_confirm: {
        set_fields: { _action: 'alta_portal' },
      },
    },
    {
      id: 'clients.habilitar_cuenta',
      dimension: 'governance',
      label: 'Habilitar cuenta CVU',
      description: 'Valida y agrega un CVU/CBU a la whitelist del cliente.',
      icon: 'shield-check',
      show_when: { field_equals: { field: 'has_coinag_instruction', value: true } },
      on_confirm: {
        set_fields: { _action: 'habilitar_cuenta' },
      },
    },
    {
      id: 'clients.activar',
      dimension: 'governance',
      label: 'Activar cliente',
      description: 'Reactiva al cliente. Vuelve a estar disponible para operar.',
      icon: 'circle-check',
      show_when: { field_equals: { field: 'is_active', value: false } },
      dialog: {
        title: 'Activar cliente',
        description: '{record.name}',
        info_banner: {
          variant: 'info',
          text: 'Al activarse el cliente queda disponible para nuevas operaciones.',
        },
        fields: [],
        confirm_label: 'Activar',
      },
      on_confirm: {
        update_fields: ['is_active'],
        set_fields: { is_active: true },
        audit: true,
        toast: 'Cliente activado',
      },
    },
    {
      id: 'clients.desactivar',
      dimension: 'governance',
      label: 'Desactivar cliente',
      description: 'Suspende al cliente. No podrá operar hasta que se reactive.',
      icon: 'circle-x',
      danger: true,
      show_when: { field_equals: { field: 'is_active', value: true } },
      dialog: {
        title: 'Desactivar cliente',
        description: '{record.name}',
        info_banner: {
          variant: 'warning',
          text: 'El cliente quedará suspendido y no podrá operar hasta que se reactive.',
        },
        fields: [],
        confirm_label: 'Desactivar',
      },
      on_confirm: {
        update_fields: ['is_active'],
        set_fields: { is_active: false },
        audit: true,
        toast: 'Cliente desactivado',
      },
    },
  ],
  module_ctas: [],
};
