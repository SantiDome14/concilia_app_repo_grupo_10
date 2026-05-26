# TRD — Proveedores de Liquidez

> Última actualización: 2026-05-26
> Estado: En producción — iteración activa
> Discovery de referencia: `discoveries/trd-proveedores-de-liquidez-discovery.md`

---

## Propósito

Proveedores de Liquidez es el módulo de TRD donde la Mesa de Trading registra las compras y ventas de liquidez ejecutadas con brokers externos. Reemplazó la gestión previa en Google Sheets (una pestaña por proveedor) y está en producción desde abril 2026.

Las operaciones registradas aquí tributan al cálculo de Exposición agregada de la Mesa (Σ compras − Σ ventas desde todos los bloques operacionales). El módulo de Home/Exposición Agregada aún no está construido — su dependencia principal (este módulo) ya está cumplida.

---

## Capacidades en producción

### Cards de resumen

Dos cards compuestos en la parte superior del módulo, recalculados server-side con cada cambio de filtro:

**Card 1 — Operaciones:**
Muestra el total de operaciones del período filtrado, con contadores de Pendientes y Recibidas.

**Card 2 — Volumen (USD):**
Muestra Total, BUY y SELL en USD para el período filtrado.

> **Gap activo — REQ-35 (In Review):** el Card 2 no muestra contravalor ARS. El REQ agrega una segunda línea ARS (Total, comprado, vendido) calculada server-side con la misma lógica de filtros.

### Tabla de operaciones

Listado de operaciones con filtros server-side (Proveedor, Estado, Plazo, Período) y paginación. Columnas: Fecha op., Proveedor, Tipo, Par, Monto (base), TC, Contravalor (quote), Plazo, Fecha liq., Estado.

Click en una fila abre el modal de detalle.

### Modal de detalle

Detalle completo de la operación con log de actividad (creación, cambios de estado). Incluye la acción de confirmar recepción si la operación está en estado PENDING.

### Formulario de nueva operación

Campos: Tipo (BUY/SELL), Proveedor, Empresa Ardua, Par de monedas, TC, Plazo, Monto (base), Contravalor (quote), Fecha operación, Fecha liquidación, Nota.

**Cálculo automático bidireccional:** cambiar Monto recalcula Contravalor (Monto × TC = Contravalor); cambiar Contravalor recalcula Monto (Contravalor ÷ TC = Monto). Ambos campos son editables.

**Fecha de liquidación:** se calcula automáticamente según el plazo elegido (T0 = misma fecha, T1 = +1 día hábil, T2 = +2 días hábiles), pero es editable por el operador.

**Par de monedas:** dinámico, default USD/ARS.

**Empresa Ardua:** Circuit Pay, Haz Pagos, Ardua Solutions Corp, Nerghis SRL.

**Separador de miles:** todos los campos numéricos del formulario (Monto, Contravalor, TC) muestran separador de miles (",") en tiempo real mientras el operador ingresa el valor. El valor numérico registrado no se altera. Ver `features/common/formularios.md`.

---

## Ciclo de vida de una operación

```
PENDING → RECEIVED
```

| Estado | Descripción | Acciones disponibles |
|---|---|---|
| PENDING | Operación acordada, liquidación no confirmada | Confirmar recepción (→ RECEIVED) |
| RECEIVED | Liquidación confirmada — tributa a Exposición | Solo lectura |

V1 no incluye edición ni cancelación de operaciones registradas.

---

## Control de acceso

| Rol | Permisos |
|---|---|
| `admin-trd` | Lectura + Escritura + Confirmación |
| `ops-trd` | Lectura + Escritura + Confirmación |
| `quote-creator-trd` | Lectura + Escritura + Confirmación |
| `viewer-trd` | Solo lectura — no puede crear ni confirmar |

---

## Fuera de alcance (v1)

- Gestión del catálogo de proveedores desde la UI (lista predefinida en el sistema)
- Edición de operaciones ya registradas
- Cancelación de operaciones
- Exportación a CSV / Excel
- Vinculación de operaciones con Quotes de clientes
- Soporte para múltiples pares en los cards de resumen (el formulario sí soporta pares dinámicos)

---

## Requerimientos activos

| REQ | Descripción | Estado |
|---|---|---|
| REQ-35 | Contravalor ARS en cards de resumen | In Review |
| REQ-112 | Separador de miles en campos numéricos de carga | BACKLOG |

---

## Decisiones de diseño

| Decisión | Detalle |
|---|---|
| Summary calculado server-side | El backend recalcula el objeto summary con cada request filtrado. No hay agregación client-side. |
| Cards compuestos (2) en lugar de 5 cards individuales | Mejor uso del espacio, agrupación lógica más clara que los 5 cards del prototipo original. |
| Par de monedas dinámico | A diferencia del prototipo (CABLE/MEP hardcoded), producción usa selector dinámico con default USD/ARS. |
| Cálculo bidireccional de montos | Cambiar Monto recalcula Contravalor y viceversa. Ambos campos son editables simultáneamente. |
| Fecha liquidación auto-calculada pero editable | El plazo calcula automáticamente considerando días hábiles; el operador puede sobreescribirla. |
| Empresa Ardua como campo estático | Hardcoded en frontend: Circuit Pay, Haz Pagos, Ardua Solutions Corp, Nerghis SRL. Potencial punto de refactor futuro. |

---

## Frentes abiertos

- **Home + Exposición Agregada** — la dependencia principal (este módulo) está cumplida. Pendiente de iniciar discovery y REQ.
- **REQ-35** — Contravalor ARS en cards, en revisión.
- **REQ-112** — Separador de miles en campos numéricos, en backlog.
- **v2** — Edición y cancelación de operaciones: pendiente de evaluar con la Mesa.
