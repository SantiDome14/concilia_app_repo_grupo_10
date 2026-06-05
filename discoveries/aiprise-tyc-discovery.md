---
name: AiPrise — Almacenamiento de aceptacion de TyC durante el onboarding
features: []
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-10
updated_at: 2026-06-12
tyc_url: https://www.arduasolutions.com/terms
privacy_url: https://www.arduasolutions.com/privacy
propagates_to: []
---

# AiPrise — Almacenamiento de aceptacion de TyC durante el onboarding

## Objetivo

Determinar si Ardua cuenta con una base de datos propia que registre la aceptacion de Terminos y Condiciones (TyC) por parte de cada usuario durante el proceso de onboarding facilitado por AiPrise. En caso de que no exista, emitir un requerimiento para construirla.

## Contexto

Durante el onboarding de clientes en Ardua, el flujo se gestiona a traves de AiPrise. El usuario acepta los TyC como parte de ese proceso. La iniciativa de integracion con Centaurus Securities (ALyC, CNV N°239) —en curso bajo el Epic PWI-68— expuso la necesidad de que Ardua pueda acreditar la existencia y las condiciones bajo las cuales cada cliente acepto los TyC, ya que Centaurus podria requerir esa informacion para su propio proceso de alta.

El punto de partida correcto es verificar con IT si dicha base de datos ya existe y bajo que estructura, antes de emitir cualquier requerimiento.

## Hipotesis activa

AiPrise registra la aceptacion de TyC por usuario, pero solo como un booleano (acepto / no acepto). No almacena timestamp, version del documento, IP ni ningun otro campo de trazabilidad. Los TyC viven en la web publica de Ardua Solutions. Legal tiene versiones internas del documento, pero no existe trazabilidad de que version acepto cada cliente ni cuando. El gap no es de captura sino de **ausencia total de trazabilidad de aceptacion**. El modelo PWI-67 (replicar datos de AiPrise a S3) no resuelve el problema porque el dato de calidad no existe en AiPrise. La solucion requiere construir un mecanismo propio.

## Mecanismo de aceptacion confirmado (fuente: Manual de Onboardings Ardua, nov 2025)

La aceptacion de TyC ocurre en el ultimo paso del wizard de AiPrise, para ambos tipos de cliente:

- **Persona Fisica (Template #2 ARDUA - KYC Analista Legales)**: radio button "Acepto" + boton "Enviar". Texto: "Declaro haber leido los Terminos y Condiciones de Ardua Solutions" con link al documento. Ultimo paso del onboarding.
- **Persona Juridica (Template #3 ARDUA - KYB)**: checkbox "Declaro haber leido y aceptar los Terminos y Condiciones" + boton "Enviar". Paso 7/7 del wizard.

Ambos flujos son completamente digitales dentro de AiPrise. No existe un documento fisico de aceptacion de TyC — la referencia a "documento fisico con checkbox" corresponde a otro documento (probablemente la DDJJ de Origen de Fondos, que se firma por DocuSign al cierre del proceso Comercial).

## Preguntas abiertas

- **Versionado Legal**: los TyC no tienen fecha ni numero de version. ¿Legal tiene un esquema de versiones interno? ¿Como se van a identificar las versiones para que el PDF versionado sea trazable?
- **Mecanismo de firma del PDF**: la sugerencia de Santi Ahmed es generar un PDF versionado con la firma del cliente. ¿La firma es una firma digital (DocuSign) o un mecanismo mas liviano (timestamp + hash del documento + ID de sesion)? Define el scope tecnico del requerimiento.
- **Momento del evento**: el webhook de AiPrise notifica el alta del cliente en LEX — ¿ese evento ocurre justo despues de que el cliente acepta los TyC, o puede haber un desfase? Impacta la trazabilidad temporal.
- **Alcance por entidad**: los TyC cubren Ardua Solutions Corp con jurisdiccion en British Columbia, Canada. ¿Aplican tambien a clientes de Haz Pagos (BCRA) y Circuit Pay (CNV), o esas entidades necesitan sus propios TyC bajo normativa argentina?
- **Clausula de terceros**: la clausula 6.4 cubre el intercambio de datos con partners de forma generica. ¿Legal confirma que es suficiente para la integracion con Centaurus, o se necesita una clausula especifica?

## Proximos pasos

1. Escalar a Legal (Lara / Juani) los hallazgos de los TyC: ausencia de fecha/version, alcance por entidad (ASC vs Haz Pagos vs Circuit Pay), suficiencia de clausula 6.4 para Centaurus.
2. Alinear con Legal el esquema de versionado — prerequisito para que el PDF versionado sea trazable.
3. Definir mecanismo de firma del PDF (Santi Ahmed + Legal) — digital (DocuSign) vs. liviano (timestamp + hash).
4. Emitir requerimiento con scope propio (no basado en PWI-67).

## Hallazgos

| Fecha | Hallazgo | Impacto |
|---|---|---|
| 2026-06-11 | AiPrise almacena la aceptacion de TyC por usuario. Ardua no tiene copia propia en su infraestructura (fuente: Santi Ahmed) | El gap no es de captura sino de propiedad del dato |
| 2026-06-12 | No hay webhook de aceptacion de TyC en AiPrise. Si hay un webhook que notifica el alta del cliente en LEX — el evento de aceptacion llega de forma implicita via ese mecanismo (fuente: Santi Ahmed) | El backend de Ardua puede saber que el cliente completo el onboarding, pero no el momento exacto ni la version de TyC aceptada |
| 2026-06-12 | AiPrise solo almacena un booleano de aceptacion. No registra timestamp, version del documento, IP ni user-agent. Los TyC viven en la web publica de Ardua Solutions (fuente: Santi Ahmed) | El modelo PWI-67 no aplica. El problema es ausencia de trazabilidad, no de replicacion de dato |
| 2026-06-12 | Legal tiene versiones internas de los TyC pero no hay trazabilidad de que version acepto cada cliente ni cuando (fuente: Santi Ahmed) | Gap de compliance: si un cliente disputa los terminos que acepto, Ardua no puede acreditarlo hoy |
| 2026-06-12 | Santi Ahmed sugiere generar un PDF versionado de los TyC con la firma del cliente al momento de aceptacion | Cambia el scope del requerimiento: no es replicar un dato existente sino construir un mecanismo nuevo de trazabilidad |
| 2026-06-12 | TyC revisados en arduasolutions.com/terms: contenido real y vigente, cubre Ardua Solutions Corp. Clausula 6.4 habilita intercambio de datos con partners de forma generica — base suficiente para Centaurus, pendiente confirmacion Legal | El link en AiPrise apunta a contenido real, no a un placeholder |
| 2026-06-12 | Los TyC no tienen fecha ni numero de version. La Privacy Policy si tiene fecha (Feb 10, 2025) pero tampoco version | Gap critico: sin versionado en el documento fuente, el PDF versionado no puede ser trazable. Legal debe agregar fecha/version antes de que IT construya el mecanismo |
| 2026-06-12 | Clausula 10 de los TyC: los cambios se aceptan por uso continuado, sin re-aceptacion explicita | Riesgo de trazabilidad: un cliente puede estar operando bajo TyC que nunca acepto formalmente. Escalar a Legal |
| 2026-06-12 | Jurisdiccion de los TyC: British Columbia, Canada. No menciona normativa argentina | Alcance por entidad a confirmar con Legal: los TyC actuales cubren Ardua Solutions Corp. Haz Pagos (BCRA) y Circuit Pay (CNV) pueden requerir documentos separados bajo normativa local |
| 2026-06-12 | Timestamp de alta y aceptacion ya capturados en el backend de Ardua. No se muestran en LEX pero el dato existe (fuente: Santi Ahmed) | El gap no es de captura de timestamp sino de inmovilizar que documento acepto el cliente en ese momento |
| 2026-06-11 | Mecanismo confirmado (fuente: Manual de Onboardings Ardua): la aceptacion ocurre en el ultimo paso del wizard de AiPrise, de forma digital. PF: radio button "Acepto" + Enviar. PJ: checkbox + Enviar (paso 7/7). No existe documento fisico de aceptacion de TyC | Aplica a ambos tipos de cliente. La referencia a "documento fisico con checkbox" era incorrecta — ese mecanismo corresponde a la DDJJ de Origen de Fondos (DocuSign, proceso Comercial) |
| 2026-06-11 | El patron de traer datos de AiPrise a infraestructura propia ya fue resuelto en PWI-67 (videos y selfies del KYC) | El requerimiento para TyC sigue el mismo modelo arquitectonico. No hay que inventar solucion nueva |
| 2026-06-11 | Los TyC los redacta Legal cuando corresponda — no es un prerequisito para el requerimiento tecnico de almacenamiento | No bloqueante para IT |

## Iniciativas relacionadas

- **Centaurus — Epic**: [PWI-68](https://arduasolutions.atlassian.net/browse/PWI-68)
- **Centaurus — Onboarding API (cliente → Centaurus)**: [PWI-69](https://arduasolutions.atlassian.net/browse/PWI-69)
- **Centaurus — Onboarding API (Centaurus → Ardua)**: [PWI-70](https://arduasolutions.atlassian.net/browse/PWI-70)
- **Discovery relacionado**: [`aiprise-liveness-check-discovery.md`](./aiprise-liveness-check-discovery.md)
