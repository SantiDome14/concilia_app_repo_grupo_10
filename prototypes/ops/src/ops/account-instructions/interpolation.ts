import type { Client } from '@/ops/clients/types';
import type { InstructionTemplate, TemplateAttribute } from './types';

// ════════════════════════════════════════════════════════════════════
// interpolation — pure helpers for Decision 5.
//
// Two transformations applied when hydrating a template's attribute
// values on entry to step 2 of the wizard:
//
//   1. interpolateClientVariables — replace {docket}, {name},
//      {tax_number} placeholders in default values with the client's
//      data; missing fields become empty strings (NOT left literal).
//
//   2. applySwiftReferenceRule — when the template's rail (uppercased)
//      matches one of `['SWIFT', 'ACH', 'FEDWIRE', 'SEPA',
//      'ACH & FEDWIRE']`, the attribute whose `key` substring-matches
//      'reference' (first match wins) gets its value REPLACED with
//      `${interpolated_default}${client.docket}${client.name}`.
//
// Both pure, both Vitest-tested in isolation.
// ════════════════════════════════════════════════════════════════════

/** Set of rails that trigger the reference-field rule. */
export const SWIFT_RULE_RAILS = [
  'SWIFT',
  'ACH',
  'FEDWIRE',
  'SEPA',
  'ACH & FEDWIRE',
] as const;

type SwiftRailMatcher = (typeof SWIFT_RULE_RAILS)[number];

/**
 * Replace `{docket}`, `{name}`, and `{tax_number}` substrings in
 * `value` with the client's corresponding fields. Missing fields
 * become an empty string. Non-matching placeholders are left literal.
 */
export function interpolateClientVariables(
  value: string | undefined | null,
  client: Pick<Client, 'docket' | 'name' | 'tax_number'>,
): string {
  if (!value) return '';
  const variables: Record<string, string> = {
    docket: client.docket ?? '',
    name: client.name ?? '',
    tax_number: client.tax_number ?? '',
  };
  return value.replace(/\{(docket|name|tax_number)\}/g, (_match, key: string) => {
    const v = variables[key];
    return v ?? '';
  });
}

/**
 * Test whether a template's rail is in the SWIFT-rule trigger set.
 * The match is case-insensitive substring (per the legacy semantic:
 * `railName.includes('SWIFT')` etc).
 */
export function isSwiftRuleRail(template: Pick<InstructionTemplate, 'rail_name' | 'rail_id'>): boolean {
  const raw = (template.rail_name ?? template.rail_id ?? '').toUpperCase();
  return SWIFT_RULE_RAILS.some((r: SwiftRailMatcher) => raw.includes(r));
}

/**
 * Apply the SWIFT-rail reference-field rule to a values map.
 *
 * - Returns a NEW object (does not mutate `values`).
 * - When the rail does NOT trigger the rule, returns `values` unchanged.
 * - When the rule triggers but no attribute key contains "reference"
 *   (case-insensitive), returns `values` unchanged.
 */
export function applySwiftReferenceRule(
  values: Record<string, string>,
  attributes: TemplateAttribute[],
  template: Pick<InstructionTemplate, 'rail_name' | 'rail_id'>,
  client: Pick<Client, 'docket' | 'name'>,
): Record<string, string> {
  if (!isSwiftRuleRail(template)) return { ...values };
  const referenceAttr = attributes.find((a) => a.key.toLowerCase().includes('reference'));
  if (!referenceAttr) return { ...values };
  const interpolatedDefault = values[referenceAttr.key] ?? '';
  const docket = client.docket ?? '';
  const name = client.name ?? '';
  return {
    ...values,
    [referenceAttr.key]: `${interpolatedDefault}${docket}${name}`,
  };
}

/**
 * Hydrate an entire `formValues` map for a template. Combines:
 *   - per-attribute interpolation (step 1)
 *   - SWIFT-rule overlay (step 2 — runs after interpolation)
 *
 * The result is the initial `formValues` object that step 2 mounts
 * with; the operator can then edit any field freely.
 */
export function hydrateInitialFormValues(
  attributes: TemplateAttribute[],
  template: Pick<InstructionTemplate, 'rail_name' | 'rail_id'>,
  client: Pick<Client, 'docket' | 'name' | 'tax_number'>,
): Record<string, string> {
  const interpolated: Record<string, string> = {};
  for (const attr of attributes) {
    interpolated[attr.key] = interpolateClientVariables(attr.default_value, client);
  }
  return applySwiftReferenceRule(interpolated, attributes, template, client);
}
