# Entities — Convención y criterio

> Última actualización: 2026-04-23

## Propósito

Esta carpeta contiene el **catálogo del ecosistema operativo de Ardua**: cada entidad con la que el grupo opera, documentada desde la perspectiva de **qué capacidades operativas nos habilita**.

Un archivo de entity responde a la pregunta: **"¿qué nos permite hacer esta entidad, bajo qué condiciones, con qué límites?"**. No es un overview general de la empresa ni un perfil comercial — es el mapeo concreto de las capacidades que desbloquea para nuestra operatoria diaria.

---

## Cuándo se consulta

Según las Project Instructions §10.1:

> **Cuando una entidad es mencionada durante una sesión**, el sistema debe consultar su archivo correspondiente para aterrizar la conversación en contexto operativo real.

Si se menciona una entidad y no existe archivo, el sistema debe flaguearlo y proponer crearlo.

---

## Tipos de entidades

| Tipo | Descripción | Ejemplos |
|---|---|---|
| **Propia** | Entidades legales del grupo Ardua | Haz Pagos, Circuit Pay, Ardua Solutions Corp, Astra Ventures |
| **Proveedor** | Infraestructura financiera que Ardua consume | Binance, Bitso, Bridge |
| **Banco** | Instituciones bancarias que operan cuentas o rails | Brubank, BIND, COINAG, Banco de Comercio |
| **Partner** | Alianzas operativas y comerciales | Convera |

---

## Formato estándar

Cada archivo sigue esta estructura:

```markdown
# [Nombre de la Entidad]

> Última actualización: [fecha]
> Tipo: Propia | Proveedor | Banco | Partner
> Jurisdicción(es): [países relevantes para Ardua]
> Estado de la relación: Activa | En onboarding | Pausada | Histórica

## Qué es
Descripción concisa (3-5 líneas): qué tipo de organización es, licencias
relevantes, rol en el mercado.

## Capacidades que nos habilita
Corazón del documento. Lista de capacidades operativas concretas.
- **[Capacidad]**: qué nos permite hacer | bajo qué condiciones | con qué límites

## Integración operativa
- Módulos internos que la usan
- Flujo de fondos (si aplica)
- Conciliación
- Integraciones técnicas (APIs, webhooks, flujos n8n)

## Restricciones y condiciones
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

**Ejemplos:**

```
haz-pagos.md
circuit-pay.md
ardua-solutions-corp.md
astra-ventures.md
binance.md
bitso.md
bridge.md
convera.md
brubank.md
bind.md
coinag.md
banco-de-comercio.md
```

---

## Cuándo se actualiza

| Evento | Acción |
|---|---|
| Nueva capacidad habilitada por la entidad | Agregar a §Capacidades |
| Cambio en límites, SLAs, o costos | Actualizar §Restricciones |
| Nueva integración técnica | Agregar a §Integración |
| Cambio de estado de la relación (activa → pausada, etc.) | Actualizar header |
| Nuevo contrato o adenda | Referenciar en §Referencias |

---

## Inventario vivo

Lista generada el 2026-04-23. Regenerar manualmente cuando se agreguen o renombren archivos.

| Archivo | Tipo | Estado del draft |
|---|---|---|
| `ardua-solutions-corp.md` | Propia | Draft inicial |
| `banco-de-comercio.md` | Banco | Draft inicial |
| `binance.md` | Proveedor | Pendiente |
| `bind.md` | Banco | Draft inicial |
| `bitso.md` | Proveedor | Pendiente |
| `bridge.md` | Proveedor | Pendiente |
| `circuit-pay.md` | Propia | Draft inicial |
| `coinag.md` | Banco | Draft inicial |
| `convera.md` | Partner | Pendiente |
| `haz-pagos.md` | Propia | Draft inicial |
