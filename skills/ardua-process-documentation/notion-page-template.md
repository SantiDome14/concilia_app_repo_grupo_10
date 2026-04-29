# Notion Page Template — Proceso de Negocio

Template en Notion Markdown para crear páginas de proceso. Usar en el Paso 7 del skill.
Omitir cualquier sección que no aplique — no dejar secciones vacías en el documento final.

---

## Propiedades de la página

```
title: "🔄 [Nombre del proceso]"
icon: "🔄"
```

---

## SECCIÓN 1 — Encabezado y metadata (siempre presente)

```
> [Descripción de una línea: qué hace este proceso y para qué existe]

---

## 📋 Metadata

| Campo | Valor |
|-------|-------|
| Área | [área] |
| Entidad | [Haz Pagos / Circuit Pay / Ardua Corp / Astra Ventures / Todas] |
| Nivel de seguridad | [Uso Interno / Confidencial / Restringido] |
| Owner | [nombre y rol — responsable operativo del proceso] |
| Elaborado por | [nombre y rol — quien redactó este documento] |
| Frecuencia | [diario / semanal / mensual / a demanda / por evento] |
| Complejidad | [Simple / Media / Alta] |
| Estado | Borrador |
| Versión | 1.0 |
| Fecha de creación | [fecha actual] |
| Próxima revisión | [fecha estimada] |
| Revisor | [nombre o "Owner"] |
| Normativa aplicable | [UIF / BCRA / AFIP / CNV / N/A] |
```

---

## SECCIÓN 2 — Objetivo, alcance y actores (siempre presente)

```
---

## 🎯 Objetivo

[Qué problema resuelve este proceso y qué resultado produce cuando funciona bien]

## 🏢 Alcance

[A quiénes aplica: áreas, entidades, tipos de clientes, geografías, etc.]

## ▶️ Inicio

[Qué dispara el proceso: evento, fecha, pedido, canal, situación concreta]

## 🏁 Fin

[Señal o condición que indica que el proceso se completó correctamente]

---

## 👥 Roles y responsabilidades

| Rol | Área | Responsabilidad en el proceso |
|-----|------|-------------------------------|
| [Rol 1 — Owner] | [área] | Responsable del proceso completo |
| [Rol 2] | [área] | [qué hace específicamente] |
| [Rol 3] | [área] | [qué hace específicamente] |

Dependencias externas: [Otras áreas, terceros o proveedores. Omitir si no hay.]
```

---

## SECCIÓN 3 — Herramientas (siempre presente)

```
---

## 🛠️ Herramientas y sistemas

| Herramienta | Uso en el proceso | Acceso requerido |
|-------------|-------------------|------------------|
| [herramienta 1] | [para qué se usa en este proceso] | [quién necesita acceso] |
| [herramienta 2] | [para qué se usa] | |
```

---

## SECCIÓN 4 — Requisitos previos

Incluir si hay documentación, datos o condiciones necesarias antes de iniciar.

```
---

## ✅ Requisitos previos

[Qué debe estar listo o disponible antes de iniciar]

### Documentación requerida

| Tipo de cliente / caso | Documentos requeridos | Obligatorio / Opcional |
|------------------------|----------------------|------------------------|
| [Tipo 1, ej: Persona Física] | [lista de documentos] | [Obligatorio] |
| [Tipo 2, ej: Persona Jurídica] | [lista de documentos] | [Obligatorio] |
| [Tipo 3, ej: Sociedad offshore] | [lista de documentos] | |
```

---

## SECCIÓN 5a — Pasos del proceso (flujo único)

Usar para procesos lineales sin bifurcaciones significativas.

```
---

## 📋 Pasos del proceso

| N° | Paso | Ejecuta | Herramienta | Notas / Alertas |
|----|------|---------|-------------|-----------------|
| 1 | [descripción del paso] | [rol] | [herramienta] | [notas, decisiones] |
| 2 | [descripción del paso] | [rol] | | |
```

---

## SECCIÓN 5b — Pasos del proceso (flujos múltiples)

Usar cuando el proceso varía según canal, tipo de cliente, entidad u otra condición.

```
---

## 📋 Pasos del proceso

> Este proceso tiene variantes según [canal / tipo de cliente / condición].
> Seguí el flujo que corresponde a tu caso.

---

### Flujo A — [nombre, ej: "Clientes vía Telegram / Referenciadores"]

[Descripción breve de cuándo aplica este flujo]

| N° | Paso | Ejecuta | Herramienta | Notas / Alertas |
|----|------|---------|-------------|-----------------|
| 1 | [paso] | [rol] | [herramienta] | |
| 2 | ... | | | |

---

### Flujo B — [nombre, ej: "Clientes vía Trello / Canal Comercial"]

[Descripción breve de cuándo aplica]

| N° | Paso | Ejecuta | Herramienta | Notas / Alertas |
|----|------|---------|-------------|-----------------|
| 1 | [paso] | [rol] | [herramienta] | |
| 2 | ... | | | |
```

---

## SECCIÓN 6 — Alertas y restricciones críticas

Incluir cuando hay reglas de cumplimiento obligatorio, restricciones normativas, o errores frecuentes de alto impacto.

```
---

## 🚨 Alertas y restricciones críticas

- [Alerta 1]: [descripción de la restricción]
- [Alerta 2]: [descripción]
- Normativa: [indicar de dónde proviene si aplica: UIF, BCRA, AFIP, etc.]
```

---

## SECCIÓN 7 — Nomenclatura y estándares

Incluir cuando el proceso genera archivos, registros o entradas con formato estandarizado.

```
---

## 📁 Nomenclatura y estándares

| Tipo | Nombre estándar | Formato | Ejemplo |
|------|----------------|---------|---------|
| [tipo de documento] | [estructura del nombre] | [PDF / JPG / XLS] | [ejemplo real] |
```

---

## SECCIÓN 8 — Excepciones y casos especiales

Incluir cuando hay situaciones fuera del flujo normal con acciones definidas.

```
---

## ⚠️ Excepciones y casos especiales

| Caso | Qué hacer |
|------|-----------|
| [caso especial 1] | [acción concreta] |
| [caso especial 2] | [acción concreta] |
```

---

## SECCIÓN 9 — Criterios de éxito e historial (siempre presente)

```
---

## 📊 Criterios de éxito

[Indicadores o señales que confirman que el proceso funcionó bien]

---

## 🔄 Historial de versiones

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0 | [fecha] | Versión inicial | [nombre] |

---

*Documentado con Claude · Área: [área] · Estado: Borrador · Ardua Solutions*
```

---

## Guía de secciones: cuándo incluir cada una

| Sección | Incluir cuando... |
|---------|-------------------|
| Metadata + Objetivo/Inicio/Fin + Roles + Herramientas | Siempre |
| Requisitos previos + tabla de documentos | El proceso involucra recopilar o validar documentación |
| Flujo único (5a) | Proceso lineal sin variantes significativas |
| Flujos múltiples (5b) | El proceso varía según canal, tipo de cliente, entidad o condición |
| Alertas y restricciones críticas | Hay reglas de cumplimiento, restricciones normativas, o errores de alto impacto |
| Nomenclatura y estándares | El proceso genera archivos o registros con formato estandarizado |
| Excepciones | Hay situaciones fuera del flujo normal con acciones definidas |
| Criterios de éxito + historial | Siempre |

## Valores de referencia

**Complejidad:**
- Simple — flujo único, ≤8 pasos, sin bifurcaciones
- Media — 1-2 variantes o 9-15 pasos
- Alta — múltiples flujos, dependencias normativas, o >15 pasos

**Estado:** Borrador → En revisión → Aprobado / En definición / Desactualizado

**Próxima revisión:** Mensual (+1 mes), Trimestral (+3), Semestral (+6), o "Ante cambios de proceso"

---

## TEMPLATE B — FLUJO OPERATIVO FINANCIERO (Operations)

Usar para páginas en la DB "Flujos" de Operations. Sigue la estructura de la **Política de Documentación de Flujos Operativos** de Ardua.

Omitir secciones que no apliquen — nunca dejar secciones vacías excepto como placeholders explícitos de adjuntos o secciones del core marcadas con ⚠️.

---

### Párrafo introductorio

```
[3–5 oraciones describiendo: qué operatoria describe el flujo, qué entidades participan en qué carácter regulatorio, cuál es el propósito del movimiento de fondos]
```

---

### Partes intervinientes

```
---

## Partes intervinientes

| Entidad | Rol regulatorio | Función en el flujo |
|---------|----------------|---------------------|
| [Entidad] | [ej: PSP — BCRA Nro. 34649] | [Función específica en la operatoria] |
| [Entidad] | [ej: PSAV — regulada por CNV] | [Función específica] |
| [Actor externo, ej: Cliente] | [Persona humana o jurídica] | [Función] |
```

---

### Diagrama del flujo (ASCII)

```
---

## Diagrama del flujo
```javascript
[Entidad A]
  │
  │  (1) [Descripción del paso]
  ▼
[Entidad B]  ([Rol — Regulador])
  │
  │  (2) [Descripción del paso]
  ▼
[Entidad C]
```
```

---

### Descripción del flujo

```
---

## Descripción del flujo

**Paso 1 — [Nombre del paso]**
[Qué sucede, quién lo ejecuta, qué sistema o cuenta interviene, condiciones o controles relevantes]

**Paso 2 — [Nombre del paso]**
[Descripción]
```

---

### Estructura de cobro

```
---

## Estructura de cobro

| Sociedad | Rol | Concepto | Monto / % | Moneda | Observaciones |
|----------|-----|----------|-----------|--------|---------------|
| [entidad] | [rol] | [concepto] | [monto o %] | [moneda] | [obs] |
| [entidad que no cobra] | [rol] | — | — | — | No cobra en el marco de este flujo. |
```

---

### Segregación de fondos (solo si hay fondos de clientes)

```
---

## Segregación de fondos

> ⚠️ **Principio operativo clave.** Los fondos de clientes deben mantenerse segregados de los fondos propios de cada entidad interviniente en todo momento.

| Entidad | Requerimiento |
|---------|---------------|
| [entidad] | [qué cuentas deben estar segregadas y de qué otros fondos] |
```

---

### Bancos e infraestructura involucrada

```
---

## Bancos e infraestructura involucrada

| Entidad | Banco / Proveedor | Tipo de cuenta | Uso en el flujo |
|---------|------------------|----------------|-----------------|
| [entidad] | [banco o proveedor] | [CVU / CBU Pool / cuenta corriente / wallet / cuenta en el exterior / etc.] | [uso específico en la operatoria] |
```

---

### Documentación respaldatoria

Usar este bloque por cada documento. Para documentos disponibles, solo listar con descripción. Para documentos pendientes, incluir el placeholder de adjunto.

```
---

## Documentación respaldatoria

**[Nombre del contrato o documento]** ⚠️ Pendiente adjuntar
[Descripción breve de qué regula este documento — ej: regula el mandato de Haz Pagos como recaudador de Circuit Pay]

> 📎 **Adjuntar aquí:** [nombre del documento]. En Notion, hacé clic en el ícono ＋ de esta sección o arrastrá el archivo directamente sobre este bloque.

**KYC y origen de fondos**
[Sistema que gestiona el KYC (ej: AIPRISE, LEX). Indicar que ambas entidades son sujetos obligados ante la UIF si aplica.]

**Facturación**
[Quién emite factura, a quién, con qué detalle requerido por normativa]
```

---

### Marco regulatorio

```
---

## Marco regulatorio

| Normativa | Entidad alcanzada | Descripción |
|-----------|------------------|-------------|
| BCRA — PSPs | [entidad] | [qué regula en este flujo] |
| CNV — PSAVs | [entidad] | [qué regula] |
| UIF — PLA/FT | [entidades] | Prevención de lavado de activos y financiamiento del terrorismo |
```

---

### Flujo en el core tecnológico

```
---

## Flujo en el core tecnológico

[Párrafo introductorio: qué módulos intervienen, qué objeto central trackea la operación, cuál es el evento que da inicio al ciclo en el sistema]

### Objetos del core involucrados

| Objeto | Módulo | Descripción |
|--------|--------|-------------|
| [objeto] | [TRD / OPS / LEX / FIN] | [descripción y rol en el flujo] |

### Ciclo de vida de la transacción

```javascript
[Estado A]
  │  [Evento que dispara la transición]
  ▼
[Estado B]
  │  [Acción o evento]
  ▼
Settled / Failed
```

### Movimiento de fondos interno

| Paso | Cuenta origen (core) | Cuenta destino (core) | Concepto |
|------|--------------------|----------------------|----------|
| 1 | [cuenta origen] | [cuenta destino] | [concepto del movimiento] |

### Eventos y triggers del sistema

| Evento | Disparado por | Acción resultante |
|--------|--------------|-------------------|
| [evento] | [sistema / acción manual de Ops / webhook externo] | [qué acción desencadena] |

### Conciliación

- **Automática:** [qué cruza el sistema, con qué lógica y umbral de tolerancia]
- **Manual:** [qué reconcilia Ops, con qué frecuencia, quién lo ejecuta]
- **Excepciones:** [qué constituye una excepción, cómo se detecta, a quién se escala y con qué plazo]
```

---

## Guía de templates: cuándo usar cada uno

| Template | Usar cuando... |
|---------|----------------|
| Template A (proceso genérico) | HR, Sales, Finance, Marketing, IT — procesos operativos internos de cualquier área |
| Template B (flujo operativo financiero) | Operations — procesos que involucran movimiento de fondos, activos digitales o instrucciones entre entidades del grupo |
