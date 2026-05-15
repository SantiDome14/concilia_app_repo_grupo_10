---
name: Ardua API Documentation — Portal público de documentación de las APIs
features: [COMMON]
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-05-15
updated_at: 2026-05-15
---

# Ardua API Documentation — Portal público de documentación de las APIs

## Objetivo

Diseñar y lanzar `docs.arduasolutions.com`, el portal público de
documentación de Ardua. El portal es el **contenedor único de toda integración
futura con Ardua** (APIs, SDKs, webhooks), no la documentación de una API
puntual.

Esta discovery resuelve:
1. La arquitectura de navegación del portal, preparada para crecer sin
   redesign.
2. Los patrones de página estándar (concepto, referencia de endpoint).
3. Los constraints legales no negociables sobre el wording.
4. El stack técnico del prototipo, heredado del `core-template-frontend`
   en lo aprovechable.

## Contexto

Ardua tiene hoy un POC público en `d3rh5lht5hc3iw.cloudfront.net` con la
documentación del **RFP (Request for Prices)** — la versión simplificada y
ya liberada del sistema RFQ (que sigue en construcción).

El POC tiene dos problemas que motivan el relaunch:

1. **Implicancias legales en el wording.** El sitio actual viola dos
   líneas rojas declaradas por Legal:
   - Habla de "ejecutar operaciones de FX" — Ardua no puede afirmar que
     realiza operaciones de FX.
   - No explicita el carácter referencial del precio devuelto por RFP —
     el precio puede leerse como una oferta vinculante, cuando en realidad
     RFP se limita a consultar y no constituye obligación de Ardua de
     operar a esos valores.
2. **Alcance encarcelado en RFP.** La estructura está pensada como "docs
   del RFP" y no como el contenedor de toda la integración futura. Cuando
   se libere RFQ (con pre-cotización vinculante) u otras APIs/SDKs, la
   estructura actual no escala sin redesign.

Aprovechamos el relaunch para repensar la estructura general inspirados
en **Bridge (apidocs.bridge.xyz)**, construido sobre Mintlify. Bridge sirve
como referencia conceptual; la implementación es propia.

## Referencia evaluada — Bridge

### Lo que tomamos como inspiración
- **Separación conceptos / referencia** (Get Started vs API Reference)
  como dos universos navegables, no como secciones de un mismo sidebar.
- **Patrón de página de endpoint** con breadcrumb + título + Copy page +
  método/path con parámetros highlighted + Try it + secciones de
  parámetros + panel derecho con code y response.
- **Color semántico por método HTTP:** GET verde, POST azul, PUT amarillo,
  DELETE rojo.
- **Quickstart con pasos numerados** como página inicial del recorrido.
- **Página de Authentication separada** con explicación + ejemplo + sandbox.
- **Callouts con emoji** (🔑 ⚠️ ❗️) para llamar la atención sobre puntos
  críticos.

### Lo que NO tomamos en v1
- Mintlify como plataforma — implementamos custom sobre el stack del
  core-template para preservar control de branding y deployment.
- "Ask AI" embebido como chatbot — no es prioridad v1.
- Dashboard CTA externo — Ardua todavía no expone un dashboard B2B
  público para integradores.

## Constraints legales — no negociables

| # | Constraint | Origen |
|---|---|---|
| 1 | No se puede afirmar que Ardua realiza "operaciones de FX". | Legal / Camila Cattaneo |
| 2 | En RFP no se puede sugerir que el precio devuelto constituye oferta u obligación de operar. RFP es consulta a título referencial; la operación se gestiona aparte vía Mesa de Dinero. | Legal / Camila Cattaneo |

Estos constraints aplican al **wording de toda la documentación pública**,
no solo a las páginas del RFP. El feature spec incorpora un patrón
explícito de disclaimer reutilizable.

## Decisiones tomadas

| Decisión | Detalle |
|---|---|
| **Plataforma técnica** | Implementación propia sobre el stack del `core-template-frontend`. Se hereda: Vue 3.5 + TS strict + Vite 7 + Tailwind 4 + shadcn-vue + lucide + vue-sonner + theming. Se descarta: Layout L1/L2/L3 del backoffice, Vue Router con rutas de módulos, Auth0, vue-query/axios/tanstack-table (excepción: axios para el panel "Try it"), vee-validate/zod, OpenSpec + ardua-skills (gobernanza no aplica al prototipo). |
| **Audiencia v1** | Desarrolladores de clientes B2B integradores. No es lugar para clientes finales ni para usuarios internos. |
| **Alcance de contenido v1** | Estructura general (Introduction, Authentication, Errors & Rate Limits) + una sola API documentada: RFP (1 endpoint: `GET /prices/{pair}`). |
| **Arquitectura de navegación** | Preparada para tabs (Get Started / API Reference / Changelog, à la Bridge) pero con **un único tab activo en v1**; el nav de tabs no se renderiza si solo hay uno. Permite crecer sin redesign. |
| **Branding** | Navy `#11113A`, violet `#7326F1`, lime `#CFF80A`, black `#000000`. Tipografía Poppins / Inter. Dark mode default (preservar el look del POC actual). |
| **Ubicación del repo** | A definir con Santiago: repo nuevo dedicado (probable) o subcarpeta del monorepo del RFQ/RFP. La decisión técnica final no bloquea el prototipo, que vive en `prototypes/ardua-api-documentation/` de este framework. |
| **Naming del producto en docs** | "Ardua API Documentation" para el portal. Cada API documentada lleva su nombre propio en el sidebar (RFP, RFQ cuando esté, etc.). |

## Arquitectura de navegación target

```
[TOP NAV — tabs, ocultos en v1 con un solo tab]
  Get Started  |  API Reference  |  Changelog

[SIDEBAR — depende del tab activo]

Tab "Get Started":
  Introduction              ← bienvenida al ecosistema de APIs de Ardua
  Authentication            ← clave pública/privada, sandbox
  Errors & rate limits      ← códigos HTTP + headers de rate limiting
  Versioning                ← política de versiones + cómo leer el changelog

Tab "API Reference":
  Market Data
    GET /prices/{pair}      ← RFP — con disclaimer de carácter referencial
  [secciones futuras agregables sin redesign]

Tab "Changelog":
  Entradas cronológicas por release
```

En v1 sin tabs: el sidebar muestra ambos bloques (Getting Started + API
Reference) como dos secciones del mismo árbol. Cuando crezca el contenido,
se activa la separación por tabs.

## Patrones de página estándar

### Patrón A — Concept page
Páginas conceptuales (Introduction, Authentication, Errors & rate limits,
Versioning). Layout:
- Título + subtítulo
- Cuerpo en prosa con secciones H2/H3
- Code blocks con copy button
- Callouts con emoji (info, warning, danger)
- Panel derecho de code example **opcional** — solo si la página tiene
  un ejemplo de código asociado; si no, el panel está vacío con leyenda
  "No hay código de ejemplo para esta sección" (igual que el POC actual).

### Patrón B — Endpoint Reference page
Páginas de endpoint individual. Layout 3 columnas:
- **Columna izquierda (sidebar):** árbol de navegación.
- **Columna central:** breadcrumb a la sección parent (ej. "Market Data")
  → título del endpoint → botón "Copy page" → descripción → línea con
  método HTTP coloreado + path (parámetros highlighted) → botón "Try it"
  → secciones (Headers / Path Parameters / Query Parameters / Body /
  Responses).
- **Columna derecha:** code example multi-lenguaje (cURL / JavaScript /
  Python / Go) + response example con tabs por status code.

El panel "Try it" permite ejecutar el request en vivo contra
`api.arduasolutions.com` desde la propia página (autenticando con la
API key que el usuario ingrese localmente).

## Disclaimer pattern para wording legal

Reutilizable en cualquier endpoint que devuelva información sensible al
constraint #2. Componente visual estandarizado: bloque destacado con
icono ⚠️ + texto editable por endpoint. Texto base para RFP:

> ⚠️ Los precios devueltos son de **carácter referencial** y no constituyen
> una oferta u obligación de Ardua de operar a esos valores. Para
> ejecutar una operación, contactá a la Mesa de Dinero.

El feature spec captura este patrón como componente reutilizable.

## Estado del POC actual y plan de transición

| Aspecto del POC actual | Veredicto |
|---|---|
| Branding (navy + violet, dark mode, logo, badge `v1.0.0`) | **Preservar** — sirve de base visual |
| Layout 3 columnas | **Preservar** |
| Try it interactivo (cURL / JS / Python / Go) | **Preservar** |
| Códigos de estado HTTP como tabla | **Preservar** |
| Rate limiting con headers documentados | **Preservar** |
| Auth con clave pública/privada (RSA) | **Preservar** — más seguro que API key plana |
| Wording de Introduction ("operaciones de FX") | **Reescribir** — viola constraint legal #1 |
| Title "Request for price" en endpoint | **Renombrar** — usar título descriptivo neutro |
| Descripción del endpoint ("par de divisas") | **Reemplazar** — "par de activos" o equivalente |
| Falta disclaimer de carácter referencial en RFP | **Agregar** — constraint legal #2 |
| Estructura encarcelada en RFP (solo Market Data) | **Refactorizar** — abrir a estructura general |

## Próximos pasos

1. **Feature spec** — escribir `features/common/ardua-api-documentation.md`
   con el detalle accionable (paleta exacta, jerarquía visual, comportamiento
   de cada componente, patrones de página, copy de las páginas conceptuales).
2. **Prototipo** — copiar `_core-template-frontend` a
   `prototypes/ardua-api-documentation/` y aplicar el spec. Implementación
   delegada a Claude Code vía prompt; iteración por sesión.
3. **Validación legal** — pasar el wording final por Camila antes de
   deploy a producción.
4. **Decisión técnica de repo** — alinear con Santiago si el portal vive
   como repo nuevo, en el monorepo del RFP/RFQ, o como subapp de otro.
5. **Completar entity Bridge** — `entities/bridge.md` está vacío;
   completarlo con info pública del proveedor + capacidades específicas
   que habilita a Ardua.

## Stakeholders involucrados

- **Camila Cattaneo (Legal & Compliance)** — validación de wording,
  disclaimers, jurisdicción.
- **Santiago Ahmed (Technology)** — arquitectura del portal, ubicación
  del repo, integración con la RFP API.
- **Mauro Pascuccio (Sales)** — dolor real de los clientes en pipeline,
  prioridades de contenido.
- **Federico Nervegna (CEO)** — alineación con la posición de mercado.
