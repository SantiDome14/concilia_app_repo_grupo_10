# Banco de Comercio

> Última actualización: 2026-05-04
> Tipo: Banco
> Jurisdicción(es): Argentina
> Estado de la relación: Activa

## Qué es

**Banco de Comercio S.A.** es una entidad financiera argentina autorizada por el BCRA (código de entidad **432**, Comunicación "A" 8139). Se constituyó como banco minorista en 2016 a partir de la transformación de la anterior Metrópolis Compañía Financiera, con foco inicial en financiamiento a pequeñas y medianas empresas.

Su propuesta comercial actual está orientada a comercios, negocios y profesionales: préstamos, e-cheq, tarjeta corporativa, terminales de captura y aceptación de medios de pago para optimización de cobros.

Banco de Comercio es uno de los bancos sponsor del esquema PSP de Ardua (junto con COINAG y BIND), integrado al módulo PSP de Ops.

---

## Capacidades que nos habilita

- **PSP sobre Haz Pagos**: banco sponsor del esquema PSP de Haz Pagos. Habilita la emisión de CVUs a clientes de Ardua y la operatoria de cobros/pagos en pesos a nombre de Haz Pagos, bajo el mismo modelo CBU (cuenta madre) + CVUs (subcuentas por cliente).
- **[A completar]**: rails disponibles a través de Banco de Comercio (transferencias inmediatas, DEBIN, e-cheqs, otros).
- **[A completar]**: APIs o canales técnicos consumidos hoy por Ardua para operar sobre Banco de Comercio.

---

## Integración operativa

- **Módulos internos que la usan**: OPS (módulo PSP), CLP (reflejo de depósitos/withdrawals al cliente), FIN (conciliación).
- **Flujo de fondos**: misma arquitectura que los otros bancos sponsor del PSP — CBU (cuenta madre de Ardua en Banco de Comercio) + CVUs por cliente. [A completar: titularidad específica, cuenta madre, detalles de whitelist]
- **Conciliación**: [A completar — confirmar si la conciliación con Banco de Comercio es programática como en COINAG o si tiene particularidades propias]
- **Integraciones técnicas**: [A completar — catalogar endpoints, webhooks disponibles, autenticación, mapeo de tipos de movimiento a la taxonomía interna de OPS]
- **Roles**: `admin-psp` (gestión completa), `viewer-psp` (solo lectura).

---

## Restricciones y condiciones

- **Operatoria estrictamente en pesos argentinos** (el esquema PSP no opera monedas distintas a ARS).
- **[A completar]**: límites operativos, costos, SLAs y condiciones contractuales vigentes entre Haz Pagos y Banco de Comercio.
- **[A completar]**: requisitos KYC/onboarding que Banco de Comercio impone sobre los clientes finales de Haz Pagos.
- **[A completar]**: obligaciones de reporte que Banco de Comercio solicita como banco sponsor.
- **Horarios de corte**: afectan costos operativos (ver `framework/marco-operativo.md` §1.3 y gap O-01). [A completar — horarios exactos de Banco de Comercio]

---

## Referencias

- **Contrato de sponsor bancario Haz Pagos ↔ Banco de Comercio**: [A completar — referenciar]
- **Documentación técnica de integración**: [A completar — referenciar docs y credenciales]
- **Contactos clave**: [A completar — contactos de banca institucional]
- **Referencias públicas**:
  - Sitio web corporativo: https://bancodecomercio.com.ar/
  - BCRA — Listado de entidades financieras: entidad 432
- **Discovery relacionado**: `discoveries/ops-discovery.md` (esquema PSP descrito con detalle)
