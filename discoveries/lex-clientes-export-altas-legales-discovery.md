---
name: LEX — Export automático de clientes onboardeados a planillas de Altas Legales
features: [LEX]
status: Concluida
owner: Santino Domeniconi
created_at: 2026-05-19
updated_at: 2026-05-19
propagates_to:
  - features/lex/lex-clientes-export-altas-legales.md
  - features/lex/README.md
---

# LEX — Export automático de clientes onboardeados a planillas de Altas Legales

> Categoría: Product — functionality · Módulo: Clientes
> Discovery hijo del umbrella `lex-discovery.md`
> Requirement: REQ-87 · Estado: SENT TO DEV

---

## Objetivo

Determinar cómo eliminar la transcripción manual de datos desde LEX hacia las planillas de
Altas Legales (Haz Pagos / Circuit Pay), reduciendo a cero los errores por carga manual y
el tiempo operativo dedicado a esa tarea, sin alterar el proceso de confección y presentación
de reportes regulatorios ante UIF y BCRA.

---

## Contexto

El equipo de Legal & Compliance (Facundo Arce, Camila Cattaneo, Juan Gonzalez) mantiene dos
planillas de Altas Legales —una por entidad— que alimentan los reportes regulatorios
obligatorios. El proceso actual: Facundo Arce transcribe manualmente ~50 campos por cliente
desde LEX una vez completado el onboarding (~5–6 clientes por día en total).

Los errores de carga se detectan a fin de mes, al confeccionar los reportes — instancia en
que un dato incorrecto puede haber sido ya incluido en un reporte oficial ante UIF o BCRA.
LEX tiene toda la información necesaria; el problema es exclusivamente la ausencia de un
mecanismo de extracción automática.

Tres riesgos simultáneos identificados:

1. **Regulatorio** — errores no detectados hasta fin de mes impactan reportes oficiales.
2. **Continuidad** — el proceso recae habitualmente en una sola persona (Facundo Arce).
3. **Escala** — el costo operativo crece linealmente con el volumen de onboardings.

Prototipo (wireframe interactivo): `Exportar_altas_legales_-_standalone.html` (adjunto REQ-87)
Archivo demo con esquema de columnas: `Altas_Legales_DEMO_REQ87.xlsx` (adjunto REQ-87)

---

## Conclusión

Hipótesis validada. LEX puede y debe generar el export directamente, sin dependencias de
otros sistemas. El scope funcional quedó definido y enviado a desarrollo (SENT TO DEV).

### Dos puntos de acceso

**A — Sección Clientes (listado principal)**
Botón "Exportar altas legales" alineado a la derecha de los filtros existentes en `/clientes`.
Abre un modal de configuración con:
- Selector de entidad: radio buttons Haz Pagos (PSP) / Circuit Pay (PSAV)
- Selector de período: campos Desde y Hasta · rango máximo 1 mes por descarga
- Nota informativa: solo se exportan clientes con `status = APPROVED`

**B — Detalle de cliente individual**
Botón "Exportar alta legal" en la barra de acciones del detalle `/clientes/:id`
(junto a Confirmar legajo, Agregar relación, Desactivar). No requiere configuración de
período — genera el export de ese cliente directamente.

Ambos puntos: visibles únicamente para roles `admin-lex` y `compliance`.

### Estados del flujo de generación

- **Generando** — spinner con texto "Generando archivo..." y contexto de la selección.
- **Archivo listo** — ícono check verde, resumen (entidad + cantidad de clientes + período),
  botón primario "Descargar .xlsx".
- **Sin resultados** — mensaje de error claro, sin generación de archivo vacío. El usuario
  puede volver al modal para ajustar los parámetros.

### Esquema de columnas confirmado con Facundo Arce

Ambas planillas comparten las mismas 22 columnas base. PSP agrega 2 columnas exclusivas.

| # | Columna | Tipo | Origen |
|---|---|---|---|
| 1 | Fecha | Manual | Vacío en el export — Legal completa manualmente |
| 2 | Legajo | Auto | LEX |
| 3 | Operacion | Auto | LEX · desplegable: Alta / Baja |
| 4 | Tipo | Auto | LEX · desplegable: Persona Humana / Persona Física |
| 5 | Apellido | Auto | LEX |
| 6 | Nombre | Auto | LEX |
| 7 | Fecha de Nacimiento | Auto | LEX |
| 8 | Pais de nacimiento | Auto | LEX · desplegable: Argentina / Venezuela / Paraguay / Uruguay |
| 9 | Documento | Auto | LEX · desplegable: DNI / Estatuto |
| 10 | Numero | Auto | LEX · número de documento |
| 11 | Vencimiento | Auto | LEX |
| 12 | CUIT/CUIL | Auto | LEX |
| 13 | Mail | Auto | LEX |
| 14 | Domicilio | Auto | LEX |
| 15 | Provincia | Auto | LEX · desplegable: todas las provincias argentinas |
| 16 | Pais | Auto | LEX |
| 17 | Profesion/actividad | Manual | Vacío en el export — desplegable ARCA, completa Legal |
| 18 | PEP | Auto | LEX · desplegable: Negativo / Positivo |
| 19 | SO | Auto | LEX · desplegable: Negativo / Positivo |
| 20 | FATCA/OFAC | Auto | LEX · desplegable: Negativo / Positivo |
| 21 | Black List | Auto | LEX · desplegable: SI / NO |
| 22 | CVU Banco Bind | Auto | LEX · **solo PSP (Haz Pagos)** |
| 23 | CVU Banco Coinag | Auto | LEX · **solo PSP (Haz Pagos)** |
| 24 | Operatoria Estimada | Manual | Vacío en el export — desplegable ARCA, completa Legal |

### Decisiones de diseño clave

- **Campos con desplegable** se exportan con los valores exactos aceptados por Excel para
  evitar errores de validación al abrir el archivo.
- **Codificación UTF-8** — garantiza correcta visualización de tildes y ñ.
- **Solo clientes `status = APPROVED`** son exportables.
- **Campos manuales** (Fecha, Profesion/actividad, Operatoria Estimada) se exportan vacíos.
- **Rango máximo de 1 mes** por descarga desde el punto de acceso A (listado).
- **Sin resultados** → mensaje de error claro — el sistema no genera archivo vacío.
- **Campo vacío en LEX** → se exporta vacío, sin bloqueo.

### Hipótesis abierta heredada — H-07

¿Puede este REQ resolverse dentro del módulo transversal de Reportería (REQ-59)?
El export de Altas Legales es conceptualmente un reporte estructurado generado a demanda.
La solución se diseñó como independiente en LEX con la premisa de que cuando REQ-59 madure,
este export migra sin fricción. Estado: Abierta · Prioridad: Media.

---

## Changelog

| Fecha | Cambio |
|---|---|
| 2026-05-19 | Creación del discovery dedicado. Extrae y estructura el contexto documentado en el umbrella `lex-discovery.md` en la branch `feat/lex-export-altas-legales`. Documenta objetivo, contexto, flujo de usuario, esquema de columnas completo verificado contra `Altas_Legales_DEMO_REQ87.xlsx`, decisiones de diseño y H-07 abierta. |
