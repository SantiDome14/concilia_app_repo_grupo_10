import { z } from 'zod';
import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  BankAccountRecord,
  CreateAccountPayload,
  CreateStructurePayload,
  Estructura,
  Sociedad,
  UpdateAccountPayload,
} from '@/ops/banks-accounts/types';

// ════════════════════════════════════════════════════════════════════
// ops-banks-accounts — API layer
// ────────────────────────────────────────────────────────────────────
// Implements the OPS-side endpoints:
//   GET    /banks-accounts                    → list catalog (full, no paging)
//   POST   /banks-accounts/structures         → create Estructura
//   POST   /banks-accounts                    → create Cuenta
//   PATCH  /banks-accounts/:id                → edit Cuenta (5 editable fields)
//
// Accounting metadata is owned by the upcoming `fin` app and is NOT
// exposed by this API surface.
//
// Errors propagate as `ApiError` per `core-api-layer` (the shared
// `apiClient` interceptor normalises every non-2xx into `ApiError`).
// Unknown enum values (`moneda`, `tipoCuenta`, `estructuraTipo`) are
// rejected at the schema boundary.
// ════════════════════════════════════════════════════════════════════

// ─── Zod schemas ────────────────────────────────────────────────────

const estructuraTipoSchema = z.enum([
  'Banco',
  'Banco digital',
  'ALyC',
  'Exchange',
  'Custodio',
  'PSP',
  'Proveedor',
]);

const cuentaTipoSchema = z.enum([
  'Cuenta Corriente',
  'CVU',
  'Wallet Pool',
  'Custodia',
  'Exchange Account',
  'Comitente',
]);

const monedaSchema = z.enum(['ARS', 'USD', 'USDC', 'USDT', 'BTC']);

const estadoCatalogoSchema = z.enum(['Activa', 'Inactiva']);

const bankAccountRecordSchema = z.object({
  id: z.string(),
  sociedad: z.string(),
  estructura: z.string(),
  estructuraTipo: estructuraTipoSchema,
  tipoCuenta: cuentaTipoSchema,
  moneda: monedaSchema,
  nro: z.string(),
  cuentaPadreLabel: z.string().nullable().optional(),
  padreCuentaId: z.string().nullable().optional(),
  status: estadoCatalogoSchema,
});

const bankAccountListSchema = z.array(bankAccountRecordSchema);

const sociedadSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: estadoCatalogoSchema,
});

const estructuraSchema = z.object({
  id: z.string(),
  name: z.string(),
  tipo: estructuraTipoSchema,
  status: estadoCatalogoSchema,
});

const sociedadListSchema = z.array(sociedadSchema);
const estructuraListSchema = z.array(estructuraSchema);

const createStructurePayloadSchema = z.object({
  name: z.string().min(1),
  tipo: estructuraTipoSchema,
});

const createAccountPayloadSchema = z.object({
  sociedadId: z.string().min(1),
  estructuraId: z.string().min(1),
  tipoCuenta: cuentaTipoSchema,
  moneda: monedaSchema,
  nro: z.string().min(1),
  padreCuentaId: z.string().nullable().optional(),
});

// Every field optional so single-field PATCH operations (Activar /
// Desactivar from the manifest engine sends `{ status }` only) round-
// trip through the same endpoint as the full-form Edit.
const updateAccountPayloadSchema = z.object({
  tipoCuenta: cuentaTipoSchema.optional(),
  moneda: monedaSchema.optional(),
  nro: z.string().min(1).optional(),
  padreCuentaId: z.string().nullable().optional(),
  status: estadoCatalogoSchema.optional(),
});

// ─── Public schema exports (used by tests + form validators) ────────

export const schemas = {
  estructuraTipo: estructuraTipoSchema,
  cuentaTipo: cuentaTipoSchema,
  moneda: monedaSchema,
  estadoCatalogo: estadoCatalogoSchema,
  bankAccountRecord: bankAccountRecordSchema,
  bankAccountList: bankAccountListSchema,
  createStructurePayload: createStructurePayloadSchema,
  createAccountPayload: createAccountPayloadSchema,
  updateAccountPayload: updateAccountPayloadSchema,
} as const;

// ─── API functions ──────────────────────────────────────────────────

/** GET /banks-accounts — full catalog, client-side paged via `useTable`. */
export async function fetchBanksAccounts(): Promise<BankAccountRecord[]> {
  const response = await apiClient.get<unknown>(ENDPOINTS.banksAccounts.list);
  return bankAccountListSchema.parse(response.data);
}

/** GET /banks-accounts/sociedades — catalog of legal entities (used by Crear Cuenta). */
export async function fetchSociedades(): Promise<Sociedad[]> {
  const response = await apiClient.get<unknown>(ENDPOINTS.banksAccounts.sociedades);
  return sociedadListSchema.parse(response.data);
}

/** GET /banks-accounts/structures — catalog of structures (used by Crear Cuenta). */
export async function fetchEstructuras(): Promise<Estructura[]> {
  const response = await apiClient.get<unknown>(ENDPOINTS.banksAccounts.structures);
  return estructuraListSchema.parse(response.data);
}

/** POST /banks-accounts/structures — create a new Estructura. */
export async function createStructure(payload: CreateStructurePayload): Promise<Estructura> {
  const body = createStructurePayloadSchema.parse(payload);
  const response = await apiClient.post<unknown>(ENDPOINTS.banksAccounts.createStructure, body);
  return estructuraSchema.parse(response.data);
}

/** POST /banks-accounts — create a new Cuenta. */
export async function createAccount(payload: CreateAccountPayload): Promise<BankAccountRecord> {
  const body = createAccountPayloadSchema.parse(payload);
  const response = await apiClient.post<unknown>(ENDPOINTS.banksAccounts.createAccount, body);
  return bankAccountRecordSchema.parse(response.data);
}

/** PATCH /banks-accounts/:id — edit the 5 mutable fields of an existing Cuenta. */
export async function updateAccount(
  id: string,
  payload: UpdateAccountPayload,
): Promise<BankAccountRecord> {
  const body = updateAccountPayloadSchema.parse(payload);
  const response = await apiClient.patch<unknown>(
    ENDPOINTS.banksAccounts.updateAccount(id),
    body,
  );
  return bankAccountRecordSchema.parse(response.data);
}
