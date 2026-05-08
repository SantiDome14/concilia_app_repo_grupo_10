import { describe, it, expect } from 'vitest';
import {
  interpolateClientVariables,
  isSwiftRuleRail,
  applySwiftReferenceRule,
  hydrateInitialFormValues,
  SWIFT_RULE_RAILS,
} from './interpolation';
import type { Client } from '@/ops/clients/types';
import type { InstructionTemplate, TemplateAttribute } from './types';

const ACME: Pick<Client, 'docket' | 'name' | 'tax_number'> = {
  docket: 'D42',
  name: 'ACME',
  tax_number: '20-12345678-9',
};

describe('interpolateClientVariables', () => {
  it('replaces {docket}, {name}, {tax_number} with the client values', () => {
    expect(interpolateClientVariables('Code-{docket}-{name}', ACME)).toBe('Code-D42-ACME');
    expect(interpolateClientVariables('CUIT: {tax_number}', ACME)).toBe(
      'CUIT: 20-12345678-9',
    );
  });

  it('replaces missing variables with empty strings', () => {
    expect(
      interpolateClientVariables('Code-{docket}', { docket: null, name: 'X', tax_number: null }),
    ).toBe('Code-');
  });

  it('returns empty string for null/undefined/empty input', () => {
    expect(interpolateClientVariables(null, ACME)).toBe('');
    expect(interpolateClientVariables(undefined, ACME)).toBe('');
    expect(interpolateClientVariables('', ACME)).toBe('');
  });

  it('leaves non-supported placeholders intact', () => {
    expect(interpolateClientVariables('Order {order_id} for {name}', ACME)).toBe(
      'Order {order_id} for ACME',
    );
  });

  it('handles repeated placeholders in the same string', () => {
    expect(interpolateClientVariables('{name}-{name}-{docket}', ACME)).toBe('ACME-ACME-D42');
  });
});

describe('isSwiftRuleRail', () => {
  it.each([
    ['SWIFT', true],
    ['ACH', true],
    ['FEDWIRE', true],
    ['SEPA', true],
    ['ACH & FEDWIRE', true],
    ['ARS', false],
    ['CRYPTO', false],
    ['', false],
  ])('returns %p when rail is %s', (rail, expected) => {
    expect(isSwiftRuleRail({ rail_name: rail })).toBe(expected);
  });

  it('matches case-insensitively', () => {
    expect(isSwiftRuleRail({ rail_name: 'swift' })).toBe(true);
    expect(isSwiftRuleRail({ rail_name: 'Swift Wire' })).toBe(true);
  });

  it('falls back to rail_id when rail_name is missing', () => {
    expect(isSwiftRuleRail({ rail_id: 'SWIFT' })).toBe(true);
  });

  it('exposes the canonical 5-rail trigger set', () => {
    expect(SWIFT_RULE_RAILS).toEqual([
      'SWIFT',
      'ACH',
      'FEDWIRE',
      'SEPA',
      'ACH & FEDWIRE',
    ]);
  });
});

describe('applySwiftReferenceRule', () => {
  const SWIFT_TEMPLATE: InstructionTemplate = {
    id: 't-swift',
    name: 'SWIFT - BBVA',
    rail_name: 'SWIFT',
  };
  const ARS_TEMPLATE: InstructionTemplate = {
    id: 't-ars',
    name: 'ARS - Santander',
    rail_name: 'ARS',
  };
  const ATTRS_WITH_REFERENCE: TemplateAttribute[] = [
    { key: 'beneficiary_bank', default_value: 'BBVA' },
    { key: 'reference_code', default_value: 'REF-' },
  ];
  const ATTRS_WITHOUT_REFERENCE: TemplateAttribute[] = [
    { key: 'beneficiary_bank', default_value: 'BBVA' },
    { key: 'iban', default_value: 'AR0070123' },
  ];

  it('rewrites the reference field on SWIFT-rule rails', () => {
    const values = { beneficiary_bank: 'BBVA', reference_code: 'REF-' };
    const result = applySwiftReferenceRule(values, ATTRS_WITH_REFERENCE, SWIFT_TEMPLATE, ACME);
    expect(result).toEqual({
      beneficiary_bank: 'BBVA',
      reference_code: 'REF-D42ACME',
    });
  });

  it('returns values unchanged on non-SWIFT rails', () => {
    const values = { beneficiary_bank: 'Santander', reference_code: 'REF-' };
    const result = applySwiftReferenceRule(values, ATTRS_WITH_REFERENCE, ARS_TEMPLATE, ACME);
    expect(result).toEqual(values);
  });

  it('returns values unchanged when no attribute key contains "reference"', () => {
    const values = { beneficiary_bank: 'BBVA', iban: 'AR0070123' };
    const result = applySwiftReferenceRule(
      values,
      ATTRS_WITHOUT_REFERENCE,
      SWIFT_TEMPLATE,
      ACME,
    );
    expect(result).toEqual(values);
  });

  it('handles missing client.docket / client.name as empty strings', () => {
    const values = { reference_code: 'REF-' };
    const attrs: TemplateAttribute[] = [{ key: 'reference_code' }];
    const result = applySwiftReferenceRule(values, attrs, SWIFT_TEMPLATE, {
      docket: null,
      name: null,
    });
    expect(result.reference_code).toBe('REF-');
  });

  it('does NOT mutate the input values object', () => {
    const values = { beneficiary_bank: 'BBVA', reference_code: 'REF-' };
    applySwiftReferenceRule(values, ATTRS_WITH_REFERENCE, SWIFT_TEMPLATE, ACME);
    expect(values.reference_code).toBe('REF-'); // unchanged
  });

  it('uses the FIRST attribute whose key contains "reference"', () => {
    const attrs: TemplateAttribute[] = [
      { key: 'reference_code', default_value: 'CODE-' },
      { key: 'reference_alt', default_value: 'ALT-' },
    ];
    const values = { reference_code: 'CODE-', reference_alt: 'ALT-' };
    const result = applySwiftReferenceRule(values, attrs, SWIFT_TEMPLATE, ACME);
    expect(result.reference_code).toBe('CODE-D42ACME');
    expect(result.reference_alt).toBe('ALT-'); // not rewritten
  });
});

describe('hydrateInitialFormValues', () => {
  it('combines interpolation + SWIFT rule for SWIFT-rail templates', () => {
    const attrs: TemplateAttribute[] = [
      { key: 'beneficiary_bank', default_value: 'BBVA' },
      { key: 'reference_code', default_value: 'REF-{docket}-' },
    ];
    const template: InstructionTemplate = { id: 't', name: 'SWIFT', rail_name: 'SWIFT' };
    const result = hydrateInitialFormValues(attrs, template, ACME);
    // First interpolation gives reference_code = 'REF-D42-'.
    // Then SWIFT rule appends docket+name → 'REF-D42-D42ACME'.
    expect(result.beneficiary_bank).toBe('BBVA');
    expect(result.reference_code).toBe('REF-D42-D42ACME');
  });

  it('only interpolates (no SWIFT rule) on non-SWIFT rails', () => {
    const attrs: TemplateAttribute[] = [
      { key: 'reference_code', default_value: 'REF-{docket}' },
    ];
    const template: InstructionTemplate = { id: 't', name: 'ARS', rail_name: 'ARS' };
    const result = hydrateInitialFormValues(attrs, template, ACME);
    expect(result.reference_code).toBe('REF-D42');
  });

  it('handles attributes with no default_value as empty strings', () => {
    const attrs: TemplateAttribute[] = [{ key: 'manual_field' }];
    const template: InstructionTemplate = { id: 't', name: 'SEPA', rail_name: 'SEPA' };
    const result = hydrateInitialFormValues(attrs, template, ACME);
    expect(result.manual_field).toBe('');
  });
});
