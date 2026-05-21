// ════════════════════════════════════════════════════════════════════
// MSW handlers — instructions (ops-instructions capability)
// ────────────────────────────────────────────────────────────────────
// Backend surface for the template editor at /settings/instructions:
//   GET    /instruction                                — list + filter + paginate
//   GET    /instruction/:id                            — detail (record only)
//   POST   /instruction                                — phase A of two-phase save
//   PUT    /instruction/:id                            — phase A of update
//   DELETE /instruction/:id                            — delete with cascade
//   GET    /instruction-attribute/instruction/:id      — schema attributes
//   POST   /instruction-attribute/save-all             — phase B of two-phase save
//
// The same `/instruction` and `/instruction-attribute/instruction/:id`
// endpoints are also consumed by the account-instructions wizard
// (`handlers/accountInstructions.ts`); the seed in `seed/instructions.ts`
// is the shared source of truth — registering this handler array first
// in `handlers/index.ts` lets the wizard handler stay focused on the
// `/rails` and `/account-instruction` paths.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { apiPath, randomDelayMs } from '../util';
import {
  attributesForInstruction,
  attributesSeed,
  instructionsSeed,
  toInstructionAttribute,
  type SeedAttribute,
} from '../seed/instructions';
import type { Instruction } from '@/ops/instructions/types';

const LIST = apiPath(ENDPOINTS.instructions.list);
const DETAIL = apiPath(ENDPOINTS.instructions.detail(':id'));
const ATTRIBUTES = apiPath(ENDPOINTS.instructions.attributes(':id'));
const SAVE_ATTRIBUTES = apiPath(ENDPOINTS.instructions.saveAttributes);

interface SaveAttributesBody {
  instruction_id?: string;
  attributes?: Array<Omit<SeedAttribute, 'id' | 'display' | 'default_value'>>;
}

interface UpsertBody {
  name?: string;
  currency_id?: string;
  description?: string | null;
}

let nextTemplateSeq = 1;
let nextAttrSeq = 1;

function nextTemplateId(): string {
  return `tpl-new-${String(nextTemplateSeq++).padStart(4, '0')}`;
}
function nextAttrId(): string {
  return `attr-new-${String(nextAttrSeq++).padStart(4, '0')}`;
}

export const instructionHandlers: HttpHandler[] = [
  // GET /instruction — list + filter + paginate. Returns the canonical
  // `PaginatedResponse<Instruction>` envelope (`{ data, pagination: {
  // page, pageSize, total, totalPages } }`) expected by the
  // instructions editor. The account-instructions wizard tolerates the
  // same envelope by unwrapping `body.data`.
  http.get(LIST, async ({ request }) => {
    await delay(randomDelayMs());
    const url = new URL(request.url);
    const name = url.searchParams.get('name')?.toLowerCase() ?? '';
    const currencyId = url.searchParams.get('currency_id') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25');

    const filtered = instructionsSeed.filter((i) => {
      if (name && !i.name.toLowerCase().includes(name)) return false;
      if (currencyId && i.currency_id !== currencyId) return false;
      return true;
    });

    const start = Math.max(0, (page - 1) * pageSize);
    const window = filtered.slice(start, start + pageSize);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    return HttpResponse.json({
      data: window,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages,
      },
    });
  }),

  // GET /instruction-attribute/instruction/:id — must register BEFORE
  // the `/instruction/:id` catch-all so the `/instruction-attribute/...`
  // path doesn't get swallowed by the detail handler.
  http.get(ATTRIBUTES, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    return HttpResponse.json(attributesForInstruction(id).map(toInstructionAttribute));
  }),

  // POST /instruction-attribute/save-all — replace the attribute set
  // for a single instruction (phase B of the two-phase save).
  http.post(SAVE_ATTRIBUTES, async ({ request }) => {
    await delay(randomDelayMs());
    const body = (await request.json()) as SaveAttributesBody;
    const instructionId = body?.instruction_id;
    if (!instructionId) {
      return HttpResponse.json(
        { message: 'instruction_id requerido', code: 'VALIDATION' },
        { status: 400 },
      );
    }
    const incoming = body.attributes ?? [];
    // Drop the existing rows for this instruction, then re-append.
    for (let i = attributesSeed.length - 1; i >= 0; i--) {
      if (attributesSeed[i]?.instruction_id === instructionId) {
        attributesSeed.splice(i, 1);
      }
    }
    const persisted: SeedAttribute[] = incoming.map((row, idx) => ({
      id: nextAttrId(),
      instruction_id: instructionId,
      key: row.key,
      display: humanise(row.key),
      default_value: row.value,
      value: row.value,
      index_order: row.index_order ?? idx,
    }));
    attributesSeed.push(...persisted);
    // Refresh the cached count on the parent record so the next
    // /instruction list refetch reflects the new total.
    const parent = instructionsSeed.find((i) => i.id === instructionId);
    if (parent) {
      parent.attributes_count = persisted.length;
      parent.updated_at = new Date().toISOString();
    }
    return HttpResponse.json(persisted.map(toInstructionAttribute));
  }),

  // GET /instruction/:id — single template (record only).
  http.get(DETAIL, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const record = instructionsSeed.find((i) => i.id === id);
    if (!record) {
      return HttpResponse.json(
        { message: 'Instruction no encontrada', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return HttpResponse.json(record);
  }),

  // POST /instruction — create a new template (phase A).
  http.post(LIST, async ({ request }) => {
    await delay(randomDelayMs());
    const body = (await request.json()) as UpsertBody;
    const name = (body?.name ?? '').trim();
    const currencyId = body?.currency_id ?? '';
    if (!name) {
      return HttpResponse.json(
        { message: 'name requerido', code: 'VALIDATION', field: 'name' },
        { status: 400 },
      );
    }
    if (!currencyId) {
      return HttpResponse.json(
        { message: 'currency_id requerido', code: 'VALIDATION', field: 'currency_id' },
        { status: 400 },
      );
    }
    const stamp = new Date().toISOString();
    const created: Instruction = {
      id: nextTemplateId(),
      name,
      currency_id: currencyId,
      description: body?.description ?? null,
      created_at: stamp,
      updated_at: stamp,
      attributes_count: 0,
    };
    instructionsSeed.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  // PUT /instruction/:id — update the record (phase A of edit flow).
  http.put(DETAIL, async ({ params, request }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const record = instructionsSeed.find((i) => i.id === id);
    if (!record) {
      return HttpResponse.json(
        { message: 'Instruction no encontrada', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as UpsertBody;
    if (typeof body?.name === 'string') record.name = body.name;
    if (typeof body?.currency_id === 'string') record.currency_id = body.currency_id;
    if ('description' in (body ?? {})) record.description = body?.description ?? null;
    record.updated_at = new Date().toISOString();
    return HttpResponse.json(record);
  }),

  // DELETE /instruction/:id — remove the record and cascade attributes.
  http.delete(DETAIL, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const idx = instructionsSeed.findIndex((i) => i.id === id);
    if (idx === -1) {
      return HttpResponse.json(
        { message: 'Instruction no encontrada', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    instructionsSeed.splice(idx, 1);
    for (let i = attributesSeed.length - 1; i >= 0; i--) {
      if (attributesSeed[i]?.instruction_id === id) {
        attributesSeed.splice(i, 1);
      }
    }
    return new HttpResponse(null, { status: 204 });
  }),
];

// snake_case → "Title Case" — used when the editor doesn't supply a
// `display` for a freshly-saved attribute row.
function humanise(key: string): string {
  return key
    .split('_')
    .map((p) => (p.length > 0 ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ');
}
