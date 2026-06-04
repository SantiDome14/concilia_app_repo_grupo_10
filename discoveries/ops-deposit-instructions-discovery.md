---
name: OPS — Deposit Instructions · Variables automáticas
features: [OPS]
status: Concluida
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

PWI-44 fue capturado por Miles el 27/05/2026 a partir de un requerimiento de Francisco Peñé (Operations). El problema: las deposit instructions (Account Confirmation Letter) se completan de forma manual. El operador obtiene los dos datos críticos accediendo al legajo del cliente en LEX (página a la que Operations tiene acceso): los dígitos del Docket AS para construir el account number (anteponiendo `512`) y la dirección del cliente para completar el campo correspondiente. Ambos datos viven en LEX, no en OPS. El proceso genera riesgo de errores tipográficos en datos bancarios SWIFT.

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

**Origen del dato confirmado (04/06/2026):** el operador de OPS accede al legajo del cliente en LEX para leer el Docket AS. La nueva variable `{account_number}` debe por tanto leer ese campo desde LEX — no desde OPS — exactamente igual que `{client_address}`. Ambas variables tienen la misma fuente de datos: el legajo del cliente en LEX.

**Punto pendiente de refinement técnico:** el comportamiento de `{docket}` respecto al prefijo no está confirmado. Si `{docket}` resuelve el código completo (`AS005468`), el account number requiere una nueva variable computada que extraiga los dígitos y agregue `512`. Si ya resuelve solo los 6 dígitos numéricos (`005468`), el operador podría escribir `512{docket}` directamente en el `default_value`. Esta distinción no va al PWI — es una decisión de Tecnología en refinement.

### H3 · La dirección en LEX es un campo de texto libre — con convención de formato establecida

La dirección del cliente en LEX se almacena en un campo único `client.address` (`FormClientUpdate.vue`, `Details.vue`). Es un `input type="text"` sin subcomponentes estructurados. No existen campos separados para Street, City, State, Zip, Country.

Sin embargo, la práctica operativa del equipo de Operations establece una convención de formato consistente para el ingreso de direcciones: `Street: [val], City: [val], State: [val], Zip: [val], Country: [val]`. Esta convención es suficiente para que el backend pueda parsear el campo y extraer los valores sin sus etiquetas.

Ejemplo real observado en producción: `Street: 1680 Moldes, City: Buenos Aires, State: Ciudad Autónoma de Buenos Aires, Zip: C1426, Country: AR`.

**Conclusión — Opción A confirmada:** la variable `{client_address}` puede resolverse parseando el string existente y entregando los valores sin etiquetas, sin cambios en LEX. El manejo de casos donde la dirección no sigue la convención (cliente sin onboarding completo) queda a definir con Tecnología en refinement; operacionalmente, si la dirección no sigue el formato no se genera la instrucción.

### H4 · Endpoint `/account-instruction` — propósito pendiente de confirmar

El composable `useInstructions.js` expone una función `createAccountInstruction` que llama a `/account-instruction`, un endpoint distinto de `/routes`. Este endpoint puede estar relacionado con la generación del Account Confirmation Letter (el PDF que se entrega al cliente). No está documentado en el knowledge base. Vale clarificar con Tecnología su propósito antes de cerrar el scope del PWI.

---

## Preguntas abiertas

| # | Pregunta | Para quién | Estado |
|---|---|---|---|
| P-01 | ¿Podés adjuntar el PDF del Account Confirmation Letter al hilo de PWI-44? | Francisco Peñé (Operations) | Cerrado — flujo documentado mediante investigación directa en OPS QA (04/06/2026) |
| P-02 | ¿La variable de dirección debe insertar `client.address` como está (Opción A) o requiere campos estructurados en LEX (Opción B)? | Francisco Peñé (Operations) | Cerrado — Opción A confirmada. El campo en LEX sigue una convención de formato estructurado con etiquetas; el backend puede parsear sin cambios en el modelo |
| P-03 | ¿`{docket}` resuelve el código completo (`AS005468`) o solo los 6 dígitos numéricos (`005468`)? | Tecnología | Pendiente — refinement técnico |
| P-04 | ¿Qué hace el endpoint `/account-instruction`? ¿Es el mecanismo de generación del Account Confirmation Letter? | Tecnología | Pendiente — refinement técnico |

---

## PWI asociado

**PWI-44** — Listo para Sent to Dev · Enriquecimiento Detallado completado (04/06/2026).

---

## Notas

- El feature file `features/ops/ops-deposit-instructions.md` fue creado en la sesión del 04/06/2026 (discovery concluido, feature propagado).
- P-03 y P-04 son decisiones de implementación técnica — no afectan el scope del PWI. Quedan para refinement con Tecnología.
- La variable se llama `{client_address}` (no `{address}`) — nombre final confirmado en el enriquecimiento.
