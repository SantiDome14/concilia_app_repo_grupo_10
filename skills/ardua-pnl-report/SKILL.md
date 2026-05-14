---
name: ardua-pnl-report
description: >
  Genera un reporte de P&L de Ardua en HTML print-ready a partir de MASTER.xlsx y lo entrega
  al usuario como artifact (vista renderizada + descarga) en la conversación. No escribe archivos
  en el filesystem del usuario. La fuente del archivo MASTER es la carpeta Desktop/BANCOS/ del
  usuario que ejecuta el Skill — convención multi-usuario para que distintas personas puedan
  ejecutarlo desde sus máquinas. Soporta cuatro tipos de reporte: daily (último día con datos),
  weekly (últimos 7 días), monthly (últimos 30 días) y custom (rango definido por el usuario).
  Activar cuando el usuario pida "reporte de P&L", "generá el P&L diario/semanal/mensual",
  "armame el P&L", "necesito el daily/weekly/monthly P&L" o similar. Si el tipo es custom y
  faltan fechas, pedirlas antes de ejecutar. El HTML generado tiene paginación automática
  (1 o varias hojas A4 según el tamaño del contenido), se ve como hoja/s flotante/s en el
  navegador y se imprime a PDF idéntico al layout de Report 9 con Cmd+P.
---

# Skill: Reporte de P&L

## Propósito

Automatizar la generación del reporte de P&L de Ardua. El Skill lee `MASTER.xlsx` desde la
carpeta canónica del usuario que lo ejecuta (`~/Desktop/BANCOS/MASTER.xlsx`), aplica la
lógica de cómputo encapsulada en `pnl_report.py`, genera un HTML con paginación automática,
y lo entrega como **artifact** en la conversación.

**Principio central:** el Skill es un generador determinístico y multi-usuario. Mismo MASTER
+ mismos parámetros = mismo output. No escribe en el disco del usuario. Usa paths relativos
al home del usuario que lo ejecuta, así cualquier persona del equipo con el archivo en la
carpeta canónica puede correrlo sin modificar nada.

---

## Fuente y destino

| Recurso | Ubicación |
|---|---|
| Input canónico | `~/Desktop/BANCOS/MASTER.xlsx` en el filesystem del usuario |
| Output | Artifact HTML en la conversación (vía `present_files`) |

**Convención multi-usuario:** cada persona que use este Skill debe tener el archivo en
`Desktop/BANCOS/MASTER.xlsx` de su propia máquina. Esto evita rutas hardcodeadas y hace el
Skill portable entre usuarios.

**No se escribe ningún archivo en el filesystem del usuario.** El HTML se genera en la
computadora de Claude (`/mnt/user-data/outputs/`) y se expone como artifact en el chat.

---

## Parámetros

| Parámetro | Requerido | Default | Formato |
|---|---|---|---|
| `report_type` | Sí | — | `daily` / `weekly` / `monthly` / `custom` |
| `from_date` | Solo si `custom` | — | `YYYY-MM-DD` |
| `to_date` | Solo si `custom` | — | `YYYY-MM-DD` |

Si el usuario pide `custom` sin fechas, preguntar: *"¿Desde qué fecha hasta qué fecha?
(formato YYYY-MM-DD, ej: del 1 de enero al 31 de marzo de 2026)"*. No ejecutar hasta tener
las dos fechas.

---

## Tipos de reporte y rangos

| Tipo | Rango de fechas |
|---|---|
| `daily` | Última fecha disponible en el dataset (desde = hasta) |
| `weekly` | Última fecha − 6 días, hasta la última fecha |
| `monthly` | Última fecha − 29 días, hasta la última fecha |
| `custom` | `from_date` a `to_date` |

**Nota clave:** el Skill toma como referencia la última fecha que aparece en `MASTER.xlsx`,
no la fecha del sistema. Si el archivo no se actualizó, el reporte usa la última fecha que
el archivo contiene. Esto se refleja explícitamente en el header: `DATA AS OF: YYYY-MM-DD`.

---

## Flujo de ejecución

### Paso 1 — Identificar intención y tipo

Reconocer en el mensaje del usuario:
- **Daily:** "diario", "daily", "de hoy", "del día"
- **Weekly:** "semanal", "weekly", "últimos 7 días", "de la semana"
- **Monthly:** "mensual", "monthly", "últimos 30 días", "del mes"
- **Custom:** rango explícito ("del 1 de enero al 31 de marzo"), "entre X y Y"

Si la intención es ambigua, preguntar: *"¿Querés un reporte diario, semanal, mensual o por
rango custom?"*.

### Paso 2 — Validar fechas (solo custom)

Para custom, validar que:
- Ambas fechas estén presentes
- `from_date` ≤ `to_date`
- Formato ISO `YYYY-MM-DD`

Si el usuario dio fechas en lenguaje natural ("del 1 al 31 de enero"), convertirlas a ISO
antes de ejecutar.

### Paso 3 — Descubrir el home del usuario y obtener MASTER.xlsx

**El path esperado es genérico y relativo al home del usuario que ejecuta el Skill.** No se
puede hardcodear porque distintas personas lo van a usar desde distintas máquinas.

**Sub-paso 3.1 — Descubrir allowed directories:**

Llamar a `Filesystem:list_allowed_directories`. El resultado incluye los paths que el
filesystem MCP tiene permiso de leer. Típicamente incluye al menos el home del usuario
(`/Users/[username]`) y/o algunas de sus subcarpetas principales (Desktop, Documents, etc.).

**Sub-paso 3.2 — Identificar el Desktop del usuario:**

Buscar en el listado una entrada que termine en `/Desktop` (o que sea la misma Desktop).
Si no está explícita, buscar el home (entrada que matchea `/Users/[algo]` sin subcarpeta) y
asumir `[home]/Desktop`.

**Sub-paso 3.3 — Intentar copiar MASTER.xlsx al filesystem de Claude:**

Construir el path esperado: `[Desktop]/BANCOS/MASTER.xlsx`.
Intentar `Filesystem:copy_file_user_to_claude` con ese path. Destino en computadora de Claude:
`/tmp/MASTER.xlsx`.

**Sub-paso 3.4 — Manejo de errores:**

Si el archivo no existe o el path no está en allowed directories, responder al usuario:

> *"No encontré MASTER.xlsx en `Desktop/BANCOS/MASTER.xlsx`. Para que el Skill funcione,
> creá la carpeta `BANCOS` en tu Desktop y dejá el archivo `MASTER.xlsx` adentro. Si ya está
> ahí, verificá que la carpeta Desktop esté permitida en la configuración del filesystem MCP."*

No ejecutar el generador hasta tener el archivo disponible.

### Paso 4 — Ejecutar el generador

```bash
cd /mnt/skills/user/ardua-pnl-report
python3 -c "
from pnl_report import generate_report
import json
r = generate_report(
    master_path='/tmp/MASTER.xlsx',                # copiado en el paso 3
    report_type='daily',                           # o weekly/monthly/custom
    from_date=None,                                # solo para custom
    to_date=None,                                  # solo para custom
    output_dir='/mnt/user-data/outputs'            # computadora de Claude
)
print(json.dumps(r, indent=2))
"
```

El campo `path` del JSON de respuesta apunta al HTML generado en
`/mnt/user-data/outputs/Ardua_PnL_[TIPO]_[FECHA].html`.

### Paso 5 — Presentar como artifact

Llamar a `present_files` con el path del HTML generado:

```python
present_files(filepaths=['/mnt/user-data/outputs/Ardua_PnL_DAILY_2026-04-13.html'])
```

Esto expone el archivo al usuario como artifact renderizado en la conversación. El usuario
puede:
- Ver el reporte renderizado directamente (hojas A4 flotando con formato Report 9)
- Descargar el HTML
- Abrirlo en el navegador y usar Cmd+P → "Save as PDF"

### Paso 6 — Responder al usuario

Entregar un resumen breve acompañando el artifact. No repetir el path del archivo (ya está
en el artifact). Formato:

```
P&L [Daily/Weekly/Monthly/Custom] generado · [período] · [N] transacciones procesadas
Revenue: $X · Volume: $Y · Transfers: N · Top Segment: [SEGMENTO] (XX.X%)
[N hoja(s) A4 según el tamaño del contenido]
```

Donde `[período]`:
- Daily → `YYYY-MM-DD`
- Weekly/Monthly → `YYYY-MM-DD → YYYY-MM-DD`
- Custom → `YYYY-MM-DD → YYYY-MM-DD`

---

## Manejo de errores

Cuando el módulo tira `PnLError`, el mensaje ya viene en lenguaje claro (es parte del
contrato del módulo). Pasarlo tal cual al usuario, sin inventar soluciones.

| Caso | Qué hacer |
|---|---|
| MASTER.xlsx no está en `Desktop/BANCOS/` | Pedir al usuario que cree la carpeta y ponga el archivo ahí. Ver Paso 3.4. |
| Desktop no está en allowed directories | Indicar al usuario que agregue `Desktop` a la config del filesystem MCP. |
| Hoja sin columnas obligatorias | Indicar qué hoja y qué columna falta. El módulo lo dice explícitamente. |
| Custom sin fechas | Preguntar por las fechas antes de volver a correr. |
| Fechas invertidas | Ofrecer corregir y volver a correr. |
| Rango custom sin movimientos | El reporte se genera igual con valores en 0. Avisar al usuario. |
| Error de dependencia (openpyxl no instalado) | `pip install openpyxl --break-system-packages` |

---

## Reglas del cómputo

El Skill encapsula la lógica de negocio. **No la reimplementa ni la modifica.** Si el usuario
pide un cambio en la lógica (ej. incluir/excluir ciertas filas, cambiar fórmula de revenue),
**el Skill no aplica el cambio** — rechaza cortésmente:

> *"Esa modificación cambia la lógica canónica del P&L definida por el área de Producto.
> Los cambios a reglas del cómputo no se aplican en esta conversación — tienen que pasar por
> una revisión formal antes de actualizar el Skill."*

Reglas clave implementadas en `pnl_report.py`:

- `revenue = amount × tc_rate × ardua_fee + ardua_fix + onboarding` (no-USD) o
  `amount × ardua_fee + ardua_fix + onboarding` (USD)
- `volume = 0` si Notes contiene `OFF VOL`, caso contrario `amount`
- `revenue = 0` si Notes contiene `OFF REV`
- `cost = 0` en la versión actual del Skill
- Filas con `Type == "CARD PURCHASE TXS"` se excluyen desde el parseo
- Hojas con `CRYPTO` en el nombre y `Sheet1` se saltean
- Segmentos `NO SEGMENT`, `INTERNAL TRANSFER`, `ARDUA CNT` se cuentan en totales pero se
  excluyen del segment breakdown
- `tc_rate` sale de la columna `FX Rate` o del patrón `TC X.XXX` en Notes; default 1.0

## Paginación automática

El módulo estima la altura de cada sección en mm y las distribuye en hojas A4:

- Umbral útil por hoja: **258mm** (post header/footer)
- Alturas estimadas: KPIs 22mm, Performance Summary 26mm, Period Comparison 30mm,
  Bank+Rails variable, Currency Breakdown variable
- Si el contenido cabe en 1 hoja → 1 hoja
- Si no cabe → se distribuyen en N hojas, respetando el orden y agregando "PÁGINA X DE N"
  en el header de cada una

Típicamente todos los reportes (daily, weekly, monthly, custom) entran en 1 hoja. La
paginación se dispara con volúmenes altos de partners, rails o currencies.

---

## Lo que este Skill NO hace

- No modifica `MASTER.xlsx`. Solo lee.
- No escribe en el filesystem del usuario. El output es un artifact en la conversación.
- No busca el archivo en otras ubicaciones que no sean `Desktop/BANCOS/MASTER.xlsx`. Si no
  está ahí, pide al usuario que lo ponga ahí.
- No genera PDF directamente. Solo HTML. La conversión la hace el navegador (Cmd+P) después
  de descargar el artifact.
- No aplica cambios a la lógica de cómputo sobre la marcha.
- No envía el reporte por email, Slack u otros canales.
- No mantiene snapshots ni historial — cada invocación genera un artifact nuevo.

---

## Diagrama del flujo

```
[Usuario pide un P&L]
      ↓
[Identificar tipo: daily / weekly / monthly / custom]
      ↓
[Si custom y faltan fechas → preguntar]
      ↓
[list_allowed_directories → identificar Desktop del usuario]
      ↓
[copy_file_user_to_claude: Desktop/BANCOS/MASTER.xlsx → /tmp/MASTER.xlsx]
      ↓
[¿Archivo disponible?]
   NO → Mensaje: "Poné MASTER.xlsx en Desktop/BANCOS/"
   SÍ → Continuar
      ↓
[Ejecutar pnl_report.generate_report(master_path='/tmp/MASTER.xlsx',
   output_dir='/mnt/user-data/outputs')]
      ↓
[¿Hubo PnLError?]
   SÍ → Pasar mensaje al usuario tal cual
   NO → present_files([path]) + responder con resumen
```

---

## Requisitos del entorno

### Del lado del usuario
- Carpeta `Desktop/BANCOS/` creada en su home
- Archivo `MASTER.xlsx` en esa carpeta, actualizado
- Carpeta `Desktop` permitida en la configuración del filesystem MCP (allowed directories)

### Del lado de Claude
- Python 3.9+
- `openpyxl` instalado (única dependencia)
- Directorio `/mnt/user-data/outputs/` disponible (estándar en Claude Skills)
