## RENAMED Requirements

- FROM: `### Requirement: Inbox houses Solicitudes; the canonical TS identifier MUST be `Solicitud``
- TO: `### Requirement: Inbox houses Solicitudes; the canonical TS identifier MUST be Solicitud<TPayload>`

- FROM: `### Requirement: Alertas houses system-detected events with profile A/B/C/D semantics`
- TO: `### Requirement: Alertas houses system-detected events with category triage/workflow/metric/cross_app_panel semantics`

- FROM: `### Requirement: Reports MAY emit REPORT_DEPENDENCY events; destination Alertas MUST consume them as `profile: 'A'``
- TO: `### Requirement: Reports MAY emit REPORT_DEPENDENCY events; destination Inbox MUST consume them as Tarea report_dependency_block with declarative auto_archive`
