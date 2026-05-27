// ════════════════════════════════════════════════════════════════════
// TRD — Currencies catalog (open-set per MIGRATION-NOTES §14)
// ────────────────────────────────────────────────────────────────────
// Open-set from day one: the production list grows whenever the desk
// onboards a new currency. Six entries today (ARS / USD / EUR / USDC
// / USDT / BTC) mirror the legacy `KnownCurrencyCode` enum.
//
// `type` drives downstream behavior (decimal precision, FX-rate
// provider routing) — kept as a closed union (FIAT / CRYPTO / FUND)
// per the legacy.
// ════════════════════════════════════════════════════════════════════

export type CurrencyType = 'FIAT' | 'CRYPTO' | 'FUND';

export interface CurrencyCatalogEntry {
  code: string;
  name: string;
  symbol: string;
  type: CurrencyType;
  /** Display precision; the underlying values are decimal strings. */
  decimals: number;
}

export const CURRENCIES_CATALOG: CurrencyCatalogEntry[] = [
  { code: 'ARS',  name: 'Peso argentino',  symbol: '$',  type: 'FIAT',   decimals: 0 },
  { code: 'USD',  name: 'Dólar US',        symbol: 'US$', type: 'FIAT',   decimals: 2 },
  { code: 'EUR',  name: 'Euro',            symbol: '€',  type: 'FIAT',   decimals: 2 },
  { code: 'USDC', name: 'USD Coin',        symbol: 'USDC', type: 'CRYPTO', decimals: 2 },
  { code: 'USDT', name: 'Tether',          symbol: 'USDT', type: 'CRYPTO', decimals: 2 },
  { code: 'BTC',  name: 'Bitcoin',         symbol: '₿',  type: 'CRYPTO', decimals: 8 },
];

/** Lookup helper. Returns undefined when the code is unknown. */
export function findCurrency(code: string): CurrencyCatalogEntry | undefined {
  return CURRENCIES_CATALOG.find((c) => c.code === code);
}
