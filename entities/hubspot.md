# HubSpot

> Última actualización: 2026-05-05
> Tipo: Partner
> Jurisdicción(es): SaaS internacional (cuenta operada desde Argentina por Sales & Partnerships)
> Estado de la relación: Activa

## Qué es

HubSpot es la plataforma SaaS de CRM, marketing automation y sales enablement utilizada por **Sales & Partnerships** como sistema operativo de su día a día. No es una entidad financiera ni regulatoria — es la herramienta donde Ardua gestiona el pipeline comercial, las comunicaciones automatizadas con clientes y prospectos, y la trazabilidad del funnel de conversión.

En el ecosistema interno de Ardua, HubSpot ocupa el rol que en la taxonomía del framework correspondería a una futura aplicación COM (Comercial), pero ejecutado fuera del financial-core, sobre infraestructura de un tercero. Es **el único sistema desde el cual hoy Ardua envía comunicaciones automatizadas formales al cliente final**.

---

## Capacidades que nos habilita

- **Gestión del pipeline comercial**: Sales gestiona Leads, Deals y el funnel de conversión completo en HubSpot. Reemplaza/complementa la gestión histórica en Trello.
- **Marketing automation con IF/THEN**: HubSpot Workflows permiten disparar acciones (envío de emails, cambios de stage, tareas) condicionadas a properties de Contacts y Deals. Soporta flujos de espera y re-evaluación cuando una property cambia.
- **Templates de email con merge tags**: emails personalizados con variables dinámicas tomadas de las properties del Contact / Deal asociado, en distintos idiomas.
- **Properties custom por objeto**: Sales puede crear y mantener properties propias en Contacts, Companies y Deals sin intervención técnica.
- **Sincronización con sistemas externos**: HubSpot expone API y webhooks que permiten alimentar Contacts y Deals desde sistemas externos (en el caso de Ardua, prospectivamente desde LEX — ver `discoveries/hubspot-integration-discovery.md`).
- **Reporting y dashboards comerciales**: vistas consolidadas del pipeline, tasa de conversión, performance por comercial.

---

## Integración operativa

- **Áreas internas que la usan**: Sales & Partnerships (operación principal). Marketing usa la pata de email automation. Ningún área del financial-core opera directamente sobre HubSpot.
- **Flujo de datos hacia HubSpot**: hoy mayormente manual — Sales carga Leads y avanza Deals manualmente. **Pendiente**: integración LEX → HubSpot para alimentar automáticamente Contacts cuando un cliente activa su legajo (caso de uso REQ-56, ver discovery referenciado más abajo).
- **Flujo de datos desde HubSpot**: hoy no hay flujo automatizado hacia sistemas internos. Cualquier reportería que cruce HubSpot con datos del core se hace puntualmente y a mano.
- **Mecanismo de integración inbound — Webhook Triggers nativos**: HubSpot expone Webhook Triggers dentro de Workflows (endpoint base `https://api-na1.hubapi.com/automation/v4/webhook-triggers/...`) que reciben POST con payload JSON arbitrario, hacen upsert sobre Contact properties y disparan automatizaciones. Es el mecanismo elegido para el canal LEX → HubSpot (ver discovery). Validado funcionalmente con un endpoint de prueba el 2026-05-05.
- **Integraciones técnicas existentes**: ninguna conexión activa con LEX, OPS, FIN o CLP al momento de redactar este documento. La primera integración planeada es la del email de bienvenida (REQ-56).
- **Stack contiguo**: el agente **Miles** (Slack + n8n + Groq) opera sobre el flujo Producto ↔ Tecnología pero **no toca HubSpot** hoy. Para el primer caso de uso (REQ-56) se descartó usar n8n como intermediario — LEX consume directamente el Webhook Trigger de HubSpot. n8n se reserva para casos que requieran transformaciones complejas o fan-out entre múltiples consumidores.

---

## Restricciones y condiciones

- **Plan contratado**: [A completar — confirmar con Valentina / Mauro qué plan de HubSpot tiene Ardua, qué módulos están habilitados (Marketing Hub, Sales Hub, Service Hub, CMS Hub) y qué límites operativos aplican].
- **Límites de Workflows / contactos / emails mensuales**: [A completar — los planes de HubSpot tienen tiers de capacidad; relevante para anticipar fricción en escala].
- **API rate limits**: aplica al consumir la API desde sistemas externos. [A completar con números concretos del plan vigente].
- **Privacy & compliance**: HubSpot procesa datos personales de clientes (PII). Cualquier integración LEX → HubSpot mueve datos de KYC al sistema de un tercero — **revisar implicancias de privacidad y compliance** antes de implementar (ver Q-04 del discovery referenciado).
- **No es sistema de registro legal**: HubSpot no es fuente de verdad de ningún dato regulatorio. La fuente de verdad sigue siendo LEX (legajo) + sistemas operativos del core. HubSpot es un **espejo comercial** con datos seleccionados, no una réplica.

---

## Referencias

- **Discovery activo**: `discoveries/hubspot-integration-discovery.md` — Canal LEX ↔ HubSpot para automatización del ciclo de vida del cliente.
- **REQ relacionado**: `REQ-56` — Automatización del email de bienvenida (primer caso de uso del canal).
- **Owner interno**: Sales & Partnerships. Referente operativo de Marketing/HubSpot: Valentina de Loredo. Owner del área: Mauro Pascuccio (Head of Sales).
- **Documentación pública**: https://developers.hubspot.com/ (API, Webhooks, Workflows).
- **Contactos clave HubSpot**: [A completar — account executive / customer success de HubSpot asignado a la cuenta de Ardua].
