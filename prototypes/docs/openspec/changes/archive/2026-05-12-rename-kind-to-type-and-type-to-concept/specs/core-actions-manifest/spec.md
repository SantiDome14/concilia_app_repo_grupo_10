## MODIFIED Requirements

### Requirement: Predicate evaluator MUST implement the 8-form alphabet with multi-key AND-merge

The predicate evaluator `evalPredicate(p, record)` SHALL recognize exactly eight predicate forms: `record_concept_in`, `record_concept_not_in`, `field_is_null`, `field_is_not_null`, `field_equals: { field, value }`, `field_in: { field, values }`, `all: Predicate[]`, `any: Predicate[]`. The `record_concept_in` / `record_concept_not_in` forms read the record's `concept: string` field directly (the canonical business classifier per `core-modulo-genericos`); legacy fields `_record_type` and `tipo` are no longer consulted. When a predicate object carries multiple keys from the alphabet, the evaluator MUST AND-merge them. When `p` is `null` or `undefined`, the result MUST be `true`. When `p` is an array, the evaluator MUST treat it as implicit AND. Unknown keys (anything outside the alphabet) MUST emit `devWarn('PREDICATES', 'unknown predicate key: ' + key)` and resolve to `true` in dev/prod; in strict mode (tests) the evaluator MUST throw. Field paths MUST be resolved via the `resolveField()` dot-path helper.

#### Scenario: All eight forms evaluate correctly

- **GIVEN** a record `{ concept: "DEP", sociedad_id: "S-1", cliente_id: null }`
- **WHEN** `evalPredicate({ record_concept_in: ["DEP","RET"] }, record)` runs
- **THEN** the result is `true`; AND `evalPredicate({ field_is_null: "cliente_id" }, record)` returns `true`; AND `evalPredicate({ field_equals: { field: "sociedad_id", value: "S-1" } }, record)` returns `true`

#### Scenario: Multi-key predicate is AND-merged

- **GIVEN** a record `{ concept: "DEP", cliente_id: null }`
- **WHEN** `evalPredicate({ record_concept_in: ["DEP"], field_is_null: "cliente_id" }, record)` runs
- **THEN** the result is `true` (both keys satisfied); changing either key to a failing value flips the result to `false`

#### Scenario: Null and array predicates short-circuit

- **GIVEN** any record `r`
- **WHEN** `evalPredicate(null, r)` runs
- **THEN** the result is `true`; AND `evalPredicate([{ field_is_null: "x" }, { field_is_null: "y" }], { x: null, y: null })` returns `true` (array → implicit AND)

#### Scenario: Unknown key emits devWarn and resolves to true

- **GIVEN** a predicate `{ record_concept_in: ["DEP"], not_a_real_key: "X" }`
- **WHEN** `evalPredicate()` runs in dev mode
- **THEN** `devWarn('PREDICATES', 'unknown predicate key: not_a_real_key')` is emitted; the evaluator ignores the unknown key and returns the AND of the remaining valid keys; in strict mode the evaluator throws `ManifestError`
