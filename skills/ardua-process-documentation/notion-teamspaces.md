# Notion Teamspaces — Ardua: Biblioteca de Procesos

Referencia única de IDs. Usar en Paso 7 del skill.

| Área | Teamspace ID | Biblioteca de Procesos (page_id) | data_source_id (si es DB) |
|------|-------------|----------------------------------|--------------------------|
| Products | `2e0e8880-def6-8129-b972-0042a74c4fbe` | `317e8880-def6-8046-8f0a-d49d9b234d28` | `317e8880-def6-8062-b0e0-000b5da91cd6` |
| Sales & Partnerships | `318e8880-def6-816a-997a-00427f015d61` | `318e8880-def6-80c8-9094-ef03847be493` | `318e8880-def6-817f-b1e8-000b38f3a2fa` |
| Marketing & Design | `270e8880-def6-81de-9d6c-0042d879ac1e` | `342e8880-def6-802d-a1d7-dfde5e068fc1` | `342e8880-def6-8135-9d66-000beb60a6ac` |
| Legal & Compliance | `318e8880-def6-81f4-addf-004254c01018` | `342e8880-def6-80d3-ac56-fe71b7807837` | `342e8880-def6-80d9-ae94-000b29e1a921` |
| Finance & Accounting | `31be8880-def6-81f8-85b9-004273ba637f` | `342e8880-def6-80a4-bfdc-f26f3b29df42` | `2ece8880-def6-80ae-a6e2-000b94ee55c7` |
| HR / People | `326e8880-def6-81ad-8aab-004213a4408a` | `342e8880-def6-80ca-be58-e15380aa1e6a` | `342e8880-def6-8142-b2e4-000ba3d6111c` |
| Operations | `33be8880-def6-81de-8d3b-0042fab0a6da` | `33be8880-def6-8015-a271-fe07a2a5fa0a` | — ver Nota especial abajo |
| Cybersecurity | `271e8880-def6-81eb-b9fe-0042a2f76b2b` | `342e8880-def6-80eb-aedc-e4e7611cf83b` | `342e8880-def6-80a1-ab8f-000b523969ec` |
| Trading Desk | `278e8880-def6-819c-bf11-0042d5b8c4d8` | `342e8880-def6-805f-87c3-e4a191c0f985` | ⚠️ Sin acceso — integración no habilitada |
| IT / Tecnología | `1f4e8880-def6-812c-9009-00423cb35915` | `342e8880-def6-8034-9c5b-cf06551c592b` | — Página simple (no DB) |

---

## Estrategia de publicación

### Regla principal

**Si el `data_source_id` está documentado** → usarlo directamente, sin fetchear.

**Si dice "⚠️ Sin acceso"** → la integración de Notion no tiene acceso a ese Teamspace. Informar al usuario:
> "No tengo acceso al Teamspace de [área] en Notion. Para habilitar la publicación, el responsable del área debe invitar la integración de Claude. Mientras tanto, ¿querés que te pase el documento en texto para copiarlo vos directamente?"

**Si dice "— Página simple (no DB)"** → usar `parent.page_id` con el contenido de `references/notion-page-template.md`. No buscar `data_source_id`.

Una vez que tenés el `data_source_id`:
- Crear el proceso con `parent.data_source_id` — **NUNCA usar `parent.page_id` para DBs**
- Mapear las propiedades al schema del área (ver secciones por área abajo)

Si la biblioteca es una **página simple** (no DB) → usar `parent.page_id` con el contenido de `notion-page-template.md`.

**Si falla por permisos:**
> "No tengo acceso al Teamspace de [área]. Podés pedirle al responsable que me dé acceso, o te paso el documento en texto para copiarlo vos en Notion."

---

## Schema por área

### Products — DB "Procesos"
`data_source_id: 317e8880-def6-8062-b0e0-000b5da91cd6`

| Propiedad | Tipo | Valor a usar |
|-----------|------|--------------|
| `Title` | title | Nombre del proceso |
| `Category` | select | `"Process"` para procesos operativos; `"Documentation"` para guías |
| `Status` | status | `"Draft"` al crear |
| `Tags` | multi_select | Seleccionar los que apliquen: `"Documentation"`, `"Specification"`, `"Reference"`, `"Important"` |
| `Author` | person | Usuario actual |
| `date:Last Updated:start` | date | Fecha actual (ISO: `YYYY-MM-DD`) |
| `date:Last Updated:is_datetime` | integer | `0` |
| `userDefined:ID` | text | Generar ID con patrón `POE-[CÓDIGO_ÁREA]-NNN` — ver sección "Generación del ID" abajo |

⚠️ Esta DB **no tiene** campo `Nivel de seguridad` ni `Entidad`. No mapear esos campos.

---

### Sales & Partnerships — DB "Procesos"
`data_source_id: 318e8880-def6-817f-b1e8-000b38f3a2fa`

Schema idéntico al de Products. Usar el mismo mapeo de propiedades.

⚠️ Esta DB **no tiene** campo `Nivel de seguridad` ni `Entidad`. No mapear esos campos.

---

### Marketing & Design — DB "Procesos"
`data_source_id: 342e8880-def6-8135-9d66-000beb60a6ac`

Schema idéntico al de Products. Usar el mismo mapeo de propiedades.

⚠️ Esta DB **no tiene** campo `Nivel de seguridad` ni `Entidad`. No mapear esos campos.

---

## Nota especial — Operations: dos destinos según tipo de proceso

El Teamspace de Operations tiene **dos destinos distintos** según el tipo de proceso:

### Tipo 1 — Flujos operativos financieros (Flujo OPS)
Procesos que involucran movimiento de fondos, activos digitales o instrucciones entre entidades del grupo.

- **Destino:** DB "Flujos" → `data_source_id: 33be8880-def6-8038-8bcf-000b03077c0d`
- **Template:** Template B de `notion-page-template.md`
- **Propiedades de la DB:**

| Propiedad | Tipo | Valores / Instrucción |
|-----------|------|-----------------------|
| `Nombre del flujo` | title | Nombre capturado en OPS-1a |
| `Entidad` | multi_select | Entidades de OPS-1b: Ardua Solutions Corp, Haz Pagos S.A., Circuit Pay S.A., Nerghis SRL |
| `Estado` | select | Iniciar en `"Borrador"` |
| `Responsable` | person | Usuario actual |
| `Completitud` | select | 🔴 Sin iniciar / 🟠 Incompleto / 🟡 Avanzado / 🟢 Completo |
| `Tareas pendientes` | select | 🔴 Con pendientes / ✅ Sin pendientes |
| `userDefined:ID` | text | Generar ID con patrón `POE-[CÓDIGO_ÁREA]-NNN` — ver sección "Generación del ID" abajo |
| `Última actualización` | last_edited_time | Automático — no editar |

⚠️ Esta DB **no tiene** campo `Nivel de seguridad`. No mapear ese campo.

### Tipo 2 — Procesos operativos internos (flujo estándar)
Procesos de gestión interna del área (ej: conciliación manual, gestión de tickets, onboarding operativo).

- **Destino:** DB "Procesos" → `data_source_id: 342e8880-def6-81cd-bfdf-000b5cabfeda`
- **Template:** Template A de `notion-page-template.md`

---

## Generación del ID del procedimiento

Todos los procedimientos creados por este skill deben tener un ID único siguiendo el patrón de Cybersecurity: `POE-[CÓDIGO_ÁREA]-NNN`.

**POE** = Procedimiento Operativo Estándar

### Tabla de códigos de área

| Área | Código |
|------|--------|
| Products | `PRD` |
| Sales & Partnerships | `SAL` |
| Marketing & Design | `MKT` |
| Legal & Compliance | `LEG` |
| Finance & Accounting | `FIN` |
| HR / People | `HRR` |
| Operations | `OPS` |
| Cybersecurity | `SEC` |
| Trading Desk | `TRD` |
| IT / Tecnología | `TEC` |

### Cómo generar el siguiente ID

Antes de crear la página, determinar el próximo número disponible:

1. Usar `notion-search` con `data_source_url` de la DB del área, query vacío o `"POE"`, para listar los registros existentes.
2. Leer el campo `userDefined:ID` (columna `ID` en la DB) de todos los resultados para el área.
3. Encontrar el número más alto (ej: `POE-SEC-015` → 15).
4. El nuevo ID = número siguiente con padding de 3 dígitos (ej: `POE-SEC-016`).
5. Si no hay registros previos → iniciar en `POE-[CÓDIGO]-001`.

Asignar el ID generado al campo `userDefined:ID` al crear la página.

> ⚠️ Si la DB no tiene campo `userDefined:ID` (detectado al fetchear el schema) → omitir este paso y no asignar ID.
