---
name: AiPrise — Almacenamiento de aceptacion de TyC durante el onboarding
features: []
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-10
updated_at: 2026-06-11
propagates_to: []
---

# AiPrise — Almacenamiento de aceptacion de TyC durante el onboarding

## Objetivo

Determinar si Ardua cuenta con una base de datos propia que registre la aceptacion de Terminos y Condiciones (TyC) por parte de cada usuario durante el proceso de onboarding facilitado por AiPrise. En caso de que no exista, emitir un requerimiento para construirla.

## Contexto

Durante el onboarding de clientes en Ardua, el flujo se gestiona a traves de AiPrise. El usuario acepta los TyC como parte de ese proceso. La iniciativa de integracion con Centaurus Securities (ALyC, CNV N°239) —en curso bajo el Epic PWI-68— expuso la necesidad de que Ardua pueda acreditar la existencia y las condiciones bajo las cuales cada cliente acepto los TyC, ya que Centaurus podria requerir esa informacion para su propio proceso de alta.

El punto de partida correcto es verificar con IT si dicha base de datos ya existe y bajo que estructura, antes de emitir cualquier requerimiento.

## Hipotesis activa

AiPrise registra la aceptacion de TyC por usuario. Ardua no tiene copia propia de ese registro en su infraestructura (S3 o equivalente). El gap no es de captura sino de propiedad del dato — Ardua depende de AiPrise para acceder al registro. El patron ya fue resuelto en PWI-67 para videos y selfies del KYC.

El flujo exacto de aceptacion actual (rol de Legal, documento fisico con checkbox) esta siendo relevado en reunion con el area Legal. Lo que se aprenda puede afinar el scope del requerimiento tecnico.

## Preguntas abiertas

- **Existencia**: ¿existe hoy en la DB de Ardua una tabla o registro que almacene quienes aceptaron los TyC y cuando?
- **Estructura**: si existe, ¿que campos contiene? ¿version del documento aceptada, timestamp, ID de sesion AiPrise, IP, user-agent?
- **Fuente del evento**: ¿el registro se genera desde un webhook/evento de AiPrise o desde el propio backend de Ardua?
- **Versionado**: ¿los TyC tienen versiones internas? ¿se registra a que version acepto cada usuario?
- **Alcance**: ¿aplica solo a personas fisicas (OBPH) o tambien a personas juridicas?

## Proximos pasos

1. Reunion con Legal: entender el flujo exacto de aceptacion actual (documento fisico, checkbox, quien lo gestiona, si queda copia en algun archivo).
2. Con esa info, definir scope del requerimiento tecnico para replicar el registro de AiPrise a S3 de Ardua (modelo PWI-67).
3. Emitir requerimiento.

## Hallazgos

| Fecha | Hallazgo | Impacto |
|---|---|---|
| 2026-06-11 | AiPrise almacena la aceptacion de TyC por usuario. Ardua no tiene copia propia en su infraestructura (fuente: Santi Ahmed) | El gap no es de captura sino de propiedad del dato |
| 2026-06-11 | El patron de traer datos de AiPrise a infraestructura propia ya fue resuelto en PWI-67 (videos y selfies del KYC) | El requerimiento para TyC sigue el mismo modelo arquitectonico. No hay que inventar solucion nueva |
| 2026-06-11 | Los TyC los redacta Legal cuando corresponda — no es un prerequisito para el requerimiento tecnico de almacenamiento | No bloqueante para IT |

## Iniciativas relacionadas

- **Centaurus — Epic**: [PWI-68](https://arduasolutions.atlassian.net/browse/PWI-68)
- **Centaurus — Onboarding API (cliente → Centaurus)**: [PWI-69](https://arduasolutions.atlassian.net/browse/PWI-69)
- **Centaurus — Onboarding API (Centaurus → Ardua)**: [PWI-70](https://arduasolutions.atlassian.net/browse/PWI-70)
- **Discovery relacionado**: [`aiprise-liveness-check-discovery.md`](./aiprise-liveness-check-discovery.md)
