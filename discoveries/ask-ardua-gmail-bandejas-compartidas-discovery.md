---
name: Ask Ardua — Acceso de Claude a bandejas de Gmail compartidas por área
features: []
status: En investigación
owner: Santino Domeniconi
created_at: 2026-05-26
updated_at: 2026-05-26
propagates_to: []
---

# Ask Ardua — Acceso de Claude a bandejas de Gmail compartidas por área

## Objetivo

Determinar cómo habilitar a Claude para leer y consultar bandejas de Gmail compartidas por área (e.g. `product@arduasolutions.com`, `legal@arduasolutions.com`) desde la sesión individual de cada usuario, sin que cada miembro del área deba conectar esa cuenta por separado — y sin depender de desarrollo custom.

## Contexto

El REQ-39 (solicitado por Lucila Rotholtz, Legal & Compliance) formaliza la necesidad de que Claude pueda acceder a bandejas de Gmail compartidas por área. El caso de uso central de Legal es la búsqueda de documentación enviada (KYC, cadenas de seguimiento de operaciones) y el resumen de threads antes de leerlos.

El conector de Gmail disponible en claude.ai opera en modalidad 1:1: cada usuario conecta su propia cuenta individual. No soporta múltiples cuentas simultáneas ni delegación de bandeja desde la API de Google — la delegación de Gmail (Mail Delegation) funciona únicamente a nivel de browser, no se traslada al token de la API que usa el conector MCP.

La investigación arrancó intentando conectar `product@arduasolutions.com` como segunda cuenta de Gmail en Claude, lo que no fue posible porque claude.ai permite solo una cuenta por conector. La alternativa de usar Mail Delegation tampoco resuelve el acceso vía API.

---

## Hipótesis investigadas

### H1 — Conectar la cuenta compartida como segunda instancia de Gmail en claude.ai
**Resultado: No viable.** claude.ai no permite más de una cuenta por conector. No existe opción "Add another account" en la UI de Connectors.

### H2 — Usar Mail Delegation de Google Workspace para que Claude acceda vía la sesión del usuario
**Resultado: No viable.** La delegación funciona en el browser pero no se expone a través de la API de Gmail que usa el conector MCP. El token de autenticación está atado a la cuenta individual del usuario.

### H3 — Configurar múltiples instancias del MCP server de Gmail en Claude Desktop
**Resultado: Viable en Claude Desktop, no en claude.ai.** En Claude Desktop se puede editar el archivo `claude_desktop_config.json` y agregar múltiples instancias del MCP server de Gmail, cada una autenticada con una cuenta distinta. Dado que todo el equipo de Ardua usa Claude Desktop, esta es una opción real pero requiere configuración manual por usuario y la gestión de credenciales OAuth propias (no el conector gestionado por Anthropic).

### H4 — Reenvío automático (forwarding) desde la cuenta compartida hacia la cuenta individual del usuario
**Resultado: Viable, implementado como workaround.** Se configuró reenvío automático desde `product@arduasolutions.com` hacia `sdomeniconi@arduasolutions.com`, con un filtro de Gmail en la cuenta destino que aplica automáticamente la etiqueta `Product Inbox` a todos los mails reenviados. Claude puede distinguir el corpus de Producto buscando con `label:Product Inbox`.

---

## Workaround activo (2026-05-26)

**Cuenta piloto:** `product@arduasolutions.com` → `sdomeniconi@arduasolutions.com`

**Configuración:**
1. En `product@arduasolutions.com`: Settings → Forwarding and POP/IMAP → reenvío activo hacia `sdomeniconi@arduasolutions.com`
2. En `sdomeniconi@arduasolutions.com`: filtro `to:product@arduasolutions.com` → etiqueta `Product Inbox` + Never send to Spam

**Limitaciones del workaround:**
- Los mails de `product@` se mezclan en la bandeja personal de `sdomeniconi` (solo separados por etiqueta)
- No hay separación de contexto por área — Claude puede ver todo si no se especifica el filtro
- No hay log de auditoría de consultas
- No escala limpiamente a múltiples áreas sin generar ruido en la bandeja personal del HoP
- No aplica a otros miembros del área — solo quien tiene el reenvío activo en su bandeja

---

## Caminos a evaluar

### Corto plazo
- Extender el workaround de reenvío a otras áreas con bandejas compartidas (Legal, Finance) con un filtro y etiqueta por área en la bandeja del responsable de cada área
- Explorar la configuración multi-instancia de Claude Desktop como alternativa más limpia al reenvío

### Mediano plazo
- Evaluar si Anthropic habilita múltiples cuentas por conector en claude.ai (hay issues abiertos en GitHub para esto)
- Si no avanza, diseñar la solución del REQ-39 como MCP server custom con lógica de permisos por área, registro de acceso y manejo de tokens por bandeja

### Relacionado
- **REQ-39** — Spec completo del requerimiento formal: flujo de habilitación por área (gestionado por HoP), separación de contexto, log de auditoría, offboarding, notificación de fallo de conexión
- El workaround actual no cumple REQ-39 — es un puente temporal hasta que haya solución de plataforma o desarrollo propio
