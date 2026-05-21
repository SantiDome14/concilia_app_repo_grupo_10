# CNV — Comisión Nacional de Valores

> Última actualización: 2026-05-21
> Tipo: Regulador
> Jurisdicción(es): Argentina
> Estado de la relación: Activa

## Qué es

La Comisión Nacional de Valores (CNV) es el organismo argentino que regula, fiscaliza y controla a los agentes que participan en el mercado de capitales y, desde la incorporación de los activos virtuales al marco regulatorio, también a los Proveedores de Servicios de Activos Virtuales (PSAV).

En el contexto de Ardua, la CNV supervisa a **Circuit Pay** en su condición de PSAV registrado. Es la autoridad ante la cual Circuit Pay debe reportar altas y bajas de clientes, y ante la cual debería tramitar una modificación de registro para habilitar la custodia de activos digitales (capacidad hoy no habilitada).

---

## Entidades del grupo supervisadas

| Entidad | Condición regulatoria |
|---|---|
| Circuit Pay | PSAV registrado ante la CNV |

---

## Obligaciones que nos impone

- **Reporte de altas y bajas de clientes**: Circuit Pay debe informar altas y bajas de clientes ante la CNV mensualmente.
- **Registro como PSAV**: mantenimiento del registro vigente ante la CNV como condición para operar. Cualquier cambio en el alcance operativo (ej. incorporar custodia) requiere modificación del registro.
- **[A completar — Legal & Compliance]**: requisitos de capital, patrimonio neto y garantías exigidos a los PSAVs.
- **[A completar — Legal & Compliance]**: obligaciones de reporte de operaciones y posiciones en activos virtuales.
- **[A completar — Legal & Compliance]**: normas de conducta, protección al inversor y transparencia aplicables a PSAVs.
- **[A completar — Legal & Compliance]**: auditorías y revisiones externas requeridas por la CNV.

---

## Restricción de diseño activa

Circuit Pay **no puede custodiar activos digitales de clientes** en la configuración vigente. Habilitar esta capacidad requiere una modificación formal del registro ante la CNV. Hasta que eso ocurra, cualquier producto que requiera custodia crypto para clientes locales argentinos no es operable a través de Circuit Pay.

Ver `marco-legal.md` §2.2 y pendiente L-03.

---

## Implicancia para el diseño de productos

Todo producto que involucre a Circuit Pay como entidad operativa debe validarse contra el registro PSAV vigente. En particular, cualquier feature que implique custodia de activos digitales para clientes argentinos está bloqueada hasta resolución del pendiente L-03.

---

## Referencias

- **Sitio oficial**: https://www.cnv.gob.ar
- **Registro PSAV de Circuit Pay**: [A completar — número de registro y fecha de otorgamiento]
- **Pendiente L-03** (`marco-legal.md`): modificación de registro para custodia.
- **Contacto regulatorio**: [A completar — referente de Legal & Compliance para la relación con la CNV]
