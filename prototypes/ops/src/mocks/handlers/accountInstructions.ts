// ════════════════════════════════════════════════════════════════════
// MSW handlers — account-instructions (ops-account-instructions)
// ────────────────────────────────────────────────────────────────────
// Backend surface for the per-client wizard that binds a template
// (`Instruction`) to a single `Account`:
//   GET  /rails                  — payment-rails catalog
//   POST /account-instruction    — create the binding
//
// The wizard's Step 1 (`GET /instruction`) and Step 2
// (`GET /instruction-attribute/instruction/:id`) are served by
// `handlers/instructions.ts` since they share the underlying paths.
//
// On `POST /account-instruction` the handler mutates the matching
// account in `clientsSeed` so the binding shows up immediately on the
// next `/clients/:id` refetch — keeping the optimistic-update UX
// honest end-to-end.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { apiPath, randomDelayMs } from '../util';
import { clientsSeed } from '../seed/clients';
import {
  attributesForInstruction,
  instructionsSeed,
  railsSeed,
} from '../seed/instructions';
import type {
  AccountInstruction,
  AccountInstructionField,
} from '@/ops/clients/types';
import type { AccountInstructionRequest } from '@/ops/account-instructions/types';

const RAILS = apiPath(ENDPOINTS.accountInstructions.rails);
const CREATE = apiPath(ENDPOINTS.accountInstructions.create);

let nextBindingSeq = 1;
function nextBindingId(): string {
  return `ai-new-${String(nextBindingSeq++).padStart(4, '0')}`;
}

export const accountInstructionHandlers: HttpHandler[] = [
  // GET /rails — catalog for the wizard Step 3 multi-select.
  http.get(RAILS, async () => {
    await delay(randomDelayMs());
    // Tolerated by the api module: bare array OR `{ rails: [...] }`.
    return HttpResponse.json({ rails: railsSeed });
  }),

  // POST /account-instruction — bind a template to a client account.
  http.post(CREATE, async ({ request }) => {
    await delay(randomDelayMs());
    const body = (await request.json()) as AccountInstructionRequest;

    if (!body?.instruction_id || !body?.account_id) {
      return HttpResponse.json(
        {
          error: 'validation_error',
          errors: [
            ...(!body?.instruction_id
              ? [{ field: 'instruction_id', message: 'Requerido' }]
              : []),
            ...(!body?.account_id
              ? [{ field: 'account_id', message: 'Requerido' }]
              : []),
          ],
        },
        { status: 400 },
      );
    }

    const template = instructionsSeed.find((i) => i.id === body.instruction_id);
    if (!template) {
      return HttpResponse.json(
        { message: 'Template no encontrado', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    // Surface the canonical `cvu-already-exists` discriminator the
    // modal expects — when an ARS account already carries a CVU binding
    // and the operator picks an ARS template, reject. (Sentinel: any
    // metadata value containing the literal `dup` triggers it.)
    const metadata = body.metadata ?? {};
    const hasDupSentinel = Object.values(metadata).some((v) =>
      String(v ?? '').toLowerCase().includes('dup'),
    );
    if (hasDupSentinel) {
      return HttpResponse.json(
        { error: 'cvu_already_exists' },
        { status: 409 },
      );
    }

    // Find the client owning this account and append the new binding.
    const client = clientsSeed.find((c) =>
      c.accounts.some((a) => a.id === body.account_id),
    );
    const account = client?.accounts.find((a) => a.id === body.account_id);
    if (!client || !account) {
      return HttpResponse.json(
        { message: 'Account no encontrado', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    // Project the template's attribute schema + user-submitted metadata
    // into the AccountInstruction.fields shape the detail page renders.
    const schema = attributesForInstruction(template.id);
    const fields: AccountInstructionField[] = schema.map((attr) => ({
      key: attr.key,
      display: attr.display,
      value: String(metadata[attr.key] ?? attr.default_value ?? ''),
    }));

    const rails = (body.rail_ids ?? [])
      .map((id) => railsSeed.find((r) => r.id === id)?.name)
      .filter((n): n is string => typeof n === 'string');

    const binding: AccountInstruction = {
      id: nextBindingId(),
      instruction_name: template.name,
      operations_provider_name: null,
      fields,
      rails,
    };
    account.instructions.push(binding);

    return HttpResponse.json({ ok: true, id: binding.id }, { status: 201 });
  }),
];
