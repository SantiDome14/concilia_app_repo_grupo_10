# ardua-docs

> Prototipo del portal público **Ardua API Documentation** — `docs.arduasolutions.com`.

Implementación 100% propia (sin Mintlify ni otras SaaS) de la documentación pública de las APIs B2B de Ardua. Inspirado conceptualmente en `apidocs.bridge.xyz` pero construido sobre el stack del core de Ardua.

Este prototipo vive bajo `prototypes/docs/` del framework de PM y se itera hasta convertirse en el sitio que se despliega en producción.

---

## Setup

```bash
nvm use            # 20.19.0+
npm install
npm run dev        # http://localhost:5173
```

Build de producción:

```bash
npm run type-check
npm run build
npm run preview
```

---

## Stack

- **Vue 3.5** + `<script setup>` + TypeScript strict
- **Vite 7** como bundler
- **Vue Router 4** con rutas declaradas explícitamente
- **Tailwind 4** + tokens CSS propios (`src/styles/tokens.css`)
- **reka-ui** como base de primitivos (vía shadcn-vue)
- **lucide-vue-next** para iconografía
- **Shiki** para syntax highlighting (theme `github-dark-default`)
- **axios** acotado al `<TryItPanel>` para los requests reales contra `api.arduasolutions.com`
- **vue-sonner** para toasts (feedback del Copy button, errores del Try It)
- **@fontsource/{inter,poppins,jetbrains-mono}** — fuentes locales sin trackers

Sin Auth0 / Pinia / vue-query / tanstack-table / vee-validate / zod / OpenSpec. Son artefactos heredados del template de backoffice que **no aplican** a un sitio público de docs (ver [feature spec](../../features/common/ardua-api-documentation.md), §Stack técnico).

---

## Alcance v1

5 páginas navegables (dark mode default, español argentino):

| Ruta | Página | Patrón |
|---|---|---|
| `/` | Introduction | A (Concept) |
| `/authentication` | Authentication | A (Concept) |
| `/errors` | Errors & rate limits | A (Concept) |
| `/versioning` | Versioning | A (Concept) |
| `/api/market-data/get-prices` | `GET /prices/{pair}` (RFP) | B (Endpoint Reference) |

Componentes implementados: `TopBar`, `Sidebar`, `MethodBadge`, `EndpointHeader`, `CodeBlock`, `MultiLangCodeBlock`, `Callout`, `DisclaimerCallout`, `ParamTable`, `ResponseExample`, `TryItPanel`. Además `PageShell` orquesta el layout (header sticky + columna central + right panel opcional) y `DocSection` / `DocTable` ayudan a la prosa.

### Diferido a v2+

- Búsqueda global (⌘K)
- Tabs en topbar (Get Started / API Reference / Changelog)
- Light mode
- "Ask AI" embebido
- Internacionalización (en/es)
- Postman collection
- Auto-render de OpenAPI specs

---

## TryItPanel y CORS

El botón **Try it** del endpoint `GET /prices/{pair}` ejecuta un request real con `axios` directamente al browser → `https://api.arduasolutions.com`. Eso requiere que el backend devuelva headers CORS apropiados.

- **En producción** (`docs.arduasolutions.com` ↔ `api.arduasolutions.com`) ambos subdominios son del mismo dominio root, así que se puede configurar CORS en el origen o evitarlo del todo con un reverse proxy.
- **En dev local** (`localhost:5173` ↔ `api.arduasolutions.com`) si CORS no está habilitado, el navegador bloquea la respuesta. El `TryItPanel` muestra un mensaje de error con sugerencia. Si se necesita probar contra la API real en dev sin tocar el backend, agregar un proxy en `vite.config.ts`:

  ```ts
  server: {
    proxy: {
      '/_proxy': {
        target: 'https://api.arduasolutions.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/_proxy/, ''),
      },
    },
  }
  ```

La `x-api-key` se persiste en `localStorage` (key: `ardua-docs-api-key`) y **nunca** se envía a otro lugar que `api.arduasolutions.com`.

---

## Constraints legales (no-negotiables)

Antes de tocar cualquier copy de las páginas:

1. **No usar "FX" ni "Forex"** en ningún lado del portal.
2. **No describir la API como un servicio para "ejecutar operaciones"** — la API es de consulta; la operación se gestiona vía Mesa de Dinero.
3. **`<DisclaimerCallout variant="referential" />` es OBLIGATORIO** en cualquier endpoint que devuelva precios (RFP).
4. **No usar "divisas" para stablecoins** — usar "activos" o "pares de activos".
5. **No prometer "cotización firme"** en RFP — usar "precio referencial" o "precio indicativo".

La lista completa de palabras prohibidas + reemplazos permitidos está en el feature spec § "Constraints legales". Validación legal final con **Camila Cattaneo** antes de cualquier deploy a producción.

---

## Fuente única de verdad

- **Feature spec:** [`features/common/ardua-api-documentation.md`](../../features/common/ardua-api-documentation.md)
- **Discovery:** [`discoveries/ardua-api-documentation-discovery.md`](../../discoveries/ardua-api-documentation-discovery.md)

Cualquier ambigüedad o cambio de fondo se resuelve actualizando primero el feature spec; este prototipo se itera contra esa fuente.

---

## Estructura

```
src/
├── App.vue
├── main.ts
├── router/
│   ├── index.ts          ← rutas declarativas
│   └── navigation.ts     ← árbol del sidebar
├── styles/
│   ├── tokens.css        ← CSS variables del Sistema de Diseño
│   └── globals.css       ← Tailwind + base + prose-doc
├── layouts/
│   └── DocsLayout.vue    ← TopBar + Sidebar + slot del page
├── components/
│   ├── TopBar.vue
│   ├── Sidebar.vue
│   ├── PageShell.vue
│   ├── MethodBadge.vue
│   ├── EndpointHeader.vue
│   ├── CodeBlock.vue
│   ├── MultiLangCodeBlock.vue
│   ├── Callout.vue
│   ├── DisclaimerCallout.vue
│   ├── ParamTable.vue
│   ├── ResponseExample.vue
│   ├── TryItPanel.vue
│   ├── DocSection.vue
│   └── DocTable.vue
├── pages/
│   ├── IntroductionPage.vue
│   ├── AuthenticationPage.vue
│   ├── ErrorsPage.vue
│   ├── VersioningPage.vue
│   ├── NotFoundPage.vue
│   └── api/market-data/GetPricesPage.vue
└── lib/
    ├── cn.ts             ← clsx + tailwind-merge
    └── shiki.ts          ← highlighter singleton
```
