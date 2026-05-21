# UIF — Unidad de Información Financiera

> Última actualización: 2026-05-21
> Tipo: Regulador
> Jurisdicción(es): Argentina
> Estado de la relación: Activa

## Qué es

La Unidad de Información Financiera (UIF) es el organismo argentino responsable del análisis, tratamiento y transmisión de información para prevenir e impedir el lavado de activos y la financiación del terrorismo (LA/FT). Depende del Ministerio de Justicia de la Nación.

En el contexto de Ardua, tanto **Haz Pagos** como **Circuit Pay** son Sujetos Obligados ante la UIF, lo que implica obligaciones concretas de reporte, política interna PLAFT, y controles KYC/KYB sobre todos sus clientes.

---

## Entidades del grupo supervisadas

| Entidad | Condición regulatoria |
|---|---|
| Haz Pagos | Sujeto Obligado ante la UIF (PSP) |
| Circuit Pay | Sujeto Obligado ante la UIF (PSAV) |

---

## Obligaciones que nos impone

- **Límite transaccional con origen de fondos**: todo cliente de Haz Pagos y Circuit Pay debe tener un límite transaccional calculado en base a documentación patrimonial, con fecha de vencimiento (típicamente 1 año). Sin límite activo, el cliente no puede operar.
- **Reporte de altas y bajas de clientes**: Circuit Pay debe reportar altas y bajas de clientes ante la UIF mensualmente.
- **Reporte de operaciones sospechosas (ROS)**: [A completar — Legal & Compliance] criterios y proceso de reporte.
- **Auditoría anual de sistemas UIF**: Circuit Pay debe someterse a una auditoría anual de sus sistemas de prevención LA/FT.
- **Revisión externa independiente UIF**: [A completar — Legal & Compliance] alcance y frecuencia exacta para cada entidad.
- **Manual PLAFT**: las sociedades que sean Sujeto Obligado deben contar con un Manual de Prevención de Lavado de Activos y Financiamiento del Terrorismo. En caso de clientes que sean a su vez Sujetos Obligados, deben presentar su propio Manual PLAFT como documentación de onboarding.
- **Oficial de Cumplimiento**: [A completar — Legal & Compliance] designación formal y obligaciones del Oficial de Cumplimiento ante la UIF.
- **[A completar — Legal & Compliance]**: obligaciones adicionales de reporte, plazos y formatos exigidos por la UIF.

---

## Implicancia para el diseño de productos

Todo flujo que involucre a Haz Pagos o Circuit Pay debe contemplar el límite transaccional como restricción operativa. Un cliente sin límite activo o con límite vencido no puede operar — esto afecta el diseño de onboarding, renovaciones y cualquier producto que use estas entidades como canal de fondos.

Los clientes que sean a su vez Sujetos Obligados (ej. brokers, exchanges, otras fintechs) requieren documentación adicional en el onboarding.

---

## Referencias

- **Sitio oficial**: https://www.uif.gob.ar
- **Resolución UIF aplicable a PSPs y PSAVs**: [A completar — Legal & Compliance]
- **Contacto regulatorio**: [A completar — referente de Legal & Compliance para la relación con la UIF]
