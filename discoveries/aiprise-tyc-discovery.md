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

## Mecanismo de aceptacion confirmado (fuente: Manual de Onboardings Ardua, nov 2025)

La aceptacion de TyC ocurre en el ultimo paso del wizard de AiPrise, para ambos tipos de cliente:

- **Persona Fisica (Template #2 ARDUA - KYC Analista Legales)**: radio button "Acepto" + boton "Enviar". Texto: "Declaro haber leido los Terminos y Condiciones de Ardua Solutions" con link al documento. Ultimo paso del onboarding.
- **Persona Juridica (Template #3 ARDUA - KYB)**: checkbox "Declaro haber leido y aceptar los Terminos y Condiciones" + boton "Enviar". Paso 7/7 del wizard.

Ambos flujos son completamente digitales dentro de AiPrise. No existe un documento fisico de aceptacion de TyC — la referencia a "documento fisico con checkbox" corresponde a otro documento (probablemente la DDJJ de Origen de Fondos, que se firma por DocuSign al cierre del proceso Comercial).

## Preguntas abiertas

- **Estructura**: ¿que campos almacena AiPrise del evento de aceptacion? ¿version del documento, timestamp, ID de sesion, IP, user-agent?
- **Fuente del evento**: ¿hay webhook de AiPrise que notifique la aceptacion al backend de Ardua?
- **Versionado**: ¿los TyC tienen versiones internas? ¿se registra a que version acepto cada usuario?
- **Contenido actual**: ¿que dice el link "Terminos y Condiciones" al que apunta AiPrise hoy? ¿esta redactado o es un placeholder?

## Proximos pasos

1. Confirmar con IT (Santi Ahmed): ¿hay webhook de AiPrise que notifique la aceptacion de TyC al backend de Ardua?
2. Verificar que dice el link de TyC dentro de AiPrise hoy (si esta redactado o es placeholder).
3. Definir scope del requerimiento tecnico para replicar el registro de AiPrise a S3 de Ardua (modelo PWI-67).
4. Emitir requerimiento.

## Hallazgos

| Fecha | Hallazgo | Impacto |
|---|---|---|
| 2026-06-11 | AiPrise almacena la aceptacion de TyC por usuario. Ardua no tiene copia propia en su infraestructura (fuente: Santi Ahmed) | El gap no es de captura sino de propiedad del dato |
| 2026-06-11 | Mecanismo confirmado (fuente: Manual de Onboardings Ardua): la aceptacion ocurre en el ultimo paso del wizard de AiPrise, de forma digital. PF: radio button "Acepto" + Enviar. PJ: checkbox + Enviar (paso 7/7). No existe documento fisico de aceptacion de TyC | Aplica a ambos tipos de cliente. La referencia a "documento fisico con checkbox" era incorrecta — ese mecanismo corresponde a la DDJJ de Origen de Fondos (DocuSign, proceso Comercial) |
| 2026-06-11 | El patron de traer datos de AiPrise a infraestructura propia ya fue resuelto en PWI-67 (videos y selfies del KYC) | El requerimiento para TyC sigue el mismo modelo arquitectonico. No hay que inventar solucion nueva |
| 2026-06-11 | Los TyC los redacta Legal cuando corresponda — no es un prerequisito para el requerimiento tecnico de almacenamiento | No bloqueante para IT |

## Iniciativas relacionadas

- **Centaurus — Epic**: [PWI-68](https://arduasolutions.atlassian.net/browse/PWI-68)
- **Centaurus — Onboarding API (cliente → Centaurus)**: [PWI-69](https://arduasolutions.atlassian.net/browse/PWI-69)
- **Centaurus — Onboarding API (Centaurus → Ardua)**: [PWI-70](https://arduasolutions.atlassian.net/browse/PWI-70)
- **Discovery relacionado**: [`aiprise-liveness-check-discovery.md`](./aiprise-liveness-check-discovery.md)
