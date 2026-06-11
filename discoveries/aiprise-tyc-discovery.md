---
name: AiPrise — Almacenamiento de aceptacion de TyC durante el onboarding
features: []
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-10
updated_at: 2026-06-10
propagates_to: []
---

# AiPrise — Almacenamiento de aceptacion de TyC durante el onboarding

## Objetivo

Determinar si Ardua cuenta con una base de datos propia que registre la aceptacion de Terminos y Condiciones (TyC) por parte de cada usuario durante el proceso de onboarding facilitado por AiPrise. En caso de que no exista, emitir un requerimiento para construirla.

## Contexto

Durante el onboarding de clientes en Ardua, el flujo se gestiona a traves de AiPrise. El usuario acepta los TyC como parte de ese proceso. La iniciativa de integracion con Centaurus Securities (ALyC, CNV N°239) —en curso bajo el Epic PWI-68— expuso la necesidad de que Ardua pueda acreditar la existencia y las condiciones bajo las cuales cada cliente acepto los TyC, ya que Centaurus podria requerir esa informacion para su propio proceso de alta.

El punto de partida correcto es verificar con IT si dicha base de datos ya existe y bajo que estructura, antes de emitir cualquier requerimiento.

## Hipotesis activa

Ardua no cuenta hoy con una base de datos propia que almacene el registro de aceptacion de TyC por usuario. AiPrise captura la aceptacion en su plataforma, pero Ardua no reingesta ni persiste ese evento en su propio sistema.

Si la hipotesis se confirma, el paso siguiente es emitir un requerimiento para construir esa capacidad.

## Preguntas abiertas

- **Existencia**: ¿existe hoy en la DB de Ardua una tabla o registro que almacene quienes aceptaron los TyC y cuando?
- **Estructura**: si existe, ¿que campos contiene? ¿version del documento aceptada, timestamp, ID de sesion AiPrise, IP, user-agent?
- **Fuente del evento**: ¿el registro se genera desde un webhook/evento de AiPrise o desde el propio backend de Ardua?
- **Versionado**: ¿los TyC tienen versiones internas? ¿se registra a que version acepto cada usuario?
- **Alcance**: ¿aplica solo a personas fisicas (OBPH) o tambien a personas juridicas?

## Proximos pasos

1. Consultar a IT (Santi Ahmed): ¿existe una tabla o entidad que registre la aceptacion de TyC por usuario?
2. Si existe → mapear estructura y evaluar si satisface los requerimientos de la integracion con Centaurus.
3. Si no existe → emitir requerimiento para construir la capacidad de almacenamiento propio de TyC.

## Iniciativas relacionadas

- **Centaurus — Epic**: [PWI-68](https://arduasolutions.atlassian.net/browse/PWI-68)
- **Centaurus — Onboarding API (cliente → Centaurus)**: [PWI-69](https://arduasolutions.atlassian.net/browse/PWI-69)
- **Centaurus — Onboarding API (Centaurus → Ardua)**: [PWI-70](https://arduasolutions.atlassian.net/browse/PWI-70)
- **Discovery relacionado**: [`aiprise-liveness-check-discovery.md`](./aiprise-liveness-check-discovery.md)
