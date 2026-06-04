---
name: OPS — Deposit Instructions · Variables automáticas
features: [OPS]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-04
updated_at: 2026-06-04
propagates_to:
  - features/ops/ops-deposit-instructions.md
---

# OPS — Deposit Instructions · Variables automáticas

## Objetivo

Entender el estado actual del módulo de deposit instructions en OPS, la viabilidad técnica de las dos variables solicitadas en PWI-44 (`{account_number}` y `{address}`), y las dependencias con LEX para la variable de dirección. Determinar el alcance real antes de estructurar el requerimiento en formato PWI-1.

## Contexto

PWI-44 fue capturado por Miles el 27/05/2026 a partir de un requerimiento de Francisco Peñé (Operations). El problema: las deposit instructions (Account Confirmation Letter) se completan de forma manual. El operador reemplaza las X del template con los dígitos del docket del cliente y copia la dirección manualmente desde el legajo en LEX. El proceso genera riesgo de errores tipográficos en datos bancarios SWIFT.

Volumen: entre 10 y 30 instrucciones por semana, todos los días, con proyección de crecimiento.

Requerimiento: dos nuevas variables en `ops.arduasolutions.com/settings/instructions`:
1. Variable de account number: genera automáticamente `512` + los 6 dígitos del Docket AS (ej: `AS005468` → `512005468`).
2. Variable de dirección: toma la dirección del cliente desde el legajo en LEX y la formatea como Street, City, State, Zip, Country.

---

## Hallazgos de investigación

Investigación realizada el 04/06/2026 a partir de los repos `core-ops-frontend` y `core-lex-frontend` (rama `main`, actualizada).

### H1 · El sistema de variables ya existe en producción

El módulo `settings/instructions` tiene un sistema de variables operativo en producción (`InstructionForm.vue`, `useInstructions.js`). Los templates soportan sintaxis `{variable}` en el campo `default_value` de cada atributo. El catálogo de variables disponibles viene del backend vía `/instruction-attribute-value`.

Variables actualmente disponibles:

| Variable | Descripción |
|---|---|
| `{docket}` | Código de docket del cliente |
| `{name}` | Nombre del cliente |
| `{tax_number}` | Tax ID del cliente |

Las dos variables nuevas de PWI-44 serían adiciones al catálogo del backend. Sin cambios de modelo en el frontend de OPS — trabajo exclusivo de backend.

**Implicancia para PWI-44:** el requerimiento no construye el sistema de variables desde cero. Es una extensión de capacidad del sistema existente.

### H2 · Patrón del account number — alineado con el modelo de dockets

El patrón `512` + 6 dígitos del Docket AS está alineado con la arquitectura del modelo de clientes documentada en `features/ops/ops-cuentas-operativas-del-cliente.md`. El Docket de Ardua Solutions Corp es el ancla operativa de imputación para todos los flujos.

**Punto pendiente de refinement técnico:** el comportamiento de `{docket}` respecto al prefijo no está confirmado. Si `{docket}` resuelve el código completo (`AS005468`), el account number requiere una nueva variable computada que extraiga los dígitos y agregue `512`. Si ya resuelve solo los 6 dígitos numéricos (`005468`), el operador podría escribir `512{docket}` directamente en el `default_value`. Esta distinción no va al PWI — es una decisión de Tecnología en refinement.

### H3 · La dirección en LEX es un campo de texto libre único — hallazgo de alcance

La dirección del cliente en LEX se almacena en un campo único `client.address` (`FormClientUpdate.vue`, `Details.vue`). Es un `input type="text"` sin subcomponentes estructurados. No existen campos separados para Street, City, State, Zip, Country.

Esto tiene impacto directo en el scope de la variable de dirección solicitada. El formato "Street, City, State, Zip, Country" que describe el requerimiento **no puede resolverse automáticamente** desde el modelo actual. Hay dos caminos posibles:

| Opción | Descripción | Impacto |
|---|---|---|
| **A — Variable simple** | `{address}` inserta `client.address` tal como está cargado en el legajo. El formato depende de cómo el operador haya ingresado la dirección. | Sin cambios en LEX. Scope acotado. |
| **B — Campos estructurados en LEX** | Se agregan campos separados de dirección al modelo de cliente en LEX (Street, City, State, Zip, Country). La variable los concatena en orden. | Requiere cambios en el modelo de datos, formulario de alta y formulario de edición de LEX. Scope significativamente mayor. Implica un REQ separado para LEX. |

La elección entre A y B está pendiente de confirmación con Francisco Peñé — es el C2 del challenge en curso.

### H4 · Endpoint `/account-instruction` — propósito pendiente de confirmar

El composable `useInstructions.js` expone una función `createAccountInstruction` que llama a `/account-instruction`, un endpoint distinto de `/routes`. Este endpoint puede estar relacionado con la generación del Account Confirmation Letter (el PDF que se entrega al cliente). No está documentado en el knowledge base. Vale clarificar con Tecnología su propósito antes de cerrar el scope del PWI.

---

## Preguntas abiertas

| # | Pregunta | Para quién | Estado |
|---|---|---|---|
| P-01 | ¿Podés adjuntar el PDF del Account Confirmation Letter al hilo de PWI-44? | Francisco Peñé (Operations) | Pendiente — challenge enviado |
| P-02 | ¿La variable de dirección debe insertar `client.address` como está (Opción A) o requiere campos estructurados en LEX (Opción B)? | Francisco Peñé (Operations) | Pendiente — challenge enviado |
| P-03 | ¿`{docket}` resuelve el código completo (`AS005468`) o solo los 6 dígitos numéricos (`005468`)? | Tecnología | Pendiente — refinement |
| P-04 | ¿Qué hace el endpoint `/account-instruction`? ¿Es el mecanismo de generación del Account Confirmation Letter? | Tecnología | Pendiente — refinement |

---

## PWI asociado

**PWI-44** — En análisis · Challenge enviado a Francisco Peñé (Operations) · Enriquecimiento Detallado en curso.

---

## Notas

- Si Francisco confirma Opción B (campos estructurados en LEX), el scope de la variable de dirección implica un segundo requerimiento sobre LEX — no puede resolverse dentro de PWI-44.
- El feature file `features/ops/ops-deposit-instructions.md` no existe aún. Se crea cuando el PWI alcance Sent to Dev y el enriquecimiento esté completo.
- La urgencia del PWI debe corregirse a **Medio** en Jira (acuerdo confirmado en el hilo de Slack, ticket quedó en Normal por error).
