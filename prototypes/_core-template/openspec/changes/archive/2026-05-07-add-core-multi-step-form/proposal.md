- Jira REQ: —
- Module: core-template (foundation)
- Tier: 1 — bloquea TRD (QuoteForm 3,048 LOC), OPS (InstructionForm dinámico), LEX (forms multipage)

# Add `core-multi-step-form` capability — wizard with state machine, persistence, and conditional steps

## Why

`core-forms` cubre validación campo a campo y prerequisitos entre campos del mismo form. Pero hay una clase de forms en el financial-core donde el flow está dividido en **etapas progresivas**, cada una con su propio panel y su propio scope de validación, donde el step previo condiciona qué steps siguen, y donde el usuario espera ver dónde está dentro del proceso (progress indicator):

1. **TRD QuoteForm (3,048 LOC).** Hoy es un solo componente monolítico con state local. Conceptualmente es un wizard: cliente → currency pair → amount → preview → confirm. En el caso CCC (Crypto-to-Crypto-to-Crypto) se inserta un step adicional (leg intermedia). Sin un patrón canónico de wizard, la migración va a heredar el monolito.

2. **OPS InstructionForm.** Crear un payment routing instruction implica primero declarar el template (name + currency + description) y después armar el array dinámico de attributes. Hoy el form mezcla todo en un solo panel; es candidato natural a wizard de dos steps: declaración + attributes.

3. **LEX forms multipage.** Documentos, comentarios, edición de cliente — todos hoy con scrolling vertical larguísimo. Podrían dividirse en steps lógicos para reducir cognitive load del operador.

`core-forms` NO entrega esto y agregárselo como requirements diluye el contrato base. Esta change abre una capability separada — `core-multi-step-form` — que compone con `core-forms` (cada step internamente sigue las reglas de `core-forms`) pero contractualiza la dimensión wizard: registry de steps, indicador de progreso, visibilidad condicional de steps, persistencia intermedia con resume, navegación adelante/atrás sin perder data, validación per-step.

## What Changes

- **New capability `core-multi-step-form`** con requirements para:
  - **Step registry** — los apps declaran un array `WizardStep[]` con `id`, `title`, optional `description`, optional `enabledWhen(formState)` predicate, `validate(stepData)` returning vee-validate result.
  - **Progress indicator** — componente `<Wizard>` que renderiza pasos como dots / numbers / breadcrumb / segmented control; estados visuales canónicos (`completed | current | upcoming | disabled | error`).
  - **Conditional step visibility** — `enabledWhen(formState)` evalúa reactivamente; un step puede aparecer/desaparecer según el state acumulado (ej: TRD CCC inserta el step "leg intermedia" sólo cuando `operation === 'CCC'`).
  - **Per-step validation gate** — el botón "Siguiente" se habilita solo cuando el step actual valida; vee-validate scope per step preserva el estado del form global.
  - **Forward / backward navigation** — el usuario puede volver a un step anterior y los datos están preservados; saltar a un step adelante (no contiguo) está prohibido por default; un step puede declarar `revisitable: false` para bloquear el back-step (típico de "confirm" final).
  - **Resume-ability via sessionStorage** — el wizard persiste su state under un key configurable (`wizardId`); al re-mount, `Wizard.resume(wizardId)` restaura el step y la data parciales.
  - **Composable `useWizard(steps, options)`** que expone reactive state, actions (`next`, `back`, `goTo`, `submit`, `reset`), y el flag `currentStep`.
- **Skill nueva `ardua-build-wizard`** — playbook deterministic para que los apps wireen un wizard sin reinventar la orquestación. (La skill se materializa en un change posterior; este change solo contracta la capability.)

## Capabilities

### Affected Capabilities

- `core-forms` — composes with: cada step internamente usa `vee-validate` + `zod` + los field types contractados. Esta change NO modifica `core-forms`.

### New Capabilities

- `core-multi-step-form` — net-new. 7 requirements iniciales cubriendo registry, progress indicator, visibility condicional, validation gate, navegación, persistencia/resume, composable.

### Cross-capability dependencies

- Compone con `core-forms` — los steps son forms estándar; los componentes `vee-validate` `<Form>` con `validationSchema` en el step component renderizan los campos como en cualquier form del template.
- Compone con `core-modals` — el patrón típico de uso es un wizard adentro de un Create modal (modal width fijo, contenido cambia por step). La spec NO restringe el surface; el wizard funciona en página completa, en modal, en drawer, en cualquier contexto Vue.
- Compone con `core-theming` — los estados visuales del progress indicator (`completed`, `current`, `upcoming`, `disabled`, `error`) usan tokens del design system.

## Notes

- El wizard NO es la herramienta para forms simples de un solo panel — sobrekill. Si el form cabe en un panel sin scroll excesivo y sin lógica condicional entre regiones, queda como form clásico de `core-forms`.
- El wizard NO contractualiza un patrón de **save draft** explícito (botón "Guardar borrador" que persiste server-side). Eso es app-specific; la persistencia de este wizard es client-side only (sessionStorage). Si una app necesita server-side drafts, eso es una capability futura distinta (`core-form-drafts`).
- El wizard NO contractualiza **paralelización** de steps (varios steps editables simultáneamente con un overall progress). Es estrictamente lineal con visibilidad condicional. Si en el futuro aparece un caso de paralelización, abre como capability separada o extiende esta.
- El wizard NO contractualiza un componente de **summary / confirmation final** — la app declara un step canónico de confirmación si lo necesita. La spec recomienda el patrón pero no lo exige.
