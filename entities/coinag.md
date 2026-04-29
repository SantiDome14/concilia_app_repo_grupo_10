# COINAG

> Última actualización: 2026-04-23
> Tipo: Banco
> Jurisdicción(es): Argentina
> Estado de la relación: Activa

## Qué es

COINAG es el nombre comercial de **Banco Coinag S.A.**, entidad financiera argentina con más de 50 años de trayectoria y raíz cooperativa (Cooperativa Coinag — fundada a fines de los años 50, consolidada en 1979 como Banco Coinag Cooperativo Limitado). Hoy opera como banco privado con casa central en Rosario (Santa Fe) y sucursales en Santa Fe, Córdoba y Buenos Aires.

Dentro del Grupo Coinag opera también **SG Financial Technology S.A.**, su fintech. SG Financial se ubica entre los **siete principales PSPs de Argentina**, con 9 millones de CVUs activas y 50 millones de transacciones mensuales. Es la pata tecnológica que habilita la operatoria PSP del grupo.

COINAG es **el banco sponsor más maduro** del módulo PSP de Ops de Ardua — el primero con integración programática completa.

---

## Capacidades que nos habilita

- **PSP sobre Haz Pagos**: banco sponsor del esquema PSP de Haz Pagos. Habilita la emisión de CVUs a clientes de Ardua y la operatoria de cobros y pagos en pesos a nombre de Haz Pagos, con el modelo CBU (cuenta madre) + CVUs (subcuentas por cliente).
- **Integración programática a Ops**: expone webhooks de eventos y permite conciliación automática de saldos y movimientos contra el ledger interno de OPS. Es el flujo más maduro del módulo PSP.
- **Nomenclatura de movimientos**: los eventos de COINAG se mapean a tres tipos internos en OPS:
  - **Collector Out** → transferencia desde un CVU hacia afuera del ecosistema Coinag
  - **Addition** → movimiento interno entre CVUs dentro del ecosistema Coinag (entrada al CVU)
  - **Deduction** → movimiento interno entre CVUs dentro del ecosistema Coinag (salida del CVU)
- **[A completar]**: rails disponibles a través de COINAG (transferencias inmediatas, DEBIN, e-cheqs, otros).

---

## Integración operativa

- **Módulos internos que la usan**: OPS (módulo PSP — el esquema COINAG es la pata de producción más avanzada), CLP (depósitos/withdrawals en pesos se reflejan al cliente vía OPS), FIN (conciliación contra ledger interno).
- **Flujo de fondos**:
  - **Depósitos**: automáticos vía CVU — los fondos llegan directamente a la CVU del cliente, sin pasar por una cuenta Pool.
  - **Withdrawals**: manuales — el cliente solicita, la mesa de Ops ejecuta. Requiere cuenta destino whitelisteada (la whitelist la gestionan usuarios con rol `admin-ops` / `admin-psp`).
- **Conciliación**: programática. Ardua lleva un ledger interno propio que se nutre de los webhooks de COINAG. En cada recarga, el balance del ledger se reconcilia contra el balance reportado por COINAG.
- **Integraciones técnicas**: webhooks + conciliación programática. [A completar — catalogar endpoints, eventos soportados, autenticación, tipos de errores y reintentos]
- **Roles**: `admin-psp` (gestión completa), `viewer-psp` (solo lectura).

---

## Restricciones y condiciones

- **Operatoria estrictamente en pesos argentinos**: el esquema PSP no opera ni ve nada fuera de ARS. Cualquier otra moneda corresponde al esquema Ops no-ARS.
- **[A completar]**: límites operativos, costos, SLAs y condiciones contractuales vigentes entre Haz Pagos y COINAG.
- **[A completar]**: requisitos KYC/onboarding que COINAG impone sobre clientes finales de Haz Pagos.
- **[A completar]**: obligaciones de reporte que COINAG solicita como banco sponsor.
- **Horarios de corte**: afectan costos operativos (ver `framework/marco-operativo.md` §1.3 y gap O-01). [A completar — horarios exactos de COINAG]

---

## Referencias

- **Contrato de sponsor bancario Haz Pagos ↔ COINAG**: [A completar — referenciar]
- **Documentación técnica de integración**: [A completar — referenciar docs de webhooks, endpoints de conciliación, credenciales]
- **Contactos clave**: [A completar — contactos de banca institucional COINAG y SG Financial Technology]
- **Referencias públicas**:
  - Banco Coinag: https://www.bancocoinag.com/
  - Cooperativa Coinag: https://cooperativacoinag.com/
- **Discovery relacionado**: `discovery/opened/ops-discovery.md` (esquema PSP descrito con detalle)
