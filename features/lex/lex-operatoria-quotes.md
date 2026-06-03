# LEX — Sección Quotes en Tab Operatoria

> Módulo: Detalle de Cliente — Tab Operatoria
> Estado: SENT TO DEV (PWI-53)
> Última actualización: 2026-06-03

---

## Qué hace esta funcionalidad

Expone en LEX el historial de quotes generados por un cliente en TRD, dentro de la tab Operatoria del detalle de cliente. Permite a Legal & Compliance consultar y totalizar operaciones históricas para gestionar reasignaciones de límites, reemplazando el Excel de Mesa DB como fuente de referencia.

---

## Acceso

| Punto | Ubicación | Condición |
|---|---|---|
| Sección "Quotes" | Tab Operatoria → `/clientes/:id` → tab Operatoria | Solo visible para clientes con al menos un límite configurado en LEX |

Roles habilitados: `admin-lex`, `compliance`.

---

## Flujo principal

```
Detalle de cliente → Tab Operatoria → Sección "Quotes"
  → Carga inicial con filtro default (sin filtro activo)
  → Tabla de quotes del cliente (fuente: TRD)
  → Usuario activa filtro por período (meses) o por fecha exacta
    → Skeleton loader → tabla actualizada
  → Usuario selecciona filas en columna "Total Fiat"
    → Chip de sumatoria anclado al footer, recalculo en tiempo real
  → CTA "Ver detalle completo en TRD →" al pie
```

---

## Tabla de historial

Cada fila = un quote. 7 columnas de datos + 1 columna de selección, todas provenientes de TRD.

| # | Columna | Tipo | Formato |
|---|---|---|---|
| 1 | Fecha | Dato | Fecha y hora del quote |
| 2 | Tipo de trade | Dato | `BUY` / `SELL` |
| 3 | Tipo de TC | Dato | `MEP` / `CCL` |
| 4 | Valor del TC | Dato | Numérico `#,###,###.##` |
| 5 | Monto fiat | Dato | Moneda como prefijo inline · `ARS 42,518,400.00` / `USD 12,500.00` · formato `#,###,###.##` |
| 6 | Total Fiat | Selección | Checkbox por fila — master checkbox en header (3 estados: marcado / indeterminado / vacío) |
| 7 | Monto crypto | Dato | Tipo de crypto como prefijo inline en gris · `USDC 36,420.00` · monto alineado a la derecha |
| 8 | Comitente | Dato | Docket como badge: `AS` violeta / `CIR` azul |

**Footer:** chip de cálculo anclado al pie de la columna `Total Fiat`. No hay header de totales — el footer muestra únicamente el chip activo cuando hay filas seleccionadas.

---

## Filtros

Dos modos coexistentes en el mismo panel (filas separadas), con exclusión mutua:

| Modo | Componente | Comportamiento |
|---|---|---|
| Por período (meses) | Dropdowns `Mes desde` / `Mes hasta` · formato `Mayo 2026` | Filtro por rango de meses completos. Si `Mes hasta` < `Mes desde`, los valores se intercambian automáticamente |
| Por fecha exacta | Date pickers `Desde` / `Hasta` | Rango arbitrario libre |

Activar un modo limpia el otro — ambos nunca están activos simultáneamente.

**Botón Limpiar filtros:** aparece a la derecha del panel, centrado entre las dos filas, solo cuando hay un filtro activo. Resetea ambos simultáneamente. Estilo ghost.

Al cambiar cualquier filtro, la tabla muestra skeleton loader (shimmer animado que refleja el ancho y tipo de cada celda) antes de actualizar los datos.

---

## Cálculo por selección de filas

Al seleccionar una o más filas en la columna `Total Fiat`, aparece un chip anclado al footer:

```
Total Monto fiat (N filas): ARS 248,440,400.00  ✕
```

- La fila seleccionada se resalta con tinte teal sutil.
- El valor se recalcula en tiempo real al marcar/desmarcar filas.
- El botón ✕ limpia la selección.
- Sin filas seleccionadas → chip no renderizado.

---

## Nota de contexto

Banner informativo sutil sobre la sección:
> _"Para ver los límites configurados de este cliente, consultá la tab Límites."_

---

## CTA al pie

Botón `Ver detalle completo en TRD →` con feedback visual al hacer click. Mismo patrón que el botón "Ver movimientos completos en OPS" del PWI-21 (Tab Operatoria).

---

## Reglas de negocio

- La sección solo se renderiza para clientes con al menos un límite configurado en LEX. Sin límites → sección no visible.
- La fuente de datos es TRD. LEX es solo lectura — no modifica ni edita quotes.
- El filtro por período y el filtro por fecha son mutuamente excluyentes en todo momento.
- Si `Mes hasta` es anterior a `Mes desde`, los valores se intercambian automáticamente (no bloqueo de UI).

---

## Restricciones (fuera de scope v1)

- Edición o modificación de quotes desde LEX.
- Alertas automáticas por volumen o frecuencia de quotes (candidato a módulo Alertas).
- Exportación del historial a XLSX/PDF.
- Clientes sin límites configurados en LEX.
- Totalizadores adicionales al footer (promedio de TC, etc.).
- Gestión documental asociada a quotes (en investigación — ver `discoveries/lex-operatoria-documentacion-discovery.md`).

---

## Artefactos de referencia

| Artefacto | Ruta / Referencia |
|---|---|
| Wireframe aprobado | `LEX - operatoria.html` (adjunto PWI-53) |
| Ticket Jira | [PWI-53](https://arduasolutions.atlassian.net/browse/PWI-53) |
| Discovery | `discoveries/lex-operatoria-rulo-quotes-discovery.md` |
| Tab Operatoria (contenedor) | [PWI-21](https://arduasolutions.atlassian.net/browse/PWI-21) · `features/lex/README.md` |
| Iteración futura — Gestión documental | `discoveries/lex-operatoria-documentacion-discovery.md` |

---

## Hipótesis abiertas

- **Gestión documental (H-01 a H-05):** Legal gestiona documentación de cada cliente (SWIFT, facturas, comprobantes) en carpetas locales organizadas por quote. La hipótesis de integrar esa gestión en esta misma superficie está en investigación. Ver `discoveries/lex-operatoria-documentacion-discovery.md`.
