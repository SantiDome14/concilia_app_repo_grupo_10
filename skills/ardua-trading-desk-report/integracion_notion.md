# Integración Notion · Mesa de Dinero

IDs hardcodeadas, schemas y operaciones de lectura/escritura sobre las 6 databases del sistema.

---

## Jerarquía y IDs fijos

```
Reportes a Management         (page) 345e8880-def6-81f2-8e5d-e93d13998d49
  └── Mesa de Dinero · Sistema de Cierres  (page padre, parent_page_id)
      ID: 35ee8880-def6-8138-8d37-d76996ca0319
      URL: https://www.notion.so/Mesa-de-Dinero-Sistema-de-Cierres-35ee8880def681388d37d76996ca0319
```

### Las 6 databases bajo la página padre

| Database | Page ID | Data Source ID (collection://...) |
|---|---|---|
| 🗓️ Cierres Diarios | `9e71a1e3-77b8-409d-ad97-4141091a3ad0` | `1c4d61b8-3b02-46cc-ba86-0a115e5bf92f` |
| 💼 Cartera Vigente | `5eed0cbf-b770-4c3d-881d-4089b85521fb` | `e9737e79-b477-4840-b15c-5efab88f22bb` |
| 🏦 Proveedores | `8abd73fc-54ce-43e3-8a11-c94d0cc5638f` | `018e30be-3b19-4019-8af3-cb453485958c` |
| 📍 Estado Operativo | `73b9d8f4-04aa-49fa-abe1-fdab8a67dbad` | `f487f907-2572-4c9b-86da-edfd733e802c` |
| 📅 Cierres Mensuales | (creado 13/05/2026) | `aec4d850-d040-4f97-9c4c-5b644ab59d4f` |
| 📝 Changelog Reglas Operativas | (creado 13/05/2026) | `661a93e1-a590-4fd9-bd23-598469502c6c` |

**No usar `notion-search` para encontrar databases.** Ir directo a las IDs.

---

## Schema · 🗓️ Cierres Diarios

```sql
"Fecha" TEXT (title, formato "DD/MM/YYYY")
"Día" SELECT ["Lun", "Mar", "Mié", "Jue", "Vie"]
"Revenue Total USD" NUMBER (dollar)
"Revenue Cli ARG" NUMBER (dollar)
"Revenue Prop" NUMBER (dollar)
"Revenue FX Otros" NUMBER (dollar)
"Costo 3bps" NUMBER (dollar, negativo)
"Realizado Cartera" NUMBER (dollar)
"Volumen Total" NUMBER (dollar)
"Volumen Cli ARG" NUMBER (dollar)
"Volumen FX" NUMBER (dollar)
"Volumen Prop" NUMBER (dollar)
"Trades" NUMBER (entero, solo clientes)
"BUY / SELL" TEXT (formato "N / N")
"ROI" NUMBER (percent, ej: 0.01098 = 1,098%)
"M1" NUMBER (dollar)
"M2" NUMBER (dollar)
"TC Cierre" NUMBER
"Side Expo" SELECT ["LONG_ARS", "SHORT_ARS", "FLAT"]
"Flat ARS" NUMBER (positivo si LONG, negativo si SHORT)
"TC FIFO" NUMBER
"Cartera PnL USD" NUMBER (dollar)
"Cartera PnL %" NUMBER (percent, ej: -0.125 = -12,5%)
"Eventos" TEXT (outliers, ops especiales, proveedores/movimientos nuevos)
```

---

## Schema · 💼 Cartera Vigente

```sql
"Ticker" TEXT (title)
"Tipo Activo" SELECT ["Cripto", "Bono", "CEDEAR", "FCI", "Acción"]
"Cantidad" FLOAT
"Costo USD" FLOAT (total, dollar)
"Costo Unit Local" FLOAT (en moneda del costo unitario)
"Currency" SELECT ["USD", "ARS"]   -- moneda del COSTO UNITARIO, no del activo
"Metodo Valuacion" SELECT ["cripto_usd", "bono_ars_tc", "cedear_ars_tc", "accion_usd", "fci_usd", "manual"]
"URL Referencia" URL
"Fecha Ingreso" TEXT
"Activa" CHECKBOX
"Notas" TEXT
```

**IMPORTANTE — convención `Currency`:** este campo indica la moneda en que está expresado el **Costo Unit Local**, no la moneda del activo en sí. BTC puede tener Currency=ARS porque su costo unitario está en ARS (compra al TC del momento), pero se valúa en USD porque el `Metodo Valuacion` es `cripto_usd`.

**Lo que dicta cómo valuar es `Metodo Valuacion`, no `Currency`.**

---

## Schema · 🏦 Proveedores

```sql
"Nombre" TEXT (title)
"Pares operados" MULTI_SELECT ["USD/ARS", "USDT/ARS", "USDC/ARS", "EUR/USDC", "EURC/USDC", "USDT/BRL", "USDC/PEN", "BTC/USDT"]
"Aplica 3bps" CHECKBOX
"Activo" CHECKBOX
"Primera op" TEXT (fecha texto libre)
"Notas" TEXT
```

---

## Schema · 📍 Estado Operativo

Database de **una sola fila** ("Arrastre Vigente").

```sql
"Concepto" TEXT (title, siempre "Arrastre Vigente")
"Último cierre" TEXT (ej: "12/05/2026 (Mar)")
"Side" SELECT ["LONG_ARS", "SHORT_ARS", "FLAT"]
"Flat ARS" FLOAT
"TC FIFO" FLOAT
"TC Cierre último día" FLOAT
"Última actualización" TEXT (DD/MM/YYYY)
"Notas" TEXT (descripción de las capas del pool, ej: "Una sola capa: ARS X @ TC Y")
```

**Page ID del row único:** `35ee8880-def6-81fd-a9a4-f9e5838cd05a`

---

## Schema · 📅 Cierres Mensuales

```sql
"Mes-Año" TEXT (title, ej: "Mayo 2026")
"Año" NUMBER
"Mes Num" NUMBER (1-12)
"Dias Operados" NUMBER
"Revenue Total" NUMBER (dollar)
"Volumen Total" NUMBER (dollar)
"ROI" NUMBER (decimal, ej: 0.01184)
"Trades" NUMBER
"M1 Mes" NUMBER (dollar)
"M2 Mes" NUMBER (dollar)
"Realizado Cartera" NUMBER (dollar)
"Revenue Promedio Dia" NUMBER (dollar)
"Volumen Promedio Dia" NUMBER (dollar)
"Notas" TEXT
```

---

## Schema · 📝 Changelog Reglas Operativas

```sql
"Titulo" TEXT (title)
"Fecha Aplica" DATE
"Tipo" SELECT ["Regla de calculo", "Nuevo proveedor", "Nuevo activo cartera", "Nuevo par operado", "Convencion operativa", "Movimiento cartera", "Otro"]
"Descripcion" TEXT
"Impacto en SKILL" TEXT
```

---

## Flujo de lectura · Al inicio del cierre

```
1. fetch(35ee8880-def6-81fd-a9a4-f9e5838cd05a)
   → Arrastre vigente (Side, Flat ARS, TC FIFO, Último cierre)

2. search(data_source_url=collection://e9737e79-b477-4840-b15c-5efab88f22bb)
   → Lista de activos en Cartera Vigente
   → Para cada uno: leer Ticker, Cantidad, Costo USD, Metodo Valuacion, URL Referencia
   → (El precio NO se fetchea — se le pide al operador en el paso 2 del flujo, ver cotizaciones.md)

3. search(data_source_url=collection://018e30be-3b19-4019-8af3-cb453485958c)
   → Lista de proveedores activos con Pares operados + Aplica 3bps

4. search(data_source_url=collection://1c4d61b8-3b02-46cc-ba86-0a115e5bf92f, page_size=2)
   → Últimos cierres (para comparativa con día hábil anterior)
   → Validar contra Arrastre Vigente que coincida con el último cierre

5. (Opcional, si hay duda sobre criterio vigente)
   search(data_source_url=collection://661a93e1-a590-4fd9-bd23-598469502c6c)
   → Changelog ordenado por Fecha Aplica DESC
```

---

## Flujo de escritura · Al final del cierre

### 1. Crear row en Cierres Diarios

```python
notion-create-pages(
  parent={"data_source_id": "1c4d61b8-3b02-46cc-ba86-0a115e5bf92f"},
  pages=[{
    "properties": {
      "Fecha": "13/05/2026",
      "Día": "Mié",
      "Revenue Total USD": 55047,
      "Revenue Cli ARG": 55440,
      "Revenue Prop": 1149,
      "Revenue FX Otros": 0,
      "Costo 3bps": -1543,
      "Realizado Cartera": 0,
      "Volumen Total": 4841049,
      "Volumen Cli ARG": 4729006,
      "Volumen FX": 0,
      "Volumen Prop": 112043,
      "Trades": 42,
      "BUY / SELL": "40 / 2",
      "ROI": 0.01137,
      "M1": -1727,
      "M2": 22880,
      "TC Cierre": 1474,
      "Side Expo": "LONG_ARS",
      "Flat ARS": 4369878,
      "TC FIFO": 1475,
      "Cartera PnL USD": -34162,
      "Cartera PnL %": -0.132,
      "Eventos": "Outliers TC 1.495 y 1.490 excluidos de σ. Sin movimientos cartera."
    }
  }]
)
```

### 2. Actualizar Estado Operativo (mismo page_id siempre)

```python
notion-update-page(
  command="update_properties",
  page_id="35ee8880-def6-81fd-a9a4-f9e5838cd05a",
  properties={
    "Último cierre": "13/05/2026 (Mié)",
    "Side": "LONG_ARS",
    "Flat ARS": 4369878,
    "TC FIFO": 1475,
    "TC Cierre último día": 1474,
    "Última actualización": "13/05/2026",
    "Notas": "Una sola capa: ARS 4.369.878 @ TC 1.475 (residual del pool del día)"
  }
)
```

### 3. Si hubo movimientos de cartera → actualizar Cartera Vigente

**Compra ampliación de activo existente:**
```python
notion-update-page(
  command="update_properties",
  page_id="<page_id_del_activo>",
  properties={
    "Cantidad": <nueva_cantidad_total>,
    "Costo USD": <nuevo_costo_total>,
    "Costo Unit Local": <nuevo_promedio_ponderado>,
    "Notas": <actualizar_con_detalle_ampliacion>
  }
)
```

**Activo nuevo:**
```python
notion-create-pages(
  parent={"data_source_id": "e9737e79-b477-4840-b15c-5efab88f22bb"},
  pages=[{
    "properties": {
      "Ticker": "XYZ",
      "Tipo Activo": "Cripto",
      "Cantidad": 100,
      "Costo USD": 5000,
      "Costo Unit Local": 50,
      "Currency": "USD",
      "Metodo Valuacion": "cripto_usd",
      "URL Referencia": "https://www.binance.com/en/trade/XYZ_USDT",
      "Fecha Ingreso": "13/05/2026",
      "Activa": "__YES__",
      "Notas": "..."
    }
  }]
)
```

**Venta total (no borrar, marcar como inactivo):**
```python
notion-update-page(
  command="update_properties",
  page_id="<page_id>",
  properties={
    "Activa": "__NO__",
    "Notas": "Vendido total el DD/MM/YYYY. P&L realizado: USD ±X."
  }
)
```

### 4. Si apareció proveedor nuevo → crear en Proveedores

```python
notion-create-pages(
  parent={"data_source_id": "018e30be-3b19-4019-8af3-cb453485958c"},
  pages=[{
    "properties": {
      "Nombre": "NUEVO",
      "Pares operados": ["USD/ARS"],  // multi_select como lista
      "Aplica 3bps": "__YES__",
      "Activo": "__YES__",
      "Primera op": "DD/MM/YYYY"
    }
  }]
)
```

### 5. Si hubo cambio de regla, movimiento cartera o evento sistémico → Changelog

```python
notion-create-pages(
  parent={"data_source_id": "661a93e1-a590-4fd9-bd23-598469502c6c"},
  pages=[{
    "properties": {
      "Titulo": "<descripción corta>",
      "date:Fecha Aplica:start": "2026-MM-DD",
      "date:Fecha Aplica:is_datetime": 0,
      "Tipo": "Movimiento cartera",  // u otro
      "Descripcion": "<contexto completo>",
      "Impacto en SKILL": "<qué cambia para el procesamiento futuro>"
    }
  }]
)
```

### 6. Si es último día hábil del mes → crear row en Cierres Mensuales

Sumar todos los cierres diarios del mes y crear el row consolidado.

```python
notion-create-pages(
  parent={"data_source_id": "aec4d850-d040-4f97-9c4c-5b644ab59d4f"},
  pages=[{
    "properties": {
      "Mes-Año": "Mayo 2026",
      "Año": 2026,
      "Mes Num": 5,
      "Dias Operados": <N>,
      "Revenue Total": <suma>,
      "Volumen Total": <suma>,
      "ROI": <Revenue/Volumen>,
      "Trades": <suma trades>,
      "M1 Mes": <suma M1>,
      "M2 Mes": <suma M2>,
      "Realizado Cartera": <suma realizado>,
      "Revenue Promedio Dia": <Revenue/Dias>,
      "Volumen Promedio Dia": <Volumen/Dias>,
      "Notas": "..."
    }
  }]
)
```

---

## Gotchas y reglas de formato

- **Checkbox:** `"__YES__"` para true, `"__NO__"` para false. No booleanos Python.
- **Date:** propiedad expandida: `"date:Fecha Aplica:start": "2026-05-13"`, `"date:Fecha Aplica:is_datetime": 0`.
- **Multi_select:** lista de strings: `["USD/ARS", "USDT/ARS"]`.
- **Select:** string del valor: `"LONG_ARS"`.
- **Number con percent format:** se guarda como decimal (0.01098 = 1,098%), no como 1.098 ni 1.098%.
- **Number con dollar format:** se guarda como número sin signo de pesos.
- **Property names "url" o "id"** en pages NO de database necesitan prefix `userDefined:`, pero en este sistema todas las propiedades viven en databases (no aplica).
- El nombre `URL Referencia` (sin tilde) está intencional — JSON-friendly y evita problemas de encoding. **El SKILL no consume esta URL** (las cotizaciones las provee el operador); es solo un atajo visual para que el operador abra la fuente al cierre. Ver `cotizaciones.md`.

---

## Validación al inicio del cierre

Antes de procesar, validar:

1. **Arrastre del CSV coincide con Estado Operativo de Notion** (Side, Flat ARS, TC FIFO). Si no → escalar al usuario.
2. **Todos los proveedores del CSV están en DB Proveedores activos.** Si aparece uno nuevo → pedir info y crear.
3. **Todos los pares del CSV son conocidos.** Si aparece un par nuevo (USDC/PEN, BTC/USDT como cobertura, etc.) → confirmar tratamiento con el usuario.
