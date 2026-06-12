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

Se suma un segundo gap, de **acceso**: investigado y resuelto (Juani, 2026-06-12). El link que ve el cliente apunta al mismo contenido que las páginas web de Haz Pagos y Circuit Pay — el acceso no está restringido. El gap real no es de acceso sino de **versionado**: el documento no tiene número de versión ni fecha, por lo que aunque el cliente lo lea, Ardua no puede acreditar qué versión estaba vigente en ese momento.

## Mecanismo de aceptacion confirmado (fuente: Manual de Onboardings Ardua, nov 2025)

La aceptacion de TyC ocurre en el ultimo paso del wizard de AiPrise, para ambos tipos de cliente:

- **Persona Fisica (Template #2 ARDUA - KYC Analista Legales)**: radio button "Acepto" + boton "Enviar". Texto: "Declaro haber leido los Terminos y Condiciones de Ardua Solutions" con link al documento. Ultimo paso del onboarding.
- **Persona Juridica (Template #3 ARDUA - KYB)**: checkbox "Declaro haber leido y aceptar los Terminos y Condiciones" + boton "Enviar". Paso 7/7 del wizard.

Ambos flujos son completamente digitales dentro de AiPrise. No existe un documento fisico de aceptacion de TyC — la referencia a "documento fisico con checkbox" corresponde a otro documento (probablemente la DDJJ de Origen de Fondos, que se firma por DocuSign al cierre del proceso Comercial).

## Almacenamiento en S3 — estado real (fuente: Santi Ahmed, 2026-06-12)

Ardua ya guarda en buckets de Amazon S3 **todos los datos capturados por AiPrise, excepto los liveness checks y las selfies**. Esos dos elementos serán incorporados a S3 a través del PWI emitido por Santi (alineado con el patrón PWI-67). Los responsables del dato en S3 son **Oriana Letini** y **Nicolás Gutik** (IT).

Esto reencuadra el gap de este discovery: el problema no es ausencia de almacenamiento general, sino que **el evento de aceptación de TyC no incluye qué versión del documento se aceptó**, porque el documento no está versionado. Los timestamps de alta y aceptación ya existen en el backend — lo que falta es el identificador de versión del documento al que esos timestamps están vinculados.

## Preguntas abiertas

- **Versionado Legal**: los TyC no tienen fecha ni numero de version. ¿Legal tiene un esquema de versiones interno? Traslada a T-02 del discovery de LEX.
- **Alcance por entidad**: ¿Haz Pagos (BCRA) y Circuit Pay (CNV) necesitan TyC propios? Traslada a T-03 del discovery de LEX.
- **Mecanismo de aceptacion**: ¿DocuSign o ledger liviano? Traslada a T-04 del discovery de LEX.

## Proximos pasos

1. Resolver T-02 (esquema de versionado) con Legal — prerequisito bloqueante.
2. Resolver T-03 (alcance por entidad) con Legal.
3. Resolver T-04 (mecanismo de aceptacion) con Legal + IT.
4. Con T-02 resuelto, emitir requerimiento tecnico para el modulo de TyC en LEX.

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
| 2026-06-12 | **T-01 resuelto (Juani, 2026-06-12):** el link de AiPrise apunta al mismo contenido publicado en las páginas de Haz Pagos y Circuit Pay. El acceso no está restringido. Gap real: ausencia de versión y fecha en el documento fuente. | El problema de acceso no existe. El único gap es el versionado. |
| 2026-06-12 | **Almacenamiento S3 confirmado (Santi Ahmed, 2026-06-12):** todos los datos de AiPrise ya están en S3 excepto liveness checks y selfies. Estos últimos se agregan via PWI emitido (patrón PWI-67). Responsables del dato: Oriana Letini y Nicolás Gutik (IT). | El gap de almacenamiento general está casi cerrado. Lo que falta es que el evento de aceptación capture el identificador de versión del documento. |
| 2026-06-12 | El link de aceptacion en AiPrise apunta a un doc de Drive restringido a cuentas @arduasolutions (combinado Ardua + sociedades, uno PF y otro PJ). El cliente no puede acceder al contenido que acepta (fuente: Santi / Manual de Onboardings) | Segundo gap ademas de la trazabilidad: el cliente nunca lee los TyC. Conflicto a confirmar con el hallazgo de `arduasolutions.com/terms` (T-01 en el discovery de LEX) |
| 2026-06-12 | Decision: la solucion de fondo (CMS legal en LEX, versionado inmutable, distribucion por API y ledger de aceptacion versionada) se mueve a un discovery propio: `lex-tyc-management-discovery.md`. Este discovery queda acotado a la captura de la aceptacion en el onboarding | Separa el ciclo de vida de TyC (LEX) de la captura puntual en onboarding (AiPrise) |
| 2026-06-12 | Requisito transversal: los TyC deben garantizar escalabilidad a servicios, apps y productos presentes y futuros de Ardua (fuente: Santi) | El versionado y la distribucion se disenan multi-consumidor desde v1. Se traslada al discovery de LEX |

## Iniciativas relacionadas

- **Gestion de TyC en LEX (solucion de fondo)**: [`lex-tyc-management-discovery.md`](./lex-tyc-management-discovery.md) — CMS legal, versionado inmutable, distribucion por API y ledger de aceptacion versionada. Este discovery es la pieza acotada de captura en onboarding.
- **Centaurus — Epic**: [PWI-68](https://arduasolutions.atlassian.net/browse/PWI-68)
- **Centaurus — Onboarding API (cliente → Centaurus)**: [PWI-69](https://arduasolutions.atlassian.net/browse/PWI-69)
- **Centaurus — Onboarding API (Centaurus → Ardua)**: [PWI-70](https://arduasolutions.atlassian.net/browse/PWI-70)
- **Discovery relacionado**: [`aiprise-liveness-check-discovery.md`](./aiprise-liveness-check-discovery.md)
