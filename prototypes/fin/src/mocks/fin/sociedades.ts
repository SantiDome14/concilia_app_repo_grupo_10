// ════════════════════════════════════════════════════════════════════
// Mock catalog · framework.sociedades
// ────────────────────────────────────────────────────────────────────
// Ardua group entities. Synthesized from `POS_TREE` in the legacy FIN
// prototype (`prototypes/fin-old/fin-prototype.html` line 3689) so the
// FIN.Movimientos manifest's `Asignar Estructura` lookup resolves
// against a realistic catalog.
// ════════════════════════════════════════════════════════════════════

import type { Sociedad } from '@/types/fin';

export const SOCIEDADES: Sociedad[] = [
  { id: 'hp', nombre: 'Haz Pagos', cuit: '30-71234567-8', sub: 'PSP · Argentina · ARS' },
  {
    id: 'cp',
    nombre: 'Circuit Pay',
    cuit: '30-72345678-9',
    sub: 'PSAV · Argentina · USDC/USDT',
  },
  {
    id: 'asc',
    nombre: 'Ardua Solutions Corp',
    cuit: '30-73456789-0',
    sub: 'Holding · Delaware · USD',
  },
  {
    id: 'av',
    nombre: 'Astra Ventures',
    cuit: '30-74567890-1',
    sub: 'Trading · Argentina · MULTI',
  },
];
