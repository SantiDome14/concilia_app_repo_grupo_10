# Features — Convención y criterio

> Última actualización: 2026-04-23

## Propósito

Esta carpeta contiene las **feature specifications** de Ardua: el output consolidado de un discovery cerrado. Cada archivo define **qué construir** para una feature o producto específico, con el nivel de detalle necesario para que Tecnología pueda proceder al diseño técnico y la implementación.

Un feature spec responde a la pregunta: **"¿qué tenemos que construir, con qué alcance, y cómo vamos a saber que funciona?"**. No incluye modelos de datos, contratos de API, ni decisiones arquitectónicas — esas viven en el PRD técnico bajo ownership de Tecnología.

---

## Relación con discovery

El flujo natural es:

```
discovery/opened/[aplicacion]-[feature]-discovery.md
         ↓  (cuando el discovery madura)
features/[aplicacion]-[feature].md          ← se genera aquí
         ↓
discovery/closed/[aplicacion]-[feature]-discovery.md   ← el discovery se archiva
```

Un feature spec existe porque un discovery se consolidó. No se escribe un feature spec directamente sin pasar por discovery.

---

## Formato estándar

Según las Project Instructions §4.3:

- **Context** — problema que resuelve y contexto operativo
- **Objective** — objetivo funcional en bullets
- **Functional scope (numbered)** — lista numerada de ítems que constituyen la feature
- **Out of scope** — qué queda explícitamente fuera
- **Acceptance criteria** — cómo se valida que la feature funciona

**No incluye:** modelos de datos, endpoints, contratos de API, decisiones arquitectónicas, flujos de implementación. Esos elementos viven en el PRD técnico.

---

## Convención de nombres

```
[aplicacion]-[feature].md
```

Reglas:

- Todo en **kebab-case**.
- El prefijo `[aplicacion]-` alinea con la aplicación del core de origen (TRD, OPS, LEX, CLP, COM, FIN) o con el nombre del producto si es transversal.
- Si la feature es multi-aplicación o un producto completo, el prefijo refleja el producto (ej: `prime-desk-rfq-gateway.md`, `ardua-pnl-report.md`).

**Ejemplos:**

```
com-pipeline-comercial.md              ← feature dentro de la aplicación COM
ardua-pnl-report.md                    ← producto/skill transversal
prime-desk-rfq-gateway.md              ← producto completo multi-aplicación
```

---

## Versionado (`v[N]`)

- `v1` se omite. La primera versión no lleva sufijo.
- El sufijo `v[N]` aparece **solo ante forks reales** — pivotes, cambios de dirección, scope significativamente redefinido.
- Iteraciones menores dentro de la misma dirección se hacen en el mismo archivo, con changelog interno.

```
features/trd-proveedores-de-liquidez.md          ← versión inicial
features/trd-proveedores-de-liquidez-v2.md       ← solo si hubo pivote
```

---

## Inventario vivo

Lista generada el 2026-04-23. Regenerar manualmente cuando se agreguen o renombren archivos.

| Archivo | Discovery de origen | Estado |
|---|---|---|
| `ardua-pnl-report.md` | `discovery/closed/pnl-discovery.md` | Spec validado · Pendiente construcción |
| `com-pipeline-comercial.md` | `discovery/opened/com-discovery.md` | En refinamiento |
| `prime-desk-rfq-gateway.md` | `discovery/closed/rfq-prime-desk-discovery.md` | Ready for Dev (REQ-8, REQ-9, REQ-30, REQ-31) |
