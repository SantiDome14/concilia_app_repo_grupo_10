# Entities — Convención y criterio

> Última actualización: 2026-05-21

## Propósito

Esta carpeta contiene el **catálogo del ecosistema operativo de Ardua**: cada entidad con la que el grupo opera, documentada desde la perspectiva de **qué capacidades operativas nos habilita** y, en el caso de los reguladores, **qué nos exige y bajo qué condiciones**.

Un archivo de entity responde a la pregunta: **"¿qué nos permite hacer esta entidad, bajo qué condiciones, con qué límites?"**. No es un overview general de la empresa ni un perfil comercial — es el mapeo concreto de las capacidades que desbloquea para nuestra operatoria diaria.

Para los reguladores, la pregunta es: **"¿qué nos exige este organismo, sobre qué entidades del grupo, y con qué implicancia para el diseño de productos?"**

---

## Cuándo se consulta

Según las Project Instructions §11.1:

> **Cuando una entidad es mencionada durante una sesión**, el sistema debe consultar su archivo correspondiente para aterrizar la conversación en contexto operativo real.

Si se menciona una entidad y no existe archivo, el sistema debe flaguearlo y proponer crearlo.

---

## Tipos de entidades

| Tipo | Descripción | Ejemplos |
|---|---|---|
| **Propia** | Entidades legales del grupo Ardua | Haz Pagos, Circuit Pay, Ardua Solutions Corp, Astra Ventures |
| **Proveedor** | Infraestructura financiera que Ardua consume | Binance, Bitso, Bridge, AiPrise |
| **Banco** | Instituciones bancarias que operan cuentas o rails | BIND, COINAG, Banco de Comercio |
| **Partner** | Alianzas operativas y comerciales | Convera, HubSpot |
| **Regulador** | Organismos reguladores y de supervisión que imponen obligaciones sobre las entidades del grupo | BCRA, UIF, CNV, FINTRAC, GIIF |

---

## Formato estándar

Cada archivo sigue esta estructura:

```markdown
# [Nombre de la Entidad]

> Última actualización: [fecha]
> Tipo: Propia | Proveedor | Banco | Partner | Regulador
> Jurisdicción(es): [países relevantes para Ardua]
> Estado de la relación: Activa | En onboarding | Pausada | Histórica

## Qué es
Descripción concisa (3-5 líneas): qué tipo de organización es, licencias
relevantes, rol en el mercado.

## Capacidades que nos habilita  ← para Propia, Proveedor, Banco, Partner
## Entidades del grupo supervisadas + Obligaciones que nos impone  ← para Regulador

## Integración operativa
- Módulos internos que la usan
- Flujo de fondos (si aplica)
- Conciliación
- Integraciones técnicas (APIs, webhooks, flujos n8n)

## Restricciones y condiciones / Implicancia para el diseño de productos
Límites operativos, SLAs, costos, cláusulas críticas, requisitos KYC/compliance.

## Referencias
- Contratos y acuerdos
- Documentación técnica
- Contactos clave
- Flujos relacionados
```

---

## Convención de nombres

```
[nombre-entidad].md
```

Reglas:

- Todo en **kebab-case**.
- Sin prefijos de tipo (el tipo se declara en el header del documento).
- Si la entidad tiene nombre compuesto, los espacios se convierten en guiones.

---

## Cuándo se actualiza

| Evento | Acción |
|---|---|
| Nueva capacidad habilitada por la entidad | Agregar a §Capacidades |
| Cambio en límites, SLAs, o costos | Actualizar §Restricciones |
| Nueva integración técnica | Agregar a §Integración |
| Cambio de estado de la relación (activa → pausada, etc.) | Actualizar header |
| Nuevo contrato o adenda | Referenciar en §Referencias |
| Cambio normativo que afecta obligaciones de reporte | Actualizar §Obligaciones del regulador correspondiente |

---

## Inventario vivo

Lista generada el 2026-05-21.

| Archivo | Tipo | Estado del draft |
|---|---|---|
| `aiprise.md` | Proveedor | Completo |
| `ardua-solutions-corp.md` | Propia | Completo |
| `astra-ventures.md` | Propia | Completo |
| `banco-de-comercio.md` | Banco | Draft inicial |
| `bcra.md` | Regulador | Esqueleto — pendiente Legal |
| `binance.md` | Proveedor | Pendiente |
| `bind.md` | Banco | Draft inicial |
| `bitso.md` | Proveedor | Pendiente |
| `bridge.md` | Proveedor | Completo |
| `circuit-pay.md` | Propia | Completo |
| `cnv.md` | Regulador | Esqueleto — pendiente Legal |
| `coinag.md` | Banco | Draft inicial |
| `convera.md` | Partner | Pendiente |
| `fintrac.md` | Regulador | Esqueleto — pendiente Legal |
| `giif-polonia.md` | Regulador | Esqueleto — pendiente Legal |
| `haz-pagos.md` | Propia | Completo |
| `hubspot.md` | Partner | Completo |
| `uif.md` | Regulador | Esqueleto — pendiente Legal |
