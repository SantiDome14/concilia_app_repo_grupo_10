# Guía de implementación — Acceso de Claude a bandejas de Gmail compartidas por área

> Artefacto de soporte del discovery [`ask-ardua-gmail-bandejas-compartidas-discovery.md`](./ask-ardua-gmail-bandejas-compartidas-discovery.md)
> Relacionado con [REQ-39](https://arduasolutions.atlassian.net/browse/REQ-39)
> Última actualización: 2026-05-26

---

## Contexto de este documento

Este paso a paso describe el **workaround operativo** que permite a Claude acceder a bandejas de Gmail compartidas por área (e.g. `legal@arduasolutions.com`, `product@arduasolutions.com`) desde la sesión individual de cada usuario, mientras la solución definitiva del REQ-39 no está disponible.

El workaround fue investigado, probado y validado el 2026-05-26 sobre la cuenta `product@arduasolutions.com` como piloto.

**Limitaciones que este workaround NO resuelve** (quedan pendientes para la solución definitiva del REQ-39):
- No hay separación de contexto entre áreas — Claude puede ver todo si no se especifica el filtro
- No hay log de auditoría de consultas
- No aplica a todos los miembros del área — solo al usuario que tiene el reenvío activo
- Los mails de la cuenta compartida se mezclan en la bandeja personal del usuario (separados solo por etiqueta)

---

## Paso a paso de implementación por área

Repetir este proceso para cada área que quiera habilitar el acceso: Legal, Finance, Producto, etc.

---

### PASO 1 — Configurar el reenvío desde la cuenta compartida del área

**Quién lo hace:** el responsable del área o Yasmani (HoP), logueado con la cuenta compartida del área (e.g. `legal@arduasolutions.com`)

1. Abrir Gmail con la cuenta compartida del área
2. Click en ⚙️ → **See all settings**
3. Ir a la pestaña **Forwarding and POP/IMAP**
4. En la sección **Forwarding**, click en **Add a forwarding address**
5. Escribir el mail del responsable del área (e.g. `lrotholtz@arduasolutions.com` para Legal)
6. Click en **Next** → **Proceed** → **OK**
7. Google envía un mail de confirmación a la bandeja del responsable del área
8. El responsable del área abre ese mail de confirmación y hace click en el **link de verificación**
9. De vuelta en la cuenta compartida (Settings → Forwarding and POP/IMAP), seleccionar **Forward a copy of incoming mail to [mail del responsable]**
10. Click en **Save Changes**

✅ A partir de este momento, todos los mails que lleguen a la cuenta compartida se reenvían automáticamente a la bandeja del responsable.

---

### PASO 2 — Crear el filtro con etiqueta en la bandeja del responsable

**Quién lo hace:** el responsable del área, logueado con su cuenta personal (e.g. `lrotholtz@arduasolutions.com`)

1. Abrir Gmail con la cuenta personal del responsable
2. Click en ⚙️ → **See all settings**
3. Ir a la pestaña **Filters and Blocked Addresses**
4. Click en **Create a new filter**
5. En el campo **To** escribir la dirección de la cuenta compartida del área (e.g. `legal@arduasolutions.com`)
6. Dejar todos los demás campos vacíos
7. Click en **Create filter** (no en Search)
8. En la pantalla de acciones tildar:
   - ✅ **Apply the label** → click en "Choose label..." → **New label...** → escribir el nombre del área (e.g. `Legal Inbox`) → **Create**
   - ✅ **Never send it to Spam**
   - ✅ **Also apply filter to X matching conversations** ← esto aplica la etiqueta a todos los mails anteriores que ya están en la bandeja
9. Click en **Create filter**

✅ Todos los mails de la cuenta compartida (nuevos y anteriores) quedan etiquetados con `Legal Inbox` en la bandeja del responsable.

---

### PASO 3 — Verificar que Claude puede leer los mails

**Quién lo hace:** el responsable del área, en una sesión de Claude

1. Abrir Claude (claude.ai o Claude Desktop)
2. Verificar que el conector de Gmail está conectado con la cuenta personal del responsable (Settings → Connectors → Gmail)
3. En el chat, pedirle a Claude: *"Buscá en mi etiqueta Legal Inbox el mail más reciente y decime de qué trata"*
4. Claude debe poder encontrar y leer el mail sin problema
5. Para probar con adjuntos: enviar un mail de prueba a la cuenta compartida del área con un PDF adjunto y pedirle a Claude que lo resuma

✅ Si Claude responde correctamente, el workaround está operativo para el área.

---

### PASO 4 — Cómo usar el workaround en el día a día

Una vez configurado, el responsable del área puede pedirle a Claude:

**Búsqueda de documentación:**
> *"En mi etiqueta Legal Inbox, ¿hay algún mail donde hayamos enviado el KYC del Banco X?"*

**Resumen de cadenas:**
> *"Resumime los últimos 5 mails de Legal Inbox"*

**Lectura de adjuntos:**
> *"Buscá en Legal Inbox el mail con asunto 'Contrato Convera' y resumime el PDF adjunto"*

**Búsqueda por remitente o fecha:**
> *"En Legal Inbox, ¿qué mails recibimos de compliance@bancox.com en los últimos 30 días?"*

---

### PASO 5 — Aplicar retroactivamente a mails anteriores (si no se hizo en el Paso 2)

Si al crear el filtro no se tildó "Also apply filter to X matching conversations", se puede hacer después:

1. Settings → **Filters and Blocked Addresses**
2. Encontrar el filtro creado → click en **Edit**
3. Click en **Continue** sin cambiar nada
4. Tildar **Also apply filter to X matching conversations**
5. Click en **Update filter**

✅ Todos los mails históricos quedan etiquetados.

---

## Resumen de configuración por área

| Área | Cuenta compartida | Responsable | Etiqueta en Claude |
|---|---|---|---|
| Producto | `product@arduasolutions.com` | `sdomeniconi@arduasolutions.com` | `Product Inbox` |
| Legal | `legal@arduasolutions.com` | `lrotholtz@arduasolutions.com` | `Legal Inbox` |
| Finance | *(a confirmar)* | *(a confirmar)* | *(a definir)* |

---

## Qué queda pendiente (solución definitiva — REQ-39)

Este workaround es un puente temporal. La solución definitiva del REQ-39 requiere:

1. **Prerequisito técnico:** el CTO habilita Mail Delegation a nivel dominio en Google Workspace Admin (admin.google.com → Apps → Google Workspace → Gmail → User settings → Mail delegation → tildar "Let users delegate access to their mailbox to other users in the domain")
2. **Solución de plataforma:** que Anthropic habilite múltiples cuentas por conector de Gmail en claude.ai (hay issues abiertos en GitHub) — o bien
3. **Desarrollo custom:** MCP server propio con lógica de permisos por área, tokens por bandeja, separación de contexto y log de auditoría

Hasta que alguna de esas dos opciones esté disponible, el workaround de reenvío + etiquetas es el mecanismo operativo.
