// ════════════════════════════════════════════════════════════════════
// Mock catalog · framework.sociedades
// ────────────────────────────────────────────────────────────────────
// Ardua group entities. Synthesized from `POS_TREE` in the legacy FIN
// prototype (`prototypes/fin-old/fin-prototype.html` line 3689) so the
// FIN.Movimientos manifest's `Asignar Estructura` lookup resolves
// against a realistic catalog.
// ════════════════════════════════════════════════════════════════════

import type { Sociedad } from '@/types/fin';

// Nombres + sub-titles aligned with `prototypes/ops/ops-acciones-prototype.html`
// (the OPS module is the upstream source of truth for Sociedad identity).
export const SOCIEDADES: Sociedad[] = [
  { id: 'cp', nombre: 'Circuit Pay SA', cuit: '30-72345678-9', sub: 'PSAV · Argentina' },
  { id: 'hp', nombre: 'Haz Pagos SA', cuit: '30-71234567-8', sub: 'PSP · Argentina' },
  { id: 'asc', nombre: 'Ardua Solutions Corp', cuit: '30-73456789-0', sub: 'MSB · Canadá' },
  { id: 'av', nombre: 'Astra Ventures', cuit: '30-74567890-1', sub: 'VASP · Polonia' },
];
