---
name: Ask Ardua — Conectores y contexto compartido por area
features: []
status: En investigacion
owner: Santiago Domeniconi
created_at: 2026-05-07
updated_at: 2026-05-07
---

# Ask Ardua — Conectores y contexto compartido por area

## Objetivo

Investigar las limitaciones actuales del modelo de conectores de Ask Ardua para soportar fuentes de informacion compartidas entre multiples usuarios de un mismo area, y definir el patron de habilitacion y auditoria que permita escalar esta capacidad a toda la organizacion.

## Contexto

Ask Ardua es la capa de Claude con contexto interno de Ardua, lanzada en marzo 2026. En su configuracion inicial, cada usuario conecta sus propias fuentes de forma individual (Gmail, Notion, Drive, Slack, Calendar) mediante OAuth 1:1. Este modelo funciona bien para fuentes personales, pero no cubre el caso de areas que operan con cuentas compartidas.

El primer caso que expuso esta limitacion fue Legal/Compliance (REQ-39): el equipo opera con bandejas de Gmail compartidas que concentran comunicaciones con bancos, partners y clientes. Al intentar usar Ask Ardua para buscar documentacion en esas bandejas, encontraron que el conector solo soporta la cuenta personal de cada usuario — no permite que multiples miembros de un area accedan a una misma fuente compartida.

Esta limitacion probablemente aplica a otras areas con cuentas de correo o drives compartidos. El patron de solucion que se defina para Gmail puede replicarse a otros conectores.

---

## Hipotesis activas

### H1 — El modelo 1:1 de conectores es la raiz del problema

El conector de Gmail de Ask Ardua autentica contra una cuenta de usuario individual. No existe mecanismo para registrar una cuenta compartida como fuente disponible para un grupo de usuarios. Esto es una limitacion arquitectonica del conector, no un problema de configuracion.

**Estado:** confirmada (surgida del challenge de REQ-39)

### H2 — La solucion requiere un modelo de autenticacion diferente

Para soportar bandejas compartidas, la autenticacion no puede ser OAuth individual. Las opciones posibles incluyen service account de Google Workspace, delegacion de dominio, o conexion OAuth con la cuenta compartida administrada centralmente. La eleccion entre estas opciones es una decision de Tecnologia.

**Estado:** abierta — pendiente de validacion con Tecnologia

### H3 — El patron es replicable a otros conectores

Si el problema es el modelo 1:1, el mismo gap existe para Google Drive compartido, calendarios de area, u otras fuentes que no son de un usuario individual. Una solucion bien disenada para Gmail deberia poder aplicarse a otros conectores.

**Estado:** abierta — no validada aun

### H4 — La auditoria de acceso es un requisito no negociable para fuentes compartidas

Cuando Claude accede a informacion que no es de un usuario individual (bandejas compartidas, drives de area), el equipo necesita saber quien consulto que y cuando. Para Legal/Compliance esto tiene implicancias de compliance propio del area.

**Estado:** confirmada — incluida en alcance de REQ-39

---

## Decisiones tomadas

| Decision | Razon | REQ |
|---|---|---|
| El log de auditoria se almacena en un Google Sheet compartido con HoP y responsable del area | Solucion sin infraestructura adicional, accesible para el area | REQ-39 |
| La habilitacion de bandejas compartidas requiere aprobacion explicita del HoP — no hay autoservicio | Control centralizado mientras el patron madura | REQ-39 |
| El flujo de solicitud de habilitacion es: area solicita al HoP via Miles en Slack → HoP evalua y configura | Reutiliza canal existente (Miles) | REQ-39 |
| Los adjuntos de texto (PDFs, documentos) entran en alcance v1 | El caso de uso central de Legal ("mandamos el KYC?") requiere leer adjuntos, no solo el cuerpo del correo | REQ-39 |
| Adjuntos no textuales (imagenes, audio, video) fuera de alcance v1 | Complejidad tecnica vs. valor inmediato bajo | REQ-39 |

---

## Preguntas tecnicas abiertas para Tecnologia

Estas preguntas deben responderse antes de que el equipo de Tecnologia pueda estimar REQ-39:

1. **Autenticacion de cuenta compartida:** el conector actual de Gmail usa OAuth individual. Para soportar una cuenta compartida, las opciones son service account de Google Workspace, delegacion de dominio, u OAuth con la cuenta compartida administrada centralmente. ¿Cual es viable con la configuracion actual de Google Workspace de Ardua?

2. **Lectura de adjuntos:** el conector actual probablemente trae cuerpo y metadata del correo. Extender a adjuntos puede requerir un paso adicional de procesamiento (extraccion de texto de PDFs, parsing de documentos). ¿El conector existente lo soporta o hay que extenderlo?

3. **Modelo de identidad por area:** para que Ask Ardua sepa a que bandejas compartidas tiene acceso cada usuario, necesita saber a que area pertenece. ¿Como esta modelada hoy la identidad de usuarios en la plataforma?

4. **Destino del log de auditoria:** se definio Google Sheet como primera aproximacion. Tecnologia puede tener una solucion mejor integrada con lo que ya existe (n8n, Kibana, webhook). La decision del destino es de Tecnologia.

---

## Metricas de exito definidas (REQ-39)

- **Adopcion:** al menos el 80% del equipo de Legal/Compliance usa el conector al menos una vez en las primeras dos semanas post-lanzamiento.
- **Uso sostenido:** al menos 10 consultas semanales sobre las bandejas compartidas al cabo del primer mes.
- **Expansion:** al menos una segunda area habilita su bandeja compartida dentro de los 30 dias posteriores al lanzamiento con Legal/Compliance.
- **Senal cualitativa:** encuesta rapida al equipo de Legal a las dos semanas — al menos el 70% reporta reduccion percibida en el tiempo de busqueda de documentacion.

---

## Requerimientos vinculados

| REQ | Descripcion | Estado |
|---|---|---|
| REQ-39 | Acceso de Claude a multiples bandejas de Gmail compartidas por area | Enriquecido — pendiente Sent to Dev |
