import { z } from 'zod';

// ════════════════════════════════════════════════════════════════════
// Dynamic forms — runtime FieldConfig schema
// ────────────────────────────────────────────────────────────────────
// Implements `core-dynamic-forms`. Backend-supplied schemas conform
// to this shape; the composable validates every received schema with
// the Zod schema below before consuming it.
// ════════════════════════════════════════════════════════════════════

/** Per-option entry for `select` / `lookup` / `key-value-array` fields. */
export const fieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  dotColor: z.string().optional(),
});

export type FieldOption = z.infer<typeof fieldOptionSchema>;

/** Conditional-visibility predicate. */
export const conditionalSchema = z.object({
  field: z.string().min(1),
  value: z.unknown(),
});

export type Conditional = z.infer<typeof conditionalSchema>;

/**
 * One field declaration.
 *
 * `type` is open-ended on purpose — apps may register custom domain
 * types in the manifest registry. The composable validates that the
 * type is registered before rendering.
 */
export const fieldConfigSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(fieldOptionSchema).optional(),
  conditional: conditionalSchema.optional(),
  defaults: z.unknown().optional(),
  meta: z.record(z.unknown()).optional(),
});

export type FieldConfig = z.infer<typeof fieldConfigSchema>;

/** Full schema = ordered array of FieldConfig. */
export const dynamicFormSchema = z.array(fieldConfigSchema);
