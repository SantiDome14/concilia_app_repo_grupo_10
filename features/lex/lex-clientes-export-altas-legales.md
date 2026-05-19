# LEX — Export de Altas Legales

> Módulo: Clientes
> Estado: SENT TO DEV (REQ-87)
> Última actualización: 2026-05-19

---

## Qué hace esta funcionalidad

Permite al equipo de Legal & Compliance exportar los datos de clientes onboardeados
(`status = APPROVED`) en formato XLSX compatible con las planillas de Altas Legales de
Haz Pagos (PSP) y Circuit Pay (PSAV), eliminando la transcripción manual campo a campo.

---

## Acceso

| Punto | Ubicación | Comportamiento |
|---|---|---|
| Listado principal | Botón "Exportar altas legales" · derecha de los filtros en `/clientes` | Modal de configuración: entidad + período (máx. 1 mes) |
| Detalle de cliente | Botón "Exportar alta legal" · barra de acciones en `/clientes/:id` | Export directo del cliente individual, sin configuración de período |

Roles habilitados: `admin-lex`, `compliance`. No visible para otros roles.

---

## Flujo principal

```
Botón → Modal configuración (entidad + período)
  → [Generar] → Estado "Generando..." (spinner)
    → Archivo listo: resumen + botón "Descargar .xlsx"
    → Sin resultados: mensaje de error, sin archivo
```

---

## Esquema de columnas

Ambas planillas comparten 22 columnas base. PSP agrega 2 columnas exclusivas.

| # | Columna | Origen | Notas |
|---|---|---|---|
| 1 | Fecha | Manual | Vacío en el export |
| 2 | Legajo | LEX | — |
| 3 | Operacion | LEX | Desplegable: Alta / Baja |
| 4 | Tipo | LEX | Desplegable: Persona Humana / Persona Física |
| 5 | Apellido | LEX | — |
| 6 | Nombre | LEX | — |
| 7 | Fecha de Nacimiento | LEX | — |
| 8 | Pais de nacimiento | LEX | Desplegable: Argentina / Venezuela / Paraguay / Uruguay |
| 9 | Documento | LEX | Desplegable: DNI / Estatuto |
| 10 | Numero | LEX | Número de documento |
| 11 | Vencimiento | LEX | — |
| 12 | CUIT/CUIL | LEX | — |
| 13 | Mail | LEX | — |
| 14 | Domicilio | LEX | — |
| 15 | Provincia | LEX | Desplegable: todas las provincias argentinas |
| 16 | Pais | LEX | — |
| 17 | Profesion/actividad | Manual | Vacío en el export — desplegable ARCA, completa Legal |
| 18 | PEP | LEX | Desplegable: Negativo / Positivo |
| 19 | SO | LEX | Desplegable: Negativo / Positivo |
| 20 | FATCA/OFAC | LEX | Desplegable: Negativo / Positivo |
| 21 | Black List | LEX | Desplegable: SI / NO |
| 22 | CVU Banco Bind | LEX | **Solo Haz Pagos (PSP)** |
| 23 | CVU Banco Coinag | LEX | **Solo Haz Pagos (PSP)** |
| 24 | Operatoria Estimada | Manual | Vacío en el export — desplegable ARCA, completa Legal |

---

## Reglas de negocio

- Solo exporta clientes con `status = APPROVED`.
- Campos con desplegable se exportan con valores exactos aceptados por Excel — sin errores de validación al abrir.
- Codificación UTF-8 — tildes y ñ se visualizan correctamente.
- Rango máximo de 1 mes por descarga (punto de acceso del listado).
- Sin resultados → mensaje de error claro, no se genera archivo vacío.
- Campo vacío en LEX → se exporta vacío, sin bloqueo.

---

## Restricciones (fuera de scope v1)

- Clientes con `status = PENDING_REVIEW` o `DEACTIVATED` no se exportan.
- Sin integración directa con sistemas de UIF, BCRA o CNV.
- Sin modificación del formato ni estructura de las planillas.
- Sin automatización del envío de reportes regulatorios.
- Cálculo de operatoria estimada y score/nivel de riesgo: manual, a cargo de Legal.

---

## Artefactos de referencia

| Artefacto | Ruta / Referencia |
|---|---|
| Wireframe interactivo | `Exportar_altas_legales_-_standalone.html` (adjunto REQ-87) |
| Archivo demo con esquema | `Altas_Legales_DEMO_REQ87.xlsx` (adjunto REQ-87) |
| Ticket Jira | [REQ-87](https://arduasolutions.atlassian.net/browse/REQ-87) |
| Discovery | `discoveries/lex-clientes-export-altas-legales-discovery.md` |

---

## Hipótesis abierta

**H-07** — Migración a REQ-59 (Reportería Transversal del Core): la solución se diseñó
como independiente en LEX con la premisa de que cuando REQ-59 madure, este export migra
sin fricción. Estado: Abierta · Prioridad: Media.
