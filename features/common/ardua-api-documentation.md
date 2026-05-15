---
aplicacion: COMMON
status: En definición
owner: Yasmani Rodriguez
created_at: 2026-05-15
updated_at: 2026-05-15
req: -
discovery: ardua-api-documentation-discovery.md
productos_afectados: []
---

# Ardua API Documentation

## Propósito

`docs.arduasolutions.com` es el portal público de documentación de Ardua: el contenedor único de toda integración futura del grupo con clientes B2B (APIs, SDKs, webhooks). Reemplaza el POC actual de `d3rh5lht5hc3iw.cloudfront.net`, que está acotado al RFP y tiene wording que viola constraints legales.

El portal cumple tres funciones simultáneas:

1. Reducir el time-to-integration de los developers de clientes B2B.
2. Servir como activo de venta técnica para el equipo comercial.
3. Ser la fuente única de verdad de las APIs públicas del grupo.

## Audiencia

Desarrolladores de clientes B2B integradores. No es lugar para clientes finales ni para usuarios internos de Ardua. La voz es directa, técnica, en español argentino (vos), sin jerga comercial.

## Estado v1

### Adentro

| Capacidad | Detalle |
|---|---|
| Arquitectura de navegación extensible | Top nav preparado para tabs (Get Started / API Reference / Changelog), oculto en v1 porque solo hay un universo activo. Sidebar único con bloques colapsables. |
| Páginas conceptuales | Introduction, Authentication, Errors & rate limits, Versioning. |
| API Reference v1 | Sección `Market Data` con un único endpoint: `GET /prices/{pair}` (RFP). |
| Patrones de página estandarizados | Patrón A (Concept) y Patrón B (Endpoint Reference). |
| Componente Disclaimer reutilizable | Variantes `referential` · `warning` · `info` · `danger`. La variante `referential` aplica a RFP. |
| Try it interactivo | Panel ejecutable contra `api.arduasolutions.com` desde la propia página. Multi-lenguaje (cURL / JavaScript / Python / Go). |
| Búsqueda en sidebar | Filtro local por nombre de endpoint o página. |
| Dark mode default | Look del POC actual preservado. |
| Branding Ardua | Paleta navy + violet + lime; tipografía Poppins/Inter; logo "A". |

### Afuera (diferido a v2+)

- Tabs activas en el top nav (se activan cuando haya 2+ universos: ej. cuando entre Changelog o un Developer Platform expandido).
- Búsqueda global (⌘K) sobre todo el contenido.
- "Ask AI" embebido como chatbot.
- Postman collection auto-generada.
- Pagination Guide (no aplica todavía).
- Idempotency Guide (no aplica todavía).
- SDK references (no hay SDKs liberados).
- Internacionalización (en/es) — v1 solo español.
- Light mode.
- Auto-render de OpenAPI specs (v1 todas las páginas son MDX/Markdown hand-coded; cuando haya un OpenAPI spec del RFP/RFQ se evalúa la migración).

## Arquitectura de navegación

### Estructura target completa

```
[TOP NAV — tabs, ocultos en v1 con un solo universo]
  Get Started  |  API Reference  |  Changelog

[SIDEBAR — depende del universo activo]

Universo "Get Started":
  Introduction              ← bienvenida al ecosistema de APIs
  Authentication            ← onboarding de credenciales + sandbox
  Errors & rate limits      ← códigos HTTP + headers de rate limiting
  Versioning                ← política de versiones + cómo leer el changelog

Universo "API Reference":
  Market Data
    GET /prices/{pair}      ← RFP
  [secciones futuras: Trading, Custody, Settlements, etc.]

Universo "Changelog":
  Entradas cronológicas por release
```

### Comportamiento en v1 (un solo universo activo)

El top nav **no se renderiza** cuando solo hay un universo activo. El sidebar muestra ambos bloques (`GETTING STARTED` + `API REFERENCE`) como dos secciones colapsables del mismo árbol — equivalente al patrón actual del POC, pero con estructura preparada para crecer.

Cuando se incorpore un segundo universo (probablemente Changelog), se activa el top nav y el sidebar pasa a depender del tab seleccionado. La migración no requiere redesign de páginas.

### Sidebar — comportamiento detallado

- **Ancho fijo:** 280px (desktop). Colapsable en mobile.
- **Bloques colapsables** por sección (`GETTING STARTED`, `API REFERENCE > Market Data`).
- **Item activo:** background violet con opacidad baja + texto violet; resto en gris claro sobre fondo dark.
- **Hover:** background sutil (gris muy oscuro).
- **Search input** al tope con placeholder "Search endpoints" + atajo `/` para focusear.
- **Indicador de método HTTP** a la izquierda del endpoint name, con color semántico (ver §Componentes).

## Sistema de diseño

### Paleta

| Token | Hex | Uso |
|---|---|---|
| `--bg-base` | `#0A0A12` | Fondo de la página (dark mode default) |
| `--bg-surface` | `#11113A` (navy Ardua) | Header, cards, sidebar panels |
| `--bg-elevated` | `#1A1A2E` | Code blocks, callouts, panel derecho |
| `--text-primary` | `#FFFFFF` | Títulos, texto principal |
| `--text-secondary` | `#A0A0B8` | Subtítulos, descripciones, prosa secundaria |
| `--text-muted` | `#6E6E85` | Captions, footnotes |
| `--accent-violet` | `#7326F1` | Inline code, highlights, item activo del sidebar, links |
| `--accent-lime` | `#CFF80A` | Badge `v1.0.0`, status "All systems operational" |
| `--accent-violet-soft` | `#7326F1` 15% alpha | Background de item activo del sidebar |
| `--method-get` | `#10B981` | Badge GET — verde |
| `--method-post` | `#3B82F6` | Badge POST — azul |
| `--method-put` | `#F59E0B` | Badge PUT — amarillo |
| `--method-delete` | `#EF4444` | Badge DELETE — rojo |
| `--method-patch` | `#8B5CF6` | Badge PATCH — violeta secundario |
| `--status-200` | `#10B981` | Badge response 2xx |
| `--status-400` | `#F59E0B` | Badge response 4xx |
| `--status-500` | `#EF4444` | Badge response 5xx |
| `--border-subtle` | `#262638` | Bordes de cards, code blocks, separadores |
| `--border-emphasis` | `#3D3D5C` | Bordes destacados, focus rings |

Las tokens viven como CSS variables en `:root` o en un archivo dedicado de Tailwind config (`tailwind.config.ts` con extensiones de tema). Light mode se planifica para v2 — todos los componentes deben referenciar variables, no hex hardcoded.

### Tipografía

| Rol | Familia | Pesos usados |
|---|---|---|
| Body, sidebar, descripciones | **Inter** | 400, 500, 600 |
| Títulos, headings, logo wordmark | **Poppins** | 600, 700 |
| Code blocks, inline code, paths, method badges | **JetBrains Mono** o **Fira Code** | 400, 500 |

### Espaciado y radii

- Spacing scale: Tailwind default (4px base).
- Border radius: `4px` (small), `8px` (medium — code blocks, cards), `9999px` (pill — badges).
- Layout content max-width: `1440px` con sidebar 280px + content fluid + right panel 480px.

## Componentes clave

Todos los componentes deben construirse sobre shadcn-vue + reka-ui base, extendidos con la paleta y el design system arriba.

### `<TopBar>`
Header fijo top del portal.
- Logo "A" + wordmark "ARDUA" + tag "/ API Documentation" + badge versión actual ("v1.0.0").
- Centro: input de búsqueda global (en v1 deshabilitado o solo placeholder; búsqueda real diferida).
- Derecha: toggle dark/light (light mode disabled en v1), status indicator "All systems operational" con dot lime.
- En v2 incorpora los tabs (Get Started / API Reference / Changelog) entre el logo y el search.

### `<Sidebar>`
Ver §Arquitectura de navegación → Sidebar.
- Renderiza secciones colapsables con chevron.
- Cada item es un link `<RouterLink>` con estado active.
- Items de endpoint llevan `<MethodBadge>` a la izquierda del nombre.

### `<MethodBadge>`
Badge pill con el método HTTP.
- Props: `method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'`, `size: 'sm' | 'md'`.
- Background y color de borde según `--method-{method}`. Texto blanco. Font mono.
- Width fijo `48px` en `size: 'sm'` (para alineación en sidebar), auto en `size: 'md'`.

### `<EndpointHeader>`
Banda con método + path + botón "Try it".
- Props: `method`, `path`, `pathParams: string[]` (los segmentos que son parámetros, ej `['pair']` para `/prices/{pair}`).
- Path renderizado en mono. Parámetros highlighted con background violet soft.
- Botón "Try it" a la derecha, primario.

### `<CodeBlock>`
Bloque de código con copy button.
- Props: `language: string`, `code: string`, `showLineNumbers?: boolean`.
- Syntax highlighting con Shiki o highlight.js (preferencia Shiki por mejor support de temas dark).
- Botón "Copy" top-right; muestra ✓ por 2s tras copiar.

### `<MultiLangCodeBlock>`
Code block con tabs para múltiples lenguajes (usado en el panel derecho del Patrón B y opcionalmente en páginas conceptuales).
- Tabs: cURL, JavaScript, Python, Go.
- Mismo request en los 4 lenguajes, declarado en el spec de la página.

### `<Callout>`
Bloque destacado con icono.
- Props: `variant: 'info' | 'warning' | 'danger' | 'success'`, `icon?: ReactNode | string` (default según variant).
- Defaults: info = ℹ️ azul, warning = ⚠️ amarillo, danger = ❗️ rojo, success = ✅ verde.

### `<DisclaimerCallout>`
Variante especializada de `<Callout>` para wording legal sensible. **Componente obligatorio en cualquier endpoint cuyo contenido pueda interpretarse como oferta vinculante.**
- Props: `variant: 'referential' | 'warning' | 'info' | 'danger'`, `text?: string` (override del default).
- La variante `referential` aplica el texto base:

  > ⚠️ Los precios devueltos son de **carácter referencial** y no constituyen una oferta ni una obligación de Ardua de operar a esos valores. Para ejecutar una operación, contactá a la Mesa de Dinero de Ardua.

- Renderizado: background con border-left grueso violet, icono ⚠️, texto secundario.

### `<ParamTable>`
Lista de parámetros de un endpoint (Path / Query / Headers / Body).
- Cada parámetro: nombre (mono) + tipo + flag `required` (badge rojo si true) + flag de ubicación (PATH / QUERY / HEADER) + descripción.
- Layout: nombre + flags a la izquierda; descripción a la derecha (~60% del ancho disponible).

### `<ResponseExample>`
Bloque de respuesta de ejemplo en el panel derecho.
- Props: `status: number`, `body: object | string`, `description?: string`.
- Header: badge con status code coloreado según `--status-*` + descripción opcional.
- Body: JSON con syntax highlighting + copy button.

### `<TryItPanel>`
Panel interactivo lateral derecho. **Activable desde el botón Try it del `<EndpointHeader>`.**
- Inputs: campos generados dinámicamente desde los parámetros del endpoint (path params + query params + headers + body).
- Campo `x-api-key`: input password con placeholder "Tu API key". Persistido en `localStorage` por sesión (key: `ardua-docs-api-key`), nunca enviado a otro lado que `api.arduasolutions.com`.
- Botón "Run" ejecuta el request real (vía axios) contra `api.arduasolutions.com/{path}`.
- Output: request executed (cURL), response status, response body, latency en ms. Renderiza con los mismos componentes `<CodeBlock>` / `<ResponseExample>`.

## Patrones de página

### Patrón A — Concept page

Páginas conceptuales sin endpoint asociado. Ejemplos: Introduction, Authentication, Errors & rate limits, Versioning.

**Layout 3 columnas:**
- Izquierda: `<Sidebar>` 280px.
- Centro: contenido en prosa, max-width ~720px, padding lateral generoso.
- Derecha: panel de 480px, **opcional**. Si la página tiene un ejemplo de código asociado (Authentication tiene `openssl genrsa ...`), se renderiza ahí. Si no, panel vacío con texto centrado: "No hay código de ejemplo para esta sección" (color `--text-muted`).

**Componentes del contenido central:**
- Título H1 grande.
- Subtítulo opcional (gris secundario, debajo del H1).
- Secciones con H2 (peso 600) y H3 (peso 500).
- Prosa en `--text-secondary`, inline code en `--accent-violet` background soft.
- `<CodeBlock>` para comandos / snippets.
- `<Callout>` para info, warnings, danger.
- Tablas para columnas tipo "Código / Significado" o "Header / Descripción".

**Header sticky (top de la columna central):**
- Título corto de la sección (mismo que el sidebar item) a la izquierda.
- Subtítulo de página a la derecha (gris secundario).
  - Ejemplo: "Authentication" + "Cómo obtener tus credenciales de acceso a la API"

### Patrón B — Endpoint Reference page

Páginas de endpoint individual. Una página por endpoint.

**Layout 3 columnas:**
- Izquierda: `<Sidebar>`.
- Centro: contenido del endpoint, max-width ~720px.
- Derecha: panel fijo de 480px con request example multi-lenguaje + response examples.

**Estructura del contenido central, en orden:**

1. **Header sticky:** `<MethodBadge>` + path mono + título descriptivo del endpoint + subtítulo gris a la derecha.
2. **`<EndpointHeader>`:** método + path + botón Try it.
3. **Descripción** (prosa, 1-3 párrafos).
4. **`<DisclaimerCallout>` si aplica.** Para RFP: variante `referential`.
5. **Sección `Authorizations`** con `<ParamTable>` listando los headers de auth (ej. `x-api-key`).
6. **Sección `Path Parameters`** si tiene.
7. **Sección `Query Parameters`** si tiene.
8. **Sección `Headers`** si tiene custom headers más allá de auth.
9. **Sección `Body`** si tiene.
10. **Sección `Responses`** con un sub-bloque por status code (200, 4xx, 5xx). Cada sub-bloque tiene un mini-tab o accordion para mostrar el schema esperado.

**Estructura del panel derecho:**

1. Tabs de lenguaje (cURL / JavaScript / Python / Go) — recordar la selección del usuario en `localStorage`.
2. Bloque "REQUEST" con el ejemplo de invocación.
3. Bloque "RESPONSE · [status]" con tabs por status code (200, 400, 401, 404, 429, 500). El status code default es 200; los demás aparecen en tabs accesibles.

## Contenido v1 página por página

Copy literal para implementación. Editable solo con aprobación de PM + validación legal (Camila) para cualquier cambio de fondo en lo que toca wording sensible.

### Página: Introduction

**Route:** `/`
**Sidebar entry:** `Introduction`
**Subtítulo derecho:** `Qué es la API de Ardua y cómo empezar`

```
# Bienvenido a la API de Ardua

Las APIs de Ardua te permiten integrarte con nuestra infraestructura
financiera B2B de forma programática. Están diseñadas para ser simples,
predecibles y fáciles de integrar.

Todas las respuestas son en **JSON**, todos los requests usan **HTTPS**,
y la autenticación se hace con una `API_KEY` que te enviamos nosotros
tras un proceso de onboarding seguro.

## Base URL

[CodeBlock plain]
https://api.arduasolutions.com

Todos los endpoints que encontrás en esta documentación usan esta URL
como base.

## Autenticación

Cada request debe incluir tu `API_KEY` en el header `x-api-key`:

[CodeBlock bash]
curl https://api.arduasolutions.com/prices/USDC-ARS \
  -H 'x-api-key: TU_API_KEY'

Si todavía no tenés tu `API_KEY`, seguí los pasos en la sección
[Authentication](/authentication).

## Formato de respuestas

Todas las respuestas exitosas devuelven un objeto JSON con los datos del
recurso solicitado. Los errores también devuelven JSON con un campo
`error` que describe qué salió mal.

[CodeBlock json]
{ "error": "missing API key" }

## Códigos de estado

[Tabla]
| Código | Significado                                |
|--------|--------------------------------------------|
| 200    | OK — el request fue exitoso                |
| 400    | Bad Request — parámetro inválido o faltante|
| 401    | Unauthorized — API key ausente o inválida  |
| 404    | Not Found — el recurso no existe           |
| 429    | Too Many Requests — rate limit excedido    |
| 500    | Internal Server Error — error del lado de Ardua |

## Rate limiting

Cada `API_KEY` tiene un límite de requests por ventana de tiempo. Cuando
lo superás, la API devuelve un `429` e incluye estos headers en la
respuesta:

[Tabla]
| Header                  | Descripción                                   |
|-------------------------|-----------------------------------------------|
| X-RateLimit-Limit       | Máximo de requests permitidos en la ventana   |
| X-RateLimit-Remaining   | Requests restantes en la ventana actual       |
| X-RateLimit-Reset       | Timestamp Unix de cuando se reinicia el contador |
| Retry-After             | Segundos que tenés que esperar antes de reintentar |

## ¿Preguntas?

Escribinos a **tech@arduasolutions.com** — respondemos el mismo día hábil.
```

**Panel derecho:** vacío con leyenda "No hay código de ejemplo para esta sección".

> **Nota de wording legal:** la palabra "FX" y "operaciones de FX" están explícitamente prohibidas en esta página y en todo el portal (ver §Constraints legales). Ante cualquier duda sobre cómo describir una capacidad, consultar a Camila Cattaneo antes de publicar.

### Página: Authentication

**Route:** `/authentication`
**Sidebar entry:** `Authentication`
**Subtítulo derecho:** `Cómo obtener tus credenciales de acceso a la API`

```
# Authentication

Para acceder a la API de Ardua necesitás una `API_KEY` que te enviamos
nosotros. El proceso toma menos de 24 horas.

## Cómo funciona

Usamos un sistema de claves: vos generás dos claves vinculadas entre sí
— una pública y una privada. Nos mandás solo la pública, nosotros la
usamos para encriptar tu `API_KEY` antes de enviártela. Solo tu clave
privada puede abrirla, así garantizamos que nadie más pueda leerla en
el camino.

## Pasos

### 1. Generá tu par de claves

Si ya tenés un par de claves pública/privada, podés usarlas
directamente — pasá al paso 2. Si no, generalas con estos comandos. Vas
a obtener dos archivos: `private.pem` (tu clave privada, guardala en un
lugar seguro) y `public.pem` (tu clave pública, esta es la que nos
mandás).

[CodeBlock bash]
openssl genrsa -out private.pem 4096

[CodeBlock bash]
openssl rsa -in private.pem -pubout -out public.pem

### 2. Envianos tu clave pública

Mandá el archivo `public.pem` a **tech@arduasolutions.com** con el
nombre de tu empresa. En menos de 48 horas te respondemos con tu
`API_KEY` encriptada.

### 3. Desencriptá tu API_KEY

Al recibir nuestra respuesta, usá tu clave privada para desencriptarla:

[CodeBlock bash]
openssl rsautl -decrypt -inkey private.pem -in api_key.enc -out api_key.txt

Tu `API_KEY` va a quedar en el archivo `api_key.txt`, lista para usar
en tus llamadas a la API.

[Callout warning]
El equipo de Ardua **nunca** te va a pedir tu clave privada. Si alguien
lo hace, no la compartas y avisanos de inmediato a
**tech@arduasolutions.com**.

## ¿Dudas?

Escribinos a **tech@arduasolutions.com** — respondemos el mismo día hábil.
```

**Panel derecho:** vacío con leyenda "No hay código de ejemplo para esta sección" (los snippets ya están inline en la columna central porque son los pasos).

### Página: Errors & rate limits

**Route:** `/errors`
**Sidebar entry:** `Errors & rate limits`
**Subtítulo derecho:** `Cómo manejar errores y respetar los rate limits`

Contenido: extraer las dos tablas de la Introduction (Códigos de estado + Rate limiting headers) y profundizarlas con ejemplos de respuesta de error para cada código.

```
# Errors & rate limits

Las APIs de Ardua usan códigos de estado HTTP estándar para indicar el
resultado de cada request. Esta página documenta los códigos que vas a
encontrar, qué los dispara, y cómo manejar el rate limiting.

## Códigos de estado

[Tabla — misma que en Introduction]

## Estructura del error

Todos los errores devuelven JSON con esta forma:

[CodeBlock json]
{
  "error": "descripción del error",
  "code": "OPTIONAL_ERROR_CODE"
}

## Ejemplos por código

### 400 — Bad Request
[CodeBlock json]
{ "error": "Par no válido o no soportado" }

### 401 — Unauthorized
[CodeBlock json]
{ "error": "API key ausente o inválida" }

### 404 — Not Found
[CodeBlock json]
{ "error": "Precio no disponible en este momento" }

### 429 — Too Many Requests
[CodeBlock json]
{ "error": "Rate limit excedido. Revisá los headers X-RateLimit-Remaining y Retry-After." }

### 500 — Internal Server Error
[CodeBlock json]
{ "error": "Error interno. Intentá nuevamente más tarde." }

## Rate limiting

Cada `API_KEY` tiene un límite de requests por ventana de tiempo.
Cuando lo superás, la API devuelve un `429` e incluye estos headers en
la respuesta:

[Tabla — misma que en Introduction]

[Callout info]
Recomendamos implementar **exponential backoff** ante `429`s: esperar el
tiempo indicado por `Retry-After` y duplicarlo en cada reintento.
```

**Panel derecho:** vacío con leyenda "No hay código de ejemplo para esta sección".

### Página: Versioning

**Route:** `/versioning`
**Sidebar entry:** `Versioning`
**Subtítulo derecho:** `Política de versiones y cómo leer el changelog`

```
# Versioning

La API de Ardua sigue **Semantic Versioning** (`MAJOR.MINOR.PATCH`):

- **MAJOR** — cambios incompatibles con versiones anteriores.
- **MINOR** — nuevas capacidades, backwards-compatible.
- **PATCH** — fixes, backwards-compatible.

## Versión actual

La versión actual de la API es **v1.0.0**, indicada en el header del
portal y en la URL base: `https://api.arduasolutions.com`.

## Política de cambios breaking

Antes de introducir un cambio breaking, comunicamos el plan con un
mínimo de **90 días de anticipación** a través de:

- Notificación directa a los integradores activos vía
  `tech@arduasolutions.com`.
- Entrada en el [Changelog](/changelog) marcada con etiqueta
  `[BREAKING]`.

## Deprecación

Las capacidades deprecadas se mantienen funcionales durante un período
de transición no menor a 90 días antes de ser removidas. Durante ese
período, las respuestas incluyen un header `X-Ardua-Deprecation` con la
URL del changelog correspondiente.

## ¿Preguntas?

Escribinos a **tech@arduasolutions.com**.
```

**Panel derecho:** vacío.

### Página: GET /prices/{pair} (RFP)

**Route:** `/api/market-data/get-prices`
**Sidebar entry:** dentro de `MARKET DATA`, item con `<MethodBadge method="GET" />` + `/prices/{pair}`
**Subtítulo derecho:** `Consultá un precio de referencia para un par de activos soportado`

```
# Consultar precio de referencia

GET /prices/{pair}
[Botón Try it]

Devuelve un precio de referencia de **compra** (`buy`) y **venta**
(`sell`) para un par de activos soportado. Los precios son indicativos
y se actualizan en tiempo real.

[DisclaimerCallout variant="referential"]
⚠️ Los precios devueltos son de **carácter referencial** y no
constituyen una oferta ni una obligación de Ardua de operar a esos
valores. Para ejecutar una operación, contactá a la Mesa de Dinero
de Ardua.

## Authorizations

[ParamTable]
| Parámetro  | Tipo   | Ubicación | Requerido | Descripción          |
|------------|--------|-----------|-----------|----------------------|
| x-api-key  | string | HEADER    | ✅        | Tu API key personal. |

## Path Parameters

[ParamTable]
| Parámetro | Tipo   | Requerido | Descripción |
|-----------|--------|-----------|-------------|
| pair      | string | ✅        | Par de activos en formato `{from}-{to}`. En v1 el único par soportado es `USDC-ARS`. |

## Responses

### 200 — Success

[CodeBlock json]
{
  "pair": "USDC-ARS",
  "buy": "1151.23",
  "sell": "1138.67"
}

### 400 — Bad Request
[CodeBlock json]
{ "error": "Par no válido o no soportado" }

### 401 — Unauthorized
[CodeBlock json]
{ "error": "API key ausente o inválida" }

### 404 — Not Found
[CodeBlock json]
{ "error": "Precio no disponible en este momento" }

### 429 — Too Many Requests
[CodeBlock json]
{ "error": "Rate limit excedido. Revisá los headers X-RateLimit-Remaining y Retry-After." }
```

**Panel derecho — Request examples:**

cURL:
```
curl -X GET 'https://api.arduasolutions.com/prices/USDC-ARS' \
  -H 'x-api-key: TU_API_KEY'
```

JavaScript (fetch):
```
const response = await fetch(
  'https://api.arduasolutions.com/prices/USDC-ARS',
  { headers: { 'x-api-key': 'TU_API_KEY' } }
);
const data = await response.json();
```

Python (requests):
```
import requests
response = requests.get(
    'https://api.arduasolutions.com/prices/USDC-ARS',
    headers={'x-api-key': 'TU_API_KEY'}
)
data = response.json()
```

Go (net/http):
```
req, _ := http.NewRequest("GET", "https://api.arduasolutions.com/prices/USDC-ARS", nil)
req.Header.Set("x-api-key", "TU_API_KEY")
resp, _ := http.DefaultClient.Do(req)
```

**Panel derecho — Response examples:** tabs por status code, default 200, con los bodies de arriba.

## Constraints legales

Estos constraints aplican al wording de **toda la documentación pública** y deben respetarse en cualquier endpoint o página futura. Validación final con Camila Cattaneo (Legal & Compliance) antes de cualquier deploy a producción.

### Palabras y frases prohibidas

| Prohibido | Reemplazo permitido |
|---|---|
| "Operaciones de FX" | "Integración con infraestructura financiera" |
| "Cambio de divisas" | "Consulta de precios de referencia entre pares de activos" |
| "Ardua opera al precio devuelto" | "Para operar, contactá a la Mesa de Dinero" |
| "Cotización firme" (en RFP) | "Precio de referencia" / "Precio indicativo" |
| "Divisas" (cuando incluye stablecoins) | "Activos" / "Pares de activos" |
| "Precio vinculante" | "Precio referencial" |

### Disclaimer pattern obligatorio

Cualquier endpoint que devuelva información que pueda interpretarse como oferta comercial debe llevar el componente `<DisclaimerCallout variant="referential" />` (o un override con texto custom validado por Legal) al inicio de la descripción, antes de la sección Authorizations.

Cuando se sumen endpoints adicionales en futuras versiones, **es responsabilidad del PM y Legal validar** si requieren disclaimer y de qué tipo (`referential`, `warning`, etc.). El sistema de variantes existe para que el patrón sea reusable sin redefinir copy.

### Checklist de revisión de wording

Antes de publicar cualquier página nueva:

- [ ] No contiene la palabra "FX" ni "Forex".
- [ ] No describe la API como un servicio para "ejecutar operaciones".
- [ ] Si menciona precios, aclara su carácter referencial (vía `<DisclaimerCallout>` o prosa equivalente).
- [ ] Si menciona stablecoins, no las llama "divisas".
- [ ] Si menciona la Mesa de Dinero, no implica que la API ejecuta operaciones, solo que se contacta para operar.

## Stack técnico

### Heredado de `_core-template-frontend`

- **Vue 3.5** con `<script setup>` + TypeScript strict.
- **Vite 7** como bundler.
- **Vue Router 4** con rutas declaradas explícitamente (no auto-router).
- **Pinia 3** para state global mínimo (si aplica — la mayoría de las páginas son estáticas y no requieren store).
- **Tailwind 4** con configuración extendida (paleta del §Sistema de diseño).
- **shadcn-vue (reka-ui)** como base de componentes primitivos (Dialog, Tabs, Popover, etc.).
- **lucide-vue-next** para iconografía.
- **vue-sonner** para toasts (feedback del copy button, errores del Try it).
- Variables CSS de theming del template (extendidas con tokens propios).

### Descartado del `_core-template-frontend`

- **Layout L1/L2/L3 del backoffice** — se reemplaza por un Layout propio del portal (TopBar + Sidebar + Content + RightPanel).
- **Auth0 (`@auth0/auth0-vue`)** — sitio público, sin auth requerida para navegar.
- **vue-query, axios, tanstack-table, vee-validate, zod** del template — no aplican a docs estáticas.
- **OpenSpec + ardua-skills layers** — el prototipo no es una app del core, no requiere gobernanza OpenSpec.

### Agregado específico para este prototipo

- **Shiki** (preferido) o **highlight.js** para syntax highlighting de code blocks.
- **axios** acotado al `<TryItPanel>` para los requests a `api.arduasolutions.com`.
- **fuse.js** (opcional) para fuzzy search en el sidebar si v1 lo incorpora.
- **JetBrains Mono** o **Fira Code** como fuente mono (cargada vía `@fontsource` o Google Fonts).
- Routing declarativo con las páginas del §Contenido v1.

### Estructura del proyecto sugerida

```
prototypes/docs/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── index.html
├── public/
│   └── logo.svg
└── src/
    ├── main.ts
    ├── App.vue
    ├── router.ts
    ├── styles/
    │   └── tokens.css           ← CSS variables del Sistema de diseño
    ├── layouts/
    │   └── DocsLayout.vue       ← TopBar + Sidebar + Content + RightPanel
    ├── components/
    │   ├── TopBar.vue
    │   ├── Sidebar.vue
    │   ├── MethodBadge.vue
    │   ├── EndpointHeader.vue
    │   ├── CodeBlock.vue
    │   ├── MultiLangCodeBlock.vue
    │   ├── Callout.vue
    │   ├── DisclaimerCallout.vue
    │   ├── ParamTable.vue
    │   ├── ResponseExample.vue
    │   └── TryItPanel.vue
    ├── pages/
    │   ├── IntroductionPage.vue
    │   ├── AuthenticationPage.vue
    │   ├── ErrorsPage.vue
    │   ├── VersioningPage.vue
    │   └── api/
    │       └── market-data/
    │           └── GetPricesPage.vue
    └── content/
        └── (opcional — MDX o Markdown files si conviene separar copy de
             componentes; en v1 puede ser inline en las pages)
```

## Frentes abiertos

- **Decisión de repo definitivo** — alinear con Santiago: repo nuevo dedicado vs subcarpeta del monorepo del RFP/RFQ.
- **Migración a OpenAPI auto-render** — cuando exista un spec OpenAPI 3.x del RFP/RFQ, evaluar reemplazar las páginas hand-coded de endpoint por auto-render.
- **Tabs en top nav** — activarlos cuando entre el segundo universo (probable: Changelog).
- **Búsqueda global ⌘K** — diferido a v2.
- **Light mode** — diferido a v2.
- **Internacionalización** — diferido (v1 solo español argentino).
- **Validación legal final** — Camila debe revisar el portal completo antes de cualquier deploy a producción.

## Referencias

- Discovery origen: `discoveries/ardua-api-documentation-discovery.md`
- Stack heredado: `discoveries/core-template-frontend-discovery.md`
- POC actual: `https://d3rh5lht5hc3iw.cloudfront.net`
- Referencia conceptual: `https://apidocs.bridge.xyz` (Mintlify-based)
- Entity Bridge: `entities/bridge.md` (a completar)
