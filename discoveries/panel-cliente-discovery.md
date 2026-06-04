---
name: Panel de Cliente — Vista 360 transversal del core
features: [COMMON]
status: En investigación
owner: Santino Domeniconi / Yasmani Rodriguez
created_at: 2026-06-04
updated_at: 2026-06-04
propagates_to:
  - features/common/panel-cliente.md
---

# Panel de Cliente — Vista 360 transversal del core

## Objetivo

Definir si el patrón de panel lateral de contexto de cliente iniciado en TRD (PWI-64) puede
generalizarse como feature transversal del core — un "call center view" invocable desde
cualquier app del financial-core cuando el operador está trabajando con un cliente.

## Contexto

**Señal de origen:** PWI-64 (TRD — Módulo Clientes, sidebar de saldo y límites) reveló que
el patrón de panel lateral de contexto de cliente tiene demanda implícita más allá de TRD.
Santino Domeniconi y Yasmani Rodriguez identificaron la señal como potencialmente transversal
durante la revisión del discovery (2026-06-04).

**Hipótesis central:** un operador de backoffice — independientemente de si trabaja en TRD,
OPS, LEX o FIN — necesita acceder en el momento del trabajo al contexto del cliente: quién es,
en qué estado está, qué posición tiene, qué historial tiene. Hoy ese acceso requiere navegar
entre apps o abrir múltiples tabs.

**Referencia al seed:** `discoveries/trd-clientes-discovery.md` — primer caso del patrón.
Su scope está cerrado (saldo por moneda + límites por entidad en TRD) y no se modifica.

---

## Notas preliminares (para retomar)

- El panel probablemente agrega datos de múltiples fuentes: identidad y compliance (LEX),
  posición operativa (TRD), historial cross-app (audit trail de REQ-68 filtrado por cliente),
  items abiertos (Solicitudes/Alertas relacionadas al cliente).
- El historial del cliente podría consumir el stream del audit trail de REQ-68 sin
  infraestructura adicional, filtrando por `cliente_id`.
- Preguntas abiertas clave: ¿qué datos son prioridad v1? ¿el panel es read-only + shortcuts
  de navegación, o puede triggerear acciones del manifest? ¿cómo se federa la data entre apps?
- Validar si el dolor existe en LEX, OPS y FIN antes de asumir que es transversal.

---

## Estado y próximos pasos

Registrado como señal. Investigación a retomar aproximadamente en julio 2026.
