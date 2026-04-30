# Features — Convención y criterio

> Última actualización: 2026-04-29

## Propósito

Esta carpeta contiene las **feature specifications** de Ardua: el output consolidado de un discovery archivado. Cada archivo define **qué construir** para una feature o producto específico, con el nivel de detalle necesario para que Tecnología pueda proceder al diseño técnico y la implementación.

Un feature spec responde a la pregunta: **"¿qué tenemos que construir, con qué alcance, y cómo vamos a saber que funciona?"**. No incluye modelos de datos, contratos de API, ni decisiones arquitectónicas — esas viven en el PRD técnico bajo ownership de Tecnología.

---

## Relación con discovery

El flujo natural es:

```
discovery/active/[aplicacion]-[feature]-discovery.md
         ↓  (cuando el discovery madura)
features/[aplicacion]-[feature].md           ← se genera aquí
         ↓
discovery/archived/[aplicacion]-[feature]-discovery.md   ← el discovery se archiva
```

Un feature spec existe porque un discovery se consolidó. No se escribe un feature spec directamente sin pasar por discovery.

**Trazabilidad por nombre:** el nombre del archivo de discovery archivado debe coincidir con el nombre del feature (más el sufijo `-discovery`). Ver `discovery/README.md` §"Alineación de nombre con feature".

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
- **ASCII only** — sin acentos, sin `ñ`, sin caracteres especiales. Set permitido: `[a-z0-9-]`.
- El prefijo `[aplicacion]-` alinea con la aplicación del core de origen (TRD, OPS, LEX, CLP, COM, FIN) o con el nombre del producto si es transversal.
- Si la feature es multi-aplicación o un producto completo, el prefijo refleja el producto (ej: `prime-desk-rfq-gateway.md`, `ardua-pnl-report.md`).

**Ejemplos:**

```
com-pipeline-comercial.md              ← feature dentro de la aplicación COM
ardua-pnl-report.md                    ← producto/skill transversal
prime-desk-rfq-gateway.md              ← producto completo multi-aplicación
```

---

## Versionado

El versionado lo maneja **Git**. Los feature specs no llevan sufijos `v[N]` para iteraciones normales — el historial vive en el log de commits.

El sufijo `v[N]` se reserva **solo para forks conceptuales reales**: pivotes, cambios de dirección, scope significativamente redefinido. En ese caso se crea un archivo nuevo con el sufijo (ej: `trd-proveedores-de-liquidez-v2.md`) y el original se mantiene como referencia histórica.

---

## Inventario vivo

Lista generada el 2026-04-29. Regenerar manualmente cuando se agreguen o renombren archivos.

| Archivo | Discovery de origen | Estado |
|---|---|---|
| `ardua-pnl-report.md` | `discovery/archived/pnl-discovery.md` | Spec validado · Pendiente construcción |
| `com-pipeline-comercial.md` | `discovery/active/com-discovery.md` | En refinamiento |
| `prime-desk-rfq-gateway.md` | `discovery/archived/prime-desk-rfq-gateway-discovery.md` | Ready for Dev (REQ-8, REQ-9, REQ-30, REQ-31) |
