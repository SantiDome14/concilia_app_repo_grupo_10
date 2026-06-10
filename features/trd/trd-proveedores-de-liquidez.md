# TRD — Proveedores de Liquidez

> Última actualización: 2026-06-10
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

## Control de desvío de TC (PWI-74 — IN ANALYSIS)

Extensión incorporada por PWI-74. Agrega FX Pantalla como referencia de mercado en el formulario y un control de desvío sobre el campo TC.

### FX Pantalla en Proveedores

Al seleccionar el par de monedas, el sistema obtiene el precio de referencia de mercado desde `GET /fx-rate?pair_id={id}` y lo incorpora como campo FX Pantalla dentro de la sección INSTRUMENTO, por debajo del grid Par+Plazo.

- El campo es editable. Se auto-pobla con el precio del proveedor activo al seleccionar el par.
- Chips de proveedor (Binance, Matriz): muestran los precios disponibles. Click en un chip copia ese precio al campo FX Pantalla. El chip activo (`.on`) queda visualmente resaltado.
- El precio se refresca automáticamente cada 5 segundos mientras el formulario esté abierto. Cada chip muestra su propia barra de progreso con el tiempo restante.
- Si el feed no devuelve precio para el par seleccionado (estado 4), el campo aparece vacío y editable. El trader puede ingresar un valor de referencia manualmente.

**Campo TC:** pasa a ocupar una fila de ancho completo dentro de INSTRUMENTO, por debajo del bloque FX Pantalla.

**Pares cripto/ARS:** el sistema intenta obtener el precio directamente del endpoint. Si no está disponible como par directo, calcula el cross en el frontend: BTC/ARS = BTC/USDT × USD/ARS. Confirmar en refinement técnico si el endpoint cubre BTC/ARS directamente (P-02 — ver `discoveries/trd-controles-tc-discovery.md`).

### Comportamiento del control

Al abandonar el campo TC (on blur), el sistema compara el valor ingresado contra el FX Pantalla disponible. Si el desvío supera el 3% en cualquier dirección, se muestra una alerta que requiere confirmación explícita para proceder. La operación no se bloquea si el trader confirma.

Si el campo FX Pantalla está vacío, el sistema informa al usuario y permite continuar sin el control.

### Estados del formulario

| Estado | Descripción | Cambios visuales |
|---|---|---|
| 1 — Sin desvío | TC dentro del rango ±3% | Sin alerta. CTA verde normal ("Guardar operación"). |
| 2 — TC desviado | Desvío supera el ±3% | Alerta ámbar inline. Borde ámbar en TC, bloque FX y Contravalor. CTA ámbar ("Guardar con desvío" + `ti-alert-triangle`). |
| 3 — Confirmación | Trader clickeó CTA con desvío activo | Modal con overlay oscuro y tabla resumen (Par, Tipo, FX referencia, Rango aceptable, TC con desvío en ámbar, Proveedor). |
| 4 — Sin referencia | FX Pantalla vacío (feed no disponible) | Aviso ámbar dentro del bloque FX Pantalla. Campo visible y editable (vacío). TC y CTA en estado normal. |

### Wording

| Elemento | Texto |
|---|---|
| Alerta inline | "TC [X] supera el rango aceptable de ±3% en [Y]%" |
| CTA con desvío | "Guardar con desvío" + icono `ti-alert-triangle` |
| Modal — título | "Confirmar operación con TC fuera del rango" |
| Modal — descripción | "Revisá los datos antes de confirmar. El TC registra un desvío significativo respecto al precio de referencia." |
| Modal — botón confirmar | "Confirmar operación" |
| Estado 4 — aviso | "Sin referencia disponible para este par. Podés ingresar un valor de referencia manualmente." |

### Decisiones de diseño validadas (Facundo Vasques)

| Decisión | Resolución | Fecha |
|---|---|---|
| La operación aprobada con desvío queda marcada con badge? | No. Se registra sin marca adicional. | 08/06/2026 |
| El modal requiere campo de justificación? | No. Solo confirmación explícita via CTA. | 08/06/2026 |
| Cuándo se dispara el control? | On blur. Al abandonar el campo TC. | 08/06/2026 |
| El campo FX Pantalla es editable? | Sí. Auto-poblado, sobreescribible, chips como atajos. | 10/06/2026 |
| El campo TC ocupa fila propia? | Sí. Fila de ancho completo dentro de INSTRUMENTO, debajo del grid Par+Plazo. | 10/06/2026 |
| El rango aceptable se muestra siempre en el bloque FX? | No. Solo en estados 2 y 3 (desvío activo). | 10/06/2026 |
| El estado 4 reemplaza el bloque FX Pantalla? | No. El aviso aparece dentro del bloque; el campo permanece visible y editable (vacío). | 10/06/2026 |

**Wireframe de referencia:** `discoveries/wireframe_PWI-74.html`

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
- Configuración del umbral de desvío desde la interfaz (3% fijo en v1)
- Configuración de la frecuencia de refresh del FX Pantalla (5 segundos fijo en v1)
- Registro histórico de controles de desvío activados o ignorados
- Badge o marcador en operaciones registradas con desvío confirmado
- Campo de justificación en el modal de confirmación

---

## Requerimientos activos

| REQ | Descripción | Estado |
|---|---|---|
| REQ-35 | Contravalor ARS en cards de resumen | In Review |
| REQ-112 | Separador de miles en campos numéricos de carga | BACKLOG |
| PWI-74 | Control de desvío de TC — FX Pantalla + alerta ±3% en Quotes y Proveedores | IN ANALYSIS |

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
- **PWI-74 (IN ANALYSIS)** — extensión con FX Pantalla + control de desvío de TC. Dependencia técnica abierta: confirmar en refinement si `/fx-rate` devuelve BTC/ARS directo o requiere cross en frontend (P-02).
- **v2** — Edición y cancelación de operaciones: pendiente de evaluar con la Mesa.
