// ════════════════════════════════════════════════════════════════════
// TRD — Price Alert (price-trigger trading rule) domain types
// ────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN de reglas que disparan cuando un activo cruza un
// umbral. NO es un inbox de notificaciones (eso es el módulo
// cross-cutting /alertas del template, regido por core-modulo-genericos).
//
// El legacy `core-trd-frontend/src/pages/Alerts.tsx` (162 LOC) maneja
// estas reglas — apuntan a un backend separado (`VITE_TRADING_API_BASE_URL`,
// Lambda/AWS). En el prototype MSW intercepta todo via un solo
// apiClient — Decision A (§15) se materializa como "single client
// + per-module base-URL" cuando se promueva al backend real.
// ════════════════════════════════════════════════════════════════════

export type PriceAlertSide = 'BUY' | 'SELL';

export interface PriceAlert {
  id: string;
  /** Human-readable name (e.g. "USDT/ARS > 1000"). */
  name: string;
  side: PriceAlertSide;
  /** Decimal string — preserves precision across the wire. */
  cost_price: string;
  /** Decimal string — the trigger threshold. */
  limit_price: string;
  /** Decimal string — volume to monitor at the trigger. */
  volume: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Body for POST /alerts — id, timestamps, active default to server side. */
export interface CreatePriceAlertPayload {
  name: string;
  side: PriceAlertSide;
  cost_price: string;
  limit_price: string;
  volume: string;
}

/** Body for PATCH /alerts/:id — every field optional (partial update). */
export interface UpdatePriceAlertPayload {
  name?: string;
  side?: PriceAlertSide;
  cost_price?: string;
  limit_price?: string;
  volume?: string;
  active?: boolean;
}
