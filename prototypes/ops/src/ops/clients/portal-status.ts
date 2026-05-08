import type { Client, PortalStatus, PortalStatusTone } from './types';

// ════════════════════════════════════════════════════════════════════
// portal-status — single source of truth for the Estado Portal column
// ────────────────────────────────────────────────────────────────────
// Implements `ops-clients` Requirement 5 (per design.md Decision 2).
// Pure function, no Vue / no axios — testable in isolation. Every
// surface that needs the status (master list cell, detail page header,
// future filters, future CSV export) MUST call this helper rather
// than duplicate the switch.
// ════════════════════════════════════════════════════════════════════

export interface PortalStatusInfo {
  key: PortalStatus;
  label: string;
  tone: PortalStatusTone;
}

const STATUS_MAP: Record<PortalStatus, { label: string; tone: PortalStatusTone }> = {
  active: { label: 'Cuenta Validada', tone: 'success' },
  pending: { label: 'Pendiente de Validación', tone: 'warning' },
  'not-created': { label: 'Cuenta no Creada', tone: 'danger' },
};

/**
 * Derive the canonical Estado Portal info for a client.
 *
 * Mapping:
 *   - `metadata.status === 'ACTIVE'`  → `active`
 *   - `metadata.status === 'PENDING'` → `pending`
 *   - missing / empty / unknown       → `not-created`
 *
 * `not-created` is the safe default — surfacing an unknown status as
 * red signals to the operator that the portal user has not been set
 * up, which is the assumption the legacy made.
 */
export function derivePortalStatus(client: Pick<Client, 'metadata'>): PortalStatusInfo {
  const raw = client.metadata?.status;
  if (raw === 'ACTIVE') {
    return { key: 'active', ...STATUS_MAP.active };
  }
  if (raw === 'PENDING') {
    return { key: 'pending', ...STATUS_MAP.pending };
  }
  return { key: 'not-created', ...STATUS_MAP['not-created'] };
}
