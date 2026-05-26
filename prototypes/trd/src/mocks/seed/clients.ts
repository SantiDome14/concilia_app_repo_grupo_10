// ════════════════════════════════════════════════════════════════════
// MSW seed — TRD / Clientes
// ────────────────────────────────────────────────────────────────────
// 32 clients covering active/inactive, with/without circuit docket,
// with/without limits and balances. The seed is mutable: handlers
// modify these arrays in-memory so CRUD round-trips are observable.
// `resetClientsSeed()` restores the canonical state for tests.
// ════════════════════════════════════════════════════════════════════

import type { Client, ClientBalance, ClientLimit } from '@/types/client';

// ────────────────────────────────────────────────────────────────────
// Clients
// ────────────────────────────────────────────────────────────────────

const initialClients: Client[] = [
  { id: 'cl_001', name: 'ACME S.A.',                     ardua_docket: '21548',  circuit_docket: 'CP-21548',  is_active: true  },
  { id: 'cl_002', name: 'Banco del Sur',                 ardua_docket: '20193',  circuit_docket: 'CP-20193',  is_active: true  },
  { id: 'cl_003', name: 'Bolsa Patagónica',              ardua_docket: '22841',  circuit_docket: 'CP-22841',  is_active: true  },
  { id: 'cl_004', name: 'Cooperativa La Esperanza',      ardua_docket: '23105',  circuit_docket: null,        is_active: true  },
  { id: 'cl_005', name: 'Crypto Pampa',                  ardua_docket: '23890',  circuit_docket: 'CP-23890',  is_active: true  },
  { id: 'cl_006', name: 'Desarrolladora Andina',         ardua_docket: '24007',  circuit_docket: 'CP-24007',  is_active: true  },
  { id: 'cl_007', name: 'Editorial Río de la Plata',     ardua_docket: '24213',  circuit_docket: null,        is_active: true  },
  { id: 'cl_008', name: 'Estancia Los Robles',           ardua_docket: '24450',  circuit_docket: 'CP-24450',  is_active: false },
  { id: 'cl_009', name: 'Federación Vinícola',           ardua_docket: '24612',  circuit_docket: 'CP-24612',  is_active: true  },
  { id: 'cl_010', name: 'Frigorífico Litoral',           ardua_docket: '24905',  circuit_docket: 'CP-24905',  is_active: true  },
  { id: 'cl_011', name: 'Galería Centro',                ardua_docket: '25112',  circuit_docket: null,        is_active: true  },
  { id: 'cl_012', name: 'Grupo Inversor Norte',          ardua_docket: '25278',  circuit_docket: 'CP-25278',  is_active: true  },
  { id: 'cl_013', name: 'Hospital Privado Quilmes',      ardua_docket: '25440',  circuit_docket: 'CP-25440',  is_active: true  },
  { id: 'cl_014', name: 'Importadora Pacífico',          ardua_docket: '25612',  circuit_docket: 'CP-25612',  is_active: false },
  { id: 'cl_015', name: 'Industrias Mendocinas',         ardua_docket: '25789',  circuit_docket: 'CP-25789',  is_active: true  },
  { id: 'cl_016', name: 'Jugos del Valle',               ardua_docket: '25932',  circuit_docket: null,        is_active: true  },
  { id: 'cl_017', name: 'Laboratorios Aconcagua',        ardua_docket: '26101',  circuit_docket: 'CP-26101',  is_active: true  },
  { id: 'cl_018', name: 'Logística Pampa Húmeda',        ardua_docket: '26278',  circuit_docket: 'CP-26278',  is_active: true  },
  { id: 'cl_019', name: 'Maderera del Litoral',          ardua_docket: '26414',  circuit_docket: 'CP-26414',  is_active: false },
  { id: 'cl_020', name: 'Mercado Pyme',                  ardua_docket: '26607',  circuit_docket: 'CP-26607',  is_active: true  },
  { id: 'cl_021', name: 'Nautilus Logistics',            ardua_docket: '26801',  circuit_docket: 'CP-26801',  is_active: true  },
  { id: 'cl_022', name: 'Oficinas Centro',               ardua_docket: '26945',  circuit_docket: null,        is_active: true  },
  { id: 'cl_023', name: 'Productores Vitivinícolas',     ardua_docket: '27108',  circuit_docket: 'CP-27108',  is_active: true  },
  { id: 'cl_024', name: 'Química del Sur',               ardua_docket: '27302',  circuit_docket: 'CP-27302',  is_active: true  },
  { id: 'cl_025', name: 'Refinería del Litoral',         ardua_docket: '27490',  circuit_docket: 'CP-27490',  is_active: false },
  { id: 'cl_026', name: 'Seguros Atlántida',             ardua_docket: '27654',  circuit_docket: 'CP-27654',  is_active: true  },
  { id: 'cl_027', name: 'Tecnológica Patagonia',         ardua_docket: '27890',  circuit_docket: 'CP-27890',  is_active: true  },
  { id: 'cl_028', name: 'Tequila Co.',                   ardua_docket: '11243-ACME-INVOICE', circuit_docket: null, is_active: true },
  { id: 'cl_029', name: 'Textiles Ribera',               ardua_docket: '28045',  circuit_docket: null,        is_active: true  },
  { id: 'cl_030', name: 'Unión Cerealera',               ardua_docket: '28201',  circuit_docket: 'CP-28201',  is_active: true  },
  { id: 'cl_031', name: 'Viñedos del Plata',             ardua_docket: '28412',  circuit_docket: 'CP-28412',  is_active: true  },
  { id: 'cl_032', name: 'Zinc & Hierro SRL',             ardua_docket: '28599',  circuit_docket: 'CP-28599',  is_active: true  },
];

// Limits keyed by client id. Clients with no entry surface the
// EmptyState; clients with `[]` also surface EmptyState (no
// configured limits).
const initialLimits: Record<string, ClientLimit[]> = {
  cl_001: [
    { id: 'lim_001_01', entidad: 'Haz Pagos',     moneda: 'ARS',  limite: '50.000.000',  disponible: '32.500.000', usado: '17.500.000' },
    { id: 'lim_001_02', entidad: 'Haz Pagos',     moneda: 'USD',  limite: '120.000',     disponible: '78.000',     usado: '42.000' },
    { id: 'lim_001_03', entidad: 'Circuit Pay',   moneda: 'USDC', limite: '250.000',     disponible: '180.000',    usado: '70.000' },
  ],
  cl_002: [
    { id: 'lim_002_01', entidad: 'Haz Pagos',     moneda: 'ARS',  limite: '120.000.000', disponible: '85.000.000', usado: '35.000.000' },
    { id: 'lim_002_02', entidad: 'Haz Pagos',     moneda: 'USD',  limite: '500.000',     disponible: '400.000',    usado: '100.000' },
  ],
  cl_003: [{ id: 'lim_003_01', entidad: 'Circuit Pay', moneda: 'USDT', limite: '180.000', disponible: '180.000', usado: '0' }],
  cl_004: [{ id: 'lim_004_01', entidad: 'Haz Pagos',   moneda: 'ARS',  limite: '15.000.000', disponible: '15.000.000', usado: '0' }],
  cl_005: [
    { id: 'lim_005_01', entidad: 'Circuit Pay',   moneda: 'USDC', limite: '300.000', disponible: '210.000', usado: '90.000' },
    { id: 'lim_005_02', entidad: 'Circuit Pay',   moneda: 'USDT', limite: '300.000', disponible: '260.000', usado: '40.000' },
  ],
  cl_006: [{ id: 'lim_006_01', entidad: 'Haz Pagos', moneda: 'ARS', limite: '8.000.000', disponible: '6.500.000', usado: '1.500.000' }],
  cl_009: [{ id: 'lim_009_01', entidad: 'Haz Pagos', moneda: 'ARS', limite: '22.000.000', disponible: '14.000.000', usado: '8.000.000' }],
  cl_010: [
    { id: 'lim_010_01', entidad: 'Haz Pagos',     moneda: 'ARS',  limite: '40.000.000', disponible: '40.000.000', usado: '0' },
    { id: 'lim_010_02', entidad: 'Haz Pagos',     moneda: 'USD',  limite: '90.000',     disponible: '90.000',     usado: '0' },
  ],
  cl_012: [{ id: 'lim_012_01', entidad: 'Haz Pagos', moneda: 'USD', limite: '250.000', disponible: '125.000', usado: '125.000' }],
  cl_013: [{ id: 'lim_013_01', entidad: 'Haz Pagos', moneda: 'ARS', limite: '18.000.000', disponible: '12.000.000', usado: '6.000.000' }],
  cl_015: [
    { id: 'lim_015_01', entidad: 'Haz Pagos',     moneda: 'ARS',  limite: '95.000.000', disponible: '70.000.000', usado: '25.000.000' },
    { id: 'lim_015_02', entidad: 'Circuit Pay',   moneda: 'USDC', limite: '120.000',    disponible: '95.000',     usado: '25.000' },
  ],
  cl_017: [{ id: 'lim_017_01', entidad: 'Haz Pagos', moneda: 'USD', limite: '200.000', disponible: '160.000', usado: '40.000' }],
  cl_018: [{ id: 'lim_018_01', entidad: 'Haz Pagos', moneda: 'ARS', limite: '30.000.000', disponible: '22.000.000', usado: '8.000.000' }],
  cl_020: [{ id: 'lim_020_01', entidad: 'Haz Pagos', moneda: 'ARS', limite: '6.000.000', disponible: '4.500.000', usado: '1.500.000' }],
  cl_021: [{ id: 'lim_021_01', entidad: 'Circuit Pay', moneda: 'USDT', limite: '90.000', disponible: '60.000', usado: '30.000' }],
  cl_023: [{ id: 'lim_023_01', entidad: 'Haz Pagos', moneda: 'ARS', limite: '50.000.000', disponible: '50.000.000', usado: '0' }],
  cl_024: [{ id: 'lim_024_01', entidad: 'Haz Pagos', moneda: 'USD', limite: '150.000', disponible: '110.000', usado: '40.000' }],
  cl_026: [
    { id: 'lim_026_01', entidad: 'Haz Pagos',     moneda: 'ARS',  limite: '80.000.000', disponible: '65.000.000', usado: '15.000.000' },
    { id: 'lim_026_02', entidad: 'Circuit Pay',   moneda: 'USDC', limite: '100.000',    disponible: '85.000',     usado: '15.000' },
  ],
  cl_027: [{ id: 'lim_027_01', entidad: 'Haz Pagos', moneda: 'USD', limite: '180.000', disponible: '180.000', usado: '0' }],
  cl_030: [{ id: 'lim_030_01', entidad: 'Haz Pagos', moneda: 'ARS', limite: '45.000.000', disponible: '36.000.000', usado: '9.000.000' }],
  cl_031: [{ id: 'lim_031_01', entidad: 'Circuit Pay', moneda: 'USDC', limite: '70.000', disponible: '60.000', usado: '10.000' }],
};

// Balances keyed by client id.
const initialBalances: Record<string, ClientBalance[]> = {
  cl_001: [
    { moneda: 'ARS',  balance: '12.500.000', updated_at: '2026-05-25T18:30:00Z' },
    { moneda: 'USD',  balance: '32.000',     updated_at: '2026-05-25T18:30:00Z' },
    { moneda: 'USDC', balance: '50.000',     updated_at: '2026-05-26T09:15:00Z' },
  ],
  cl_002: [
    { moneda: 'ARS', balance: '55.000.000', updated_at: '2026-05-26T11:00:00Z' },
    { moneda: 'USD', balance: '180.000',    updated_at: '2026-05-26T11:00:00Z' },
  ],
  cl_003: [{ moneda: 'USDT', balance: '120.000', updated_at: '2026-05-26T08:45:00Z' }],
  cl_005: [
    { moneda: 'USDC', balance: '90.000', updated_at: '2026-05-26T10:20:00Z' },
    { moneda: 'USDT', balance: '40.000', updated_at: '2026-05-26T10:20:00Z' },
  ],
  cl_006: [{ moneda: 'ARS', balance: '4.200.000', updated_at: '2026-05-25T17:00:00Z' }],
  cl_009: [{ moneda: 'ARS', balance: '8.500.000', updated_at: '2026-05-26T07:30:00Z' }],
  cl_010: [
    { moneda: 'ARS', balance: '32.000.000', updated_at: '2026-05-26T09:00:00Z' },
    { moneda: 'USD', balance: '65.000',     updated_at: '2026-05-26T09:00:00Z' },
  ],
  cl_012: [{ moneda: 'USD', balance: '88.000', updated_at: '2026-05-26T12:15:00Z' }],
  cl_013: [{ moneda: 'ARS', balance: '9.800.000', updated_at: '2026-05-25T16:45:00Z' }],
  cl_015: [
    { moneda: 'ARS',  balance: '48.000.000', updated_at: '2026-05-26T08:00:00Z' },
    { moneda: 'USDC', balance: '72.000',     updated_at: '2026-05-26T08:00:00Z' },
  ],
  cl_017: [{ moneda: 'USD', balance: '105.000', updated_at: '2026-05-26T13:30:00Z' }],
  cl_018: [{ moneda: 'ARS', balance: '14.500.000', updated_at: '2026-05-26T10:00:00Z' }],
  cl_020: [{ moneda: 'ARS', balance: '2.800.000', updated_at: '2026-05-25T19:00:00Z' }],
  cl_021: [{ moneda: 'USDT', balance: '36.000', updated_at: '2026-05-26T11:45:00Z' }],
  cl_023: [{ moneda: 'ARS', balance: '38.000.000', updated_at: '2026-05-26T09:30:00Z' }],
  cl_024: [{ moneda: 'USD', balance: '72.000', updated_at: '2026-05-26T14:00:00Z' }],
  cl_026: [
    { moneda: 'ARS',  balance: '52.000.000', updated_at: '2026-05-26T10:15:00Z' },
    { moneda: 'USDC', balance: '58.000',     updated_at: '2026-05-26T10:15:00Z' },
  ],
  cl_027: [{ moneda: 'USD', balance: '120.000', updated_at: '2026-05-26T15:00:00Z' }],
  cl_028: [{ moneda: 'USD', balance: '8.000',   updated_at: '2026-05-25T20:30:00Z' }],
  cl_030: [{ moneda: 'ARS', balance: '28.500.000', updated_at: '2026-05-26T11:30:00Z' }],
  cl_031: [{ moneda: 'USDC', balance: '42.000', updated_at: '2026-05-26T12:00:00Z' }],
};

// Mutable references — handlers update these in place.
export let clientsSeed: Client[] = structuredClone(initialClients);
export let clientLimitsSeed: Record<string, ClientLimit[]> = structuredClone(initialLimits);
export let clientBalancesSeed: Record<string, ClientBalance[]> = structuredClone(initialBalances);

/** Restore the canonical seed state (used by tests + the reset helper). */
export function resetClientsSeed(): void {
  clientsSeed = structuredClone(initialClients);
  clientLimitsSeed = structuredClone(initialLimits);
  clientBalancesSeed = structuredClone(initialBalances);
}
