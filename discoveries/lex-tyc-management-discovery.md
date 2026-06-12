---
name: LEX — Módulo de gestión de TyC (CMS legal, versionado y distribución por API)
features: [LEX]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-12
updated_at: 2026-06-12
propagates_to:
  - features/lex/README.md
  - features/lex/lex-tyc-management.md
---

# LEX — Módulo de gestión de TyC (CMS legal, versionado y distribución por API)

## Objetivo

Definir un nuevo módulo dentro de LEX que permita al área Legal gestionar de forma autónoma el ciclo de vida de los Términos y Condiciones (TyC) de Ardua: redactarlos, versionarlos y distribuirlos a todos los servicios, apps y productos —presentes y futuros— que los consuman, y registrar de forma trazable qué versión aceptó cada cliente y cuándo.

El módulo es la fuente de verdad de los TyC del grupo. Reemplaza el modelo actual, donde los TyC viven dispersos (web pública, documentos en Drive de acceso restringido) y la aceptación se registra de forma pobre dentro de AiPrise.

## Contexto

Hoy el manejo de TyC tiene tres problemas acumulados, relevados durante el onboarding de clientes y la iniciativa Centaurus (PWI-68/69/70):

1. **El cliente accede a los TyC que acepta — pero el documento no tiene versión ni fecha.** Confirmado por Juani (Head of Legal, 2026-06-12): el link en AiPrise apunta al mismo contenido que publican las páginas web de Haz Pagos y Circuit Pay. El acceso no está bloqueado. El problema es otro: ese documento no tiene número de versión ni fecha de publicación, por lo que aunque el cliente lo lea y lo acepte, Ardua no puede acreditar *qué versión* estaba vigente en ese momento.
2. **No hay trazabilidad de aceptación.** AiPrise guarda solo un booleano (aceptó / no aceptó). No registra versión del documento, timestamp inmovilizado, IP ni user-agent. Ardua no tiene copia propia del evento. Si un cliente disputa qué términos aceptó, Ardua no puede acreditarlo.
3. **No hay versionado del contenido.** Los TyC no tienen fecha ni número de versión. Legal mantiene versiones internas sin un esquema formal, y la cláusula 10 establece que los cambios se aceptan por uso continuado, sin re-aceptación explícita. Un cliente puede terminar operando bajo términos que nunca aceptó.

A futuro, Ardua planea una app (iOS, exclusiva Apple) y un portal de clientes. Esos productos —y cualquier servicio futuro— necesitan consumir los TyC vigentes y, en los casos regulados, exigir aceptación explícita por versión. El manejo actual no escala a ese escenario.

## Hipótesis central

> Si los TyC se gestionan desde un módulo único en LEX —editable solo por Legal, con versionado inmutable y una API de distribución— entonces cualquier servicio, app o producto de Ardua (presente o futuro) puede consumir la versión vigente y registrar su aceptación de forma trazable, sin depender de copias dispersas ni de procesos manuales por área. La escalabilidad a productos futuros es un requisito de diseño, no un agregado posterior.

## Alcance funcional

### 1. Módulo de TyC en LEX con control de acceso por rol (RBAC)

Un nuevo módulo dentro de LEX, editable **únicamente por el área Legal**. Comercial, Operaciones y cualquier otra área no tienen permiso de edición. El control de acceso es estricto: la capacidad de crear/publicar TyC queda restringida al rol Legal.

### 2. CMS para redacción de TyC

Un editor de contenidos que permita a Legal redactar nuevos TyC de forma autónoma, sin intervención de desarrollo. El objetivo es que el área pueda escribir y publicar documentos por sus propios medios.

### 3. Versionado inmutable (append-only)

Los TyC vigentes **no se editan**. Cualquier cambio se materializa como una **versión nueva**. Una versión publicada queda inmovilizada: su contenido no puede alterarse retroactivamente. Esto garantiza que toda aceptación histórica apunte a un documento que no cambió desde que el cliente lo aceptó.

Cada versión tiene identidad propia (número/fecha de versión) que la hace citable y trazable.

### 4. Distribución por API a todos los consumidores

El módulo expone los TyC vigentes —y versiones históricas— vía API. Todos los servicios, apps y productos que necesiten TyC los consumen desde esta única fuente:

- Onboarding (AiPrise / LEX) hoy.
- App iOS y portal de clientes a futuro.
- Cualquier servicio o producto futuro de Ardua.

**Requisito de escalabilidad (transversal):** los TyC y su mecanismo de distribución deben garantizar escalabilidad a los servicios, apps y productos presentes y futuros de Ardua. Ningún consumidor nuevo debería requerir rediseñar el módulo: se integra contra la misma API.

### 5. Ledger de aceptación versionada en LEX

LEX registra, por cliente: qué **versión** de TyC aceptó y **cuándo** (timestamp inmovilizado). Este registro es la copia propia de Ardua del evento de aceptación —hoy inexistente— y la base para acreditar el consentimiento ante una disputa o un requerimiento regulatorio.

### 6. Aceptación explícita en contexto regulado (override de cláusula 10)

En los contextos regulados —en particular la app— la cláusula 10 actual (cambios aceptados por uso continuado, sin re-aceptación) **deja de tener efecto**. Ante una versión nueva, el cliente debe **re-aceptar explícitamente** antes de continuar operando. El ledger registra cada aceptación contra su versión específica.

## Patrones de aceptación por contexto

Antes de definir el mecanismo técnico de aceptación (T-04), es útil tener mapeado el landscape completo de patrones disponibles y cómo aplica cada uno a los contextos de Ardua. Este mapeo es la base de la recomendación que se llevará a Legal.

### Patrones disponibles

| # | Patrón | Descripción | Fricción | Solidez probatoria |
|---|---|---|---|---|
| 1 | **Scroll-to-accept** | El texto completo se muestra en pantalla; el botón "Aceptar" se habilita solo cuando el usuario llega al final. Genera evidencia implícita de exposición al contenido. Ej: Google Wallet, iOS setup, Robinhood. | Media | Alta |
| 2 | **Clickwrap simple** | Checkbox "Acepto los TyC" con hyperlink al documento. No requiere scroll ni lectura previa. Es lo que hace AiPrise hoy — con el agravante de que el link no funciona. Ampliamente aceptado en jurisprudencia internacional para relaciones digitales. | Baja | Media |
| 3 | **Sign-wrap (DocuSign)** | Se genera un PDF versionado del documento y se firma digitalmente. El evento queda en el ledger de DocuSign con timestamp, identidad y hash del documento. Ardua ya lo usa para la DDJJ de Origen de Fondos — hay precedente operativo. | Alta | Máxima |
| 4 | **Modal bloqueante en re-aceptación** | Cuando Legal publica una versión nueva, el usuario encuentra una pantalla bloqueante antes de poder seguir operando. Muestra el documento o el diff. Override explícito de la cláusula 10. Ej: WhatsApp al actualizar TyC, apps fintech reguladas en Europa. No aplica al onboarding inicial — es el mecanismo de re-aceptación por versión. | Baja-Media | Alta |
| 5 | **Two-step acceptance** | Pantalla 1: el usuario lee el documento completo. Pantalla 2: confirma que leyó y acepta. Separa explícitamente "exposición" de "consentimiento". Más claro legalmente que clickwrap simple; menos intrusivo que scroll-to-accept. | Media | Alta |
| 6 | **Email de confirmación post-aceptación** | El usuario acepta en el flujo y recibe un email con el documento adjunto. No es un mecanismo principal — es una capa de evidencia adicional sobre otro patrón. | Muy baja | Complementaria |

### Aplicación por contexto de Ardua

| Contexto | Patrón recomendado | Consideración |
|---|---|---|
| Onboarding actual (AiPrise) | Clickwrap simple con link real — o two-step si Legal requiere más solidez | El upgrade mínimo urgente es que el link apunte a contenido accesible |
| App iOS (cambios de TyC generales) | Notificación email previa + uso continuado (modelo AstroPay / cláusula 10) | Valido en iOS según §5.1.1 — AstroPay es precedente directo |
| App iOS (cambios que afectan prácticas de datos) | Modal bloqueante de re-aceptación | §5.1.1 exige consentimiento explícito cuando cambia cómo se recolectan/usan datos |
| Portal CLP (futuro) | Idem app iOS | Consumidor del mismo API de TyC |
| Acuerdo con terceros tipo Centaurus | Sign-wrap (DocuSign) | No es TyC de usuario final — es contrato B2B |

### Cláusula 10 y el modelo de notificación — posición de Legal

**Posición de Legal (Juani, 2026-06-12):** la cláusula 10 es suficiente para cubrir cambios de TyC, incluso en la app, siempre que se acompañe de **notificación previa al usuario** antes de que los nuevos términos entren en vigencia. El modelo de referencia es AstroPay: envían un email comunicando que a partir de una fecha determinada rigen los nuevos TyC, y el uso continuado de la app constituye aceptación. Legal considera que este modelo aplica a Ardua.

**Consideraciones que persisten:**

**1. BCRA PUSF — para Haz Pagos (PSPCP), la notificación debe cumplir forma y plazo regulatorio**
El Texto Ordenado PUSF (Com. "A" 8433, vigente 06/05/2026), Sección 2.3, exige que cualquier modificación que reduzca prestaciones o agregue obligaciones al usuario se notifique en la forma y con los plazos que establece la normativa. El modelo de notificación por email es compatible con este requisito *si* el aviso cumple esos plazos y canales. Legal debe confirmar que el mecanismo de notificación de Ardua los satisface para Haz Pagos como PSPCP.

**2. Ley 24.240 art. 37 y CCC art. 988 — riesgo latente sin notificación fehaciente**
Ambas normas pueden hacer inaplicable la cláusula 10 si el usuario puede argumentar que no recibió notificación adecuada del cambio. El riesgo no desaparece con la cláusula en sí, sino con la solidez del mecanismo de notificación. Un email con registro de envío y lectura mitiga significativamente el riesgo; un email sin confirmación de recepción, menos.

**3. Apple App Store §5.1.1 — aplica solo a cambios que afectan privacidad/datos**
La guideline 5.1.1 cubre **recoleccion de datos y privacidad**, no cambios de TyC en general. Una app puede usar el modelo notificacion + uso continuado para updates de TyC generales sin requerir modal bloqueante — AstroPay en iOS es evidencia directa. El modal bloqueante si es necesario si el cambio de TyC implica modificaciones en como Ardua recolecta, almacena o comparte datos del usuario (ahi §5.1.1 exige consentimiento explicito). Para cambios que no tocan practicas de datos, el modelo de Juani es valido tambien en iOS.

**Conclusión actualizada:** el modelo notificación + cláusula 10 es la posición de Legal y es operativamente viable, incluyendo para la app iOS. AstroPay lo usa en iOS sin modal bloqueante. El modal bloqueante aplica únicamente si un cambio de TyC modifica prácticas de recoleccion o uso de datos del usuario (§5.1.1). Para Haz Pagos, Legal debe asegurarse de que el mecanismo de notificación satisfaga los requisitos de forma y plazo del BCRA PUSF.

---

### Posición recomendada para llevar a Legal

> Clickwrap simple con link real para el flujo de onboarding actual (upgrade mínimo urgente). Scroll-to-accept + modal bloqueante para la app iOS y el portal CLP (contexto regulado, override de cláusula 10). Sign-wrap solo si Legal o CNV lo exigen explícitamente para algún flujo específico, dado el costo de fricción. En todos los casos, el ledger de aceptación del módulo de LEX registra el evento con versión + timestamp, independientemente del patrón de UX elegido.

---

## Fuera de alcance

- **Redacción del contenido legal en sí.** El módulo provee la herramienta; el texto lo escribe Legal.
- **Permisos de ubicación / geofencing de la app** (alerta a Legal por cercanía a zonas como Triple Frontera — planteado por Juani, Head of Legal). Es una feature de compliance de la app, no de gestión de TyC. Se trata en un discovery aparte (ver Preguntas abiertas).
- **Migración de los consumidores actuales** (AiPrise, web pública) a la API. Es trabajo de integración derivado, no parte del diseño del módulo.
- **Definición de la app iOS y del portal de clientes como productos.** Acá solo se contempla su rol como consumidores de TyC.

## Preguntas abiertas

| # | Pregunta | Responsable |
|---|---|---|
| T-01 | ~~¿El template de AiPrise linkea al doc de Drive restringido o a `arduasolutions.com/terms`?~~ **Resuelto (Juani, 2026-06-12):** el link apunta al mismo contenido que las páginas web de Haz Pagos y Circuit Pay. Acceso no restringido. El problema real no es el acceso sino la ausencia de versión y fecha en el documento. | — |
| T-02 | ¿Qué esquema de versionado adopta Legal (número, fecha, semántica)? Es prerequisito para que el ledger y el CMS sean trazables. | Legal (Lara / Juani) |
| T-03 | ¿El módulo soporta TyC diferenciados por entidad (Ardua Solutions Corp / Haz Pagos / Circuit Pay) y por jurisdicción, o un documento combinado por tipo de cliente como hoy? | Legal |
| T-04 | ¿La aceptación en contexto regulado requiere firma (DocuSign u otra) o alcanza con re-aceptación explícita + ledger (timestamp + versión + identidad de sesión)? Ver sección **Patrones de aceptación por contexto** — posición recomendada ya elaborada para llevar a Legal. | Legal + IT |
| T-05 | ¿Quién define los roles que pueden editar (solo Legal) y cómo se modela el RBAC en LEX hoy? | IT (Mati) |
| T-06 | ~~¿Dónde vive el geofencing de la app (Triple Frontera)?~~ **Resuelto (Producto, 2026-06-12):** fuera de scope de este módulo. Es una feature de compliance de la app iOS, no de gestión de TyC. Vive en un discovery futuro `app-ios-discovery.md` a crear cuando se inicie la iniciativa de la app. Queda documentado en "Fuera de alcance". | — |
| T-07 | ~~¿El módulo debe gestionar cláusulas de terceros como bloques versionables?~~ **Resuelto (Producto, 2026-06-12):** el módulo gestiona el documento como unidad versionada; las cláusulas son contenido de Legal, no objetos del CMS. La cláusula 6.4 (terceros) se incluye como contenido del documento. Si Legal requiere a futuro marcar bloques específicos (p. ej. para partners regulados), es una feature v2 — no cambia el diseño del módulo v1. Confirmar con Legal que la cláusula 6.4 vigente es suficiente para Centaurus. | — |

## Prerequisitos

| # | Prerequisito | Estado | Área |
|---|---|---|---|
| PRE-01 | Esquema de versionado de TyC definido por Legal | ⏳ Pendiente | Legal |
| PRE-02 | Modelo de RBAC en LEX que soporte rol Legal con permiso exclusivo de edición | ⏳ Pendiente evaluación técnica | IT (Mati) |
| PRE-03 | Definición del mecanismo de aceptación en contexto regulado (firma vs. ledger) | ⏳ Pendiente | Legal + IT |

## Hallazgos

| Fecha | Hallazgo / Decisión | Impacto |
|---|---|---|
| 2026-06-12 | **Corrección — Apple App Store §5.1.1:** la guideline cubre recoleccion de datos/privacidad, NO cambios de TyC en general. AstroPay usa email + uso continuado en iOS sin modal bloqueante. El modal solo aplica si el cambio de TyC modifica prácticas de datos. El modelo de Juani es valido tambien en iOS para updates de TyC generales. | El constraint de Apple es más acotado de lo que se documentó inicialmente. La posición de Juani queda validada tecnicamente. |
| 2026-06-12 | **Cláusula 10 — posición de Legal (Juani):** modelo notificación previa + uso continuado es suficiente, siguiendo el precedente AstroPay (email previo a la fecha de vigencia de los nuevos TyC). Consideraciones que persisten: (1) para Haz Pagos/PSPCP, el mecanismo de notificación debe cumplir forma y plazo del BCRA PUSF; (2) Apple App Store §5.1.1 requiere modal bloqueante en la app independientemente de la posición legal. | El modal bloqueante en la app sigue siendo obligatorio por Apple. Para Haz Pagos, Legal debe asegurar que la notificación cumple los requisitos regulatorios del BCRA. |
| 2026-06-12 | **T-01 resuelto (Juani, 2026-06-12):** AiPrise linkea al mismo contenido publicado en las páginas de Haz Pagos y Circuit Pay. El acceso no está bloqueado. El gap real es que el documento no tiene número de versión ni fecha, no que sea inaccesible. |  El problema de trazabilidad persiste — el cliente puede acceder al documento pero Ardua no puede acreditar qué versión estaba vigente cuando lo aceptó. |
| 2026-06-12 | **Cláusula 10 — análisis regulatorio (previo a posición de Legal):** (1) BCRA PUSF Com. A 8433 (vigente 06/05/2026), Secc. 2.3: cualquier modificación que reduzca prestaciones o agregue obligaciones al usuario requiere **consentimiento expreso previo** — el uso continuado no cuenta. Aplica a Haz Pagos como PSPCP. (2) Ley 24.240 art. 37: las cláusulas que modifican derechos por silencio o uso se tienen por no convenidas en contratos de consumo. (3) CCC art. 988: en contratos de adhesión (los TyC lo son), las cláusulas que impliquen renuncia o restricción de derechos del adherente son inválidas. (4) Apple App Store Guidelines §5.1.1: requiere consentimiento explícito ante cambios de términos — sin modal bloqueante, la app puede ser rechazada. | La cláusula 10 debe ser reescrita o eliminada en la próxima versión de TyC. El modal bloqueante de re-aceptación es requisito funcional para la app iOS y el portal CLP, no solo una decisión de UX. Escalar a Legal (Lara / Juani). |
| 2026-06-12 | El link de aceptación en AiPrise apunta a un doc de Drive restringido a cuentas @arduasolutions (uno PF, uno PJ, TyC combinados Ardua + sociedades). El cliente no puede leer lo que acepta (fuente: Santi / Manual de Onboardings) | El problema no es solo de trazabilidad: el cliente no tiene acceso al contenido. Refuerza la necesidad de una fuente única distribuida por API |
| 2026-06-12 | Decisión: se crea un módulo de gestión de TyC en LEX como nueva versión de la plataforma. Editable solo por Legal, versionado inmutable, distribución por API, ledger de aceptación versionada | Define el scope de esta iniciativa |
| 2026-06-12 | Requisito transversal: los TyC deben garantizar escalabilidad a servicios, apps y productos presentes y futuros de Ardua (fuente: Santi) | La API de distribución y el versionado se diseñan para multi-consumidor desde v1 |
| 2026-06-12 | En contexto regulado (app iOS), la cláusula 10 (aceptación por uso continuado) deja de aplicar: se exige re-aceptación explícita por versión (fuente: Santi) | El ledger debe registrar aceptación contra versión específica, no un booleano global |
| 2026-06-12 | La app será exclusiva iOS (Apple). Juani (Head of Legal) plantea además permisos de ubicación para alertar a Legal por cercanía a zonas sensibles (Triple Frontera) | El geofencing es feature aparte — fuera de scope de este discovery |
| 2026-06-12 | La cláusula 6.4 de los TyC habilita compartir información con terceros | Base relevante para el intercambio con Centaurus; abre T-07 sobre gestión de cláusulas de terceros |

## Iniciativas / discoveries relacionados

- **Almacenamiento de aceptación en onboarding**: [`aiprise-tyc-discovery.md`](./aiprise-tyc-discovery.md) — pieza acotada de captura/almacenamiento de la aceptación durante el onboarding de AiPrise. El presente discovery cubre el ciclo de vida completo (redacción, versionado, distribución, ledger).
- **Centaurus — Partnership**: [`centaurus-partnership-discovery.md`](./centaurus-partnership-discovery.md) — PRE-01 de PWI-69/70 depende de tener TyC con cláusula de terceros, versionables y aceptación trazable.
- **Liveness check a S3**: [`aiprise-liveness-check-discovery.md`](./aiprise-liveness-check-discovery.md) — mismo patrón de traer datos de AiPrise a infraestructura propia ([PWI-67](https://arduasolutions.atlassian.net/browse/PWI-67)).
- **Discoveries de producto cliente**: `panel-cliente-discovery.md`, `portal-clientes-mail-bienvenida-discovery.md` — consumidores futuros de la API de TyC.
- **Manual de Onboardings Ardua** (Facundo Arce, nov 2025) — fuente del flujo de aceptación actual.
