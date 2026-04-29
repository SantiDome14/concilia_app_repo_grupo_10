# BIND

> Última actualización: 2026-04-23
> Tipo: Banco
> Jurisdicción(es): Argentina
> Estado de la relación: Activa (en migración al módulo PSP de Ops)

## Qué es

BIND es el nombre comercial de **Banco Industrial S.A.**, entidad financiera argentina autorizada por el BCRA con casi un siglo de historia. Desde 2013 opera como Grupo BIND, un ecosistema que combina banco tradicional, unidades de inversión, seguros, leasing y garantías, y una pata fintech robusta.

Dentro del grupo, BIND ofrece dos verticales relevantes para Ardua:

- **BIND PSP** (Alberto Murad, CEO) — licencia + infraestructura PSP para que terceros operen como proveedor de servicios de pago sobre la espalda del banco.
- **bindX / Banking as a Service** (Candelaria Villagra, Head of BaaS) — APIs y módulos bancarios embebibles (cuentas, CVUs, pagos, conciliaciones, e-cheqs). Procesa 250M+ transacciones/mes con clientes como Mercado Pago, Cocos Capital, Cencosud y Aerolíneas Argentinas.

BIND fue el **partner técnico del primer PSP creado por Ardua** (bajo la entidad Haz Pagos).

---

## Capacidades que nos habilita

- **PSP sobre Haz Pagos**: BIND es uno de los bancos sponsor del esquema PSP de Haz Pagos, junto con COINAG y Banco de Comercio. Habilita la emisión de CVUs a clientes y la operatoria de cobros/pagos en pesos a nombre de Haz Pagos.
- **[A completar]**: APIs de BIND consumidas actualmente por Ardua (¿B-Collect para recaudaciones, API Banco, algún módulo bindX?).
- **[A completar]**: rails específicos disponibles a través de BIND (transferencias inmediatas, DEBIN, e-cheqs).
- **[A completar]**: tratamiento de saldos, custodia y plazos de acreditación bajo el esquema PSP con BIND.

---

## Integración operativa

- **Módulos internos que la usan**: hoy BIND se opera desde una **interfaz completamente separada** del módulo PSP de Ops — no está integrada al backoffice central de Ardua como sí lo están COINAG y Banco de Comercio. Esta fragmentación es lo que resuelve REQ-49.
- **Flujo de fondos**: misma lógica que los otros bancos sponsor del PSP — CBU (cuenta madre / parent de Ardua en BIND) + CVUs (subcuentas por cliente). [A completar: titularidad específica, cuenta madre, disponibilidad de whitelist]
- **Conciliación**: [A completar — no queda claro si la conciliación con BIND es programática como en COINAG o si se hace de forma manual desde la interfaz separada actual]
- **Integraciones técnicas**: [A completar — ¿BIND expone webhooks equivalentes a COINAG? ¿APIs tipo bindX? ¿o la integración histórica es legacy y por eso vive en un proyecto aparte?]. Esta pregunta está flaggueada como cuestión pendiente en REQ-49.
- **Estado del proyecto actual**: el proyecto/código donde vive hoy la integración con BIND **va a ser deprecado** una vez completada la migración al módulo PSP de Ops.

---

## Restricciones y condiciones

- **Frecuencia de uso operativo**: baja en el estado actual (según contexto aportado en REQ-49).
- **[A completar]**: límites operativos, costos, SLAs y condiciones contractuales vigentes entre Haz Pagos y BIND.
- **[A completar]**: requisitos KYC/onboarding específicos impuestos por BIND sobre los clientes finales de Haz Pagos.
- **[A completar]**: obligaciones de reporte que BIND solicita como banco sponsor.

---

## Referencias

- **Contrato de sponsor bancario Haz Pagos ↔ BIND**: [A completar — buscar y referenciar]
- **Documentación técnica de integración**: hoy vive en el repositorio/proyecto que va a ser deprecado. [A completar — identificar el repo actual y archivar documentación antes del cutover]
- **Contactos clave**: [A completar — cuentas de banca institucional, soporte técnico BIND PSP / bindX]
- **Referencias públicas**:
  - Sitio web corporativo: https://bind.com.ar/
  - bindX (BaaS): https://bindx.com/
- **Ticket relacionado**: REQ-49 — Integración del Banco BIND al módulo PSP de Ops
