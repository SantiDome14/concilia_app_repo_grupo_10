// ════════════════════════════════════════════════════════════════════
// Mock catalog · clp.clientes
// ────────────────────────────────────────────────────────────────────
// Client catalog consumed by the FIN.Movimientos `Asignar Cliente`
// lookup. Synthesized from every `cliente_id` referenced in the
// movimientos + quotes seed datasets so dropdown choices match the
// dataset's existing imputed-cliente values.
// ════════════════════════════════════════════════════════════════════

export interface Cliente {
  id: string;
  nombre: string;
  cuit?: string;
  email?: string;
}

export const CLIENTES: Cliente[] = [
  { id: 'cli-acme', nombre: 'ACME Corp', cuit: '30-71112233-4' },
  { id: 'cli-tecno-sa', nombre: 'Tecno SA', cuit: '30-71223344-5' },
  { id: 'cli-inversiones-norte', nombre: 'Inversiones Norte', cuit: '30-71334455-6' },
  { id: 'cli-grupo-sur', nombre: 'Grupo Sur', cuit: '30-71445566-7' },
  { id: 'cli-capital-plus', nombre: 'Capital Plus', cuit: '30-71556677-8' },
  { id: 'cli-mendoza-trading', nombre: 'Mendoza Trading', cuit: '30-71667788-9' },
  { id: 'cli-patagonia-fx', nombre: 'Patagonia FX', cuit: '30-71778899-0' },
  { id: 'cli-andes-capital', nombre: 'Andes Capital', cuit: '30-71889900-1' },
  { id: 'cli-costa-atlantica', nombre: 'Costa Atlántica SRL', cuit: '30-71990011-2' },
  { id: 'cli-litoral-inversiones', nombre: 'Litoral Inversiones', cuit: '30-72001122-3' },
];
