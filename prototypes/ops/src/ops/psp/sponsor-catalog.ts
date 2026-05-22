import type { BancoSponsor, SponsorCode } from './types';

// ════════════════════════════════════════════════════════════════════
// sponsor-catalog — open-set Banco Sponsor catalog per Decision 2.
//
// All three banco sponsors are now `active` per
// `refine-ops-psp-tab-aware-header-and-multi-sponsor`. COINAG has a
// real backend integration (balances + health); BIND and
// Banco de Comercio render structurally in the Posición tree and the
// Movimientos sponsor cards even before their integration ships. The
// UI degrades gracefully for sponsors without backend data (saldo
// `$0.00`, cuentas `0`, neutral `Sin integración` chip in the
// per-sponsor status slot).
//
// When the catalog graduates to a backend-driven `GET /sponsors`
// endpoint (see design.md Open question 1), this file becomes a
// fallback / cached copy. Every reference to a hardcoded `'COINAG'`
// outside this file is a spec violation.
// ════════════════════════════════════════════════════════════════════

/**
 * Canonical catalog. Order is the display order in the Posición tab
 * tree and in the Movimientos sponsor cards.
 */
export const SPONSOR_CATALOG: ReadonlyArray<BancoSponsor> = [
  {
    code: 'COINAG',
    label: 'COINAG',
    active: true,
    logo: '/icons/coinag-logo.png',
    tone: 'danger', // legacy associated red colour for Coinag
  },
  {
    code: 'BIND',
    label: 'BIND',
    active: true, // structurally listed; backend integration pending
    tone: 'info',
  },
  {
    code: 'BANCO_DE_COMERCIO',
    label: 'BANCO DE COMERCIO',
    active: true, // structurally listed; backend integration pending
    tone: 'brand',
  },
];

/** Returns the active sponsors in display order. */
export function activeSponsors(): BancoSponsor[] {
  return SPONSOR_CATALOG.filter((s) => s.active);
}

/** Look up a sponsor by its code; returns null if not found. */
export function getSponsorByCode(code: SponsorCode): BancoSponsor | null {
  return SPONSOR_CATALOG.find((s) => s.code === code) ?? null;
}

/** Convenience: human-readable label for a code, with fallback to the code. */
export function getSponsorLabel(code: SponsorCode | null | undefined): string {
  if (!code) return '—';
  const sponsor = getSponsorByCode(code);
  return sponsor?.label ?? code;
}

/** Returns true when the code matches a known active sponsor. */
export function isActiveSponsor(code: SponsorCode | null | undefined): boolean {
  if (!code) return false;
  const sponsor = getSponsorByCode(code);
  return Boolean(sponsor && sponsor.active);
}
