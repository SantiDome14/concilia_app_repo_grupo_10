import type { BancoSponsor, SponsorCode } from './types';

// ════════════════════════════════════════════════════════════════════
// sponsor-catalog — open-set Banco Sponsor catalog per Decision 2.
//
// Today: Coinag active. Roadmap: BIND + Banco de Comercio. Adding a
// new sponsor = one entry here; no other code changes (the rest of
// the codebase loops over `activeSponsors()`).
//
// When the catalog graduates to a backend-driven `GET /sponsors`
// endpoint (see design.md Open question 1), this file becomes a
// fallback / cached copy. Every reference to a hardcoded `'COINAG'`
// outside this file is a spec violation.
// ════════════════════════════════════════════════════════════════════

/**
 * Canonical catalog. Order is the display order in the
 * Disponibilidad tab cards row and in the Movimientos sponsor cards.
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
    active: false, // roadmap
    tone: 'info',
  },
  {
    code: 'BANCO_DE_COMERCIO',
    label: 'Banco de Comercio',
    active: false, // roadmap
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
