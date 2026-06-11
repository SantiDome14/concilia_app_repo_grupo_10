---
name: Centaurus — Partnership e integracion API bidireccional de onboarding
features: []
status: En investigacion
owner: Santino Domeniconi
created_at: 2026-06-02
updated_at: 2026-06-11
propagates_to:
  - entities/centaurus.md
  - features/clp/README.md
---

# Centaurus — Partnership e integracion API bidireccional de onboarding

## Objetivo

Entender que se construye en cada etapa de la integracion con Centaurus Securities S.A., que datos de onboarding se intercambian en cada direccion, que entidad de Ardua actua como contraparte, y como se resuelven los gaps normativos y de datos entre ambas plataformas. Definir el scope del requerimiento que surge de este partnership.

## Contexto

Ardua va a establecer un partnership comercial con Centaurus Securities S.A. (ALyC CNV N° 239, FCI CNV N° 137), una sociedad de bolsa argentina que opera en BYMA, MAE, MAV, ROFEX y MATBA. La integracion es via API y se plantea en dos etapas:

- **Etapa 1 (ellos a nosotros)**: clientes de Centaurus se onboardean en la plataforma de Ardua a traves de la API de Centaurus.
- **Etapa 2 (nosotros a ellos)**: clientes de Ardua acceden a Centaurus a traves de la API de Ardua.

Centaurus ya esta siendo onboardeada como cliente institucional de Ardua (canal Comercial, Trello de Compliance, columna "Compliance validando documentacion", al 2026-06-02). La relacion no empieza desde cero.

Al inicio de esta investigacion el producto concreto que se ofrece al cliente final en cada etapa no esta definido. Esa definicion es el prerequisito del diseno tecnico y del mapeo de datos.

---

## Hipotesis central

> Una integracion API bidireccional entre Ardua y Centaurus puede habilitar a los clientes de cada plataforma a usar los servicios de la otra sin friccion. El modelo no implica clientes compartidos ni legajo compartido — cada plataforma mantiene sus propios clientes. Lo que se intercambia son los datos de onboarding necesarios para que cada plataforma habilite al cliente. Para que sea operable desde el dia 1, los gaps de datos entre ambos procesos de onboarding deben estar resueltos, y la integracion de Ardua con la API de Centaurus debe estar implementada.

---

## Estado actual del proceso (flujo manual pre-API)

**Hallazgo clave (2026-06-02, fuente: Nicolas — area Comercial):** ya existen clientes compartidos entre Ardua y Centaurus operando hoy. El proceso es manual:

1. El cliente opera con Ardua para transacciones (FX, pagos, cables internacionales).
2. El mismo cliente opera con Centaurus para comprar y vender activos (acciones, CEDEARs, bonos, FCI, etc.).
3. Ardua guarda los legajos de sus clientes y los comparte con Centaurus.
4. Si faltan datos para completar el alta en Centaurus, se coordinan entre areas (canal no 100% definido — existe un grupo de WhatsApp llamado "documentacion clientes CNT" que se usa para este intercambio, pero no esta confirmado como canal formal).

Esto valida que el modelo es operativamente viable. La API no inventa un flujo nuevo — automatiza y escala uno que ya existe. El pain concreto a resolver: el intercambio manual de documentacion y la coordinacion informal entre equipos.

**Volumen actual**: aproximadamente 10 clientes de Centaurus pasaron a Ardua en el ultimo mes. Bajo pero real y medible — suficiente para validar el modelo antes de invertir en automatizacion.

**Flujo dominante**: Centaurus → Ardua (Etapa 1). Esto define la prioridad de desarrollo.

**Canal operativo actual**: grupo de WhatsApp "documentacion clientes CNT" para el intercambio de documentacion entre equipos. Estado: existente pero no formalizado.

**Proto-proceso en Trello**: el tag Centaurus en referenciadores es el punto de entrada — cuando llega un cliente referenciado por Centaurus se crea una tarjeta en Trello y desde ahí arranca el pedido de documentación. El pedido **no** está centralizado: se coordina por mail, por WhatsApp (grupo "documentación clientes CNT") y posiblemente por un canal de Slack al que el equipo Comercial no tiene acceso. La coordinación es multi-canal y no estandarizada — ese es el problema concreto que la API viene a resolver. **El MVP no es "evitar pedir docs" sino automatizar y centralizar ese pedido disperso.**

**Implicancia sobre el perfil inversor CNV:** el hecho de que Centaurus ya acepte legajos de Ardua como base sugiere que el gap del perfil inversor lo resuelve Centaurus directamente con el cliente. No es un bloqueante tecnico para la Etapa 1 — es una responsabilidad que queda del lado de Centaurus.

---

## Preguntas abiertas

| # | Pregunta | Estado | Impacto |
|---|---|---|---|
| P-01 | ¿Que producto o servicio de Ardua usan los clientes de Centaurus? | ✅ Respondida — transacciones (FX, pagos, cables) | Entidad contraparte probable: Ardua Solutions Corp |
| P-02 | ¿Que producto o servicio de Centaurus usan los clientes de Ardua? | ✅ Respondida — compra/venta de activos (acciones, CEDEARs, bonos, FCI) | Instrumentos de mercado de capitales vía ALyC |
| P-03 | ¿Cual es la entidad de Ardua que firma con Centaurus? | ⏳ Pendiente confirmacion formal | Probable: Ardua Solutions Corp. Restriccion de diseno del marco legal |
| P-04 | ¿Qué datos puntuales faltan y se piden hoy cuando falta información? | ✅ Parcialmente resuelta — documentacion patrimonial de Ardua recibida (PF y PJ). Requisitos de Centaurus disponibles via OBPH. Gap estructural confirmado (ver seccion Analisis del gap actualizada). Pendiente validar campos especificos con IT (economicActivityId) y Legal (P-10). | Define exactamente los campos que la API debe exponer |
| P-05 | ¿El flujo hoy es principalmente Ardua → Centaurus, o tambien viene gente de Centaurus → Ardua? | ✅ Respondida — flujo dominante es Centaurus → Ardua (~10 clientes/mes) | Etapa 1 es la prioridad de desarrollo |
| P-06 | ¿El tag Centaurus en Trello referenciadores implica que Compliance no pide documentación adicional? | ✅ Respondida — el tag es el disparador del proceso, no lo elimina. Desde Trello se coordina el pedido de documentación por mail, WhatsApp y posiblemente Slack (canal sin acceso para Nico). | El MVP es reemplazar ese flujo multi-canal disperso, no evitar el pedido de docs. |
| P-07 | ¿Qué documentación adjunta Centaurus en Trello exactamente? ¿Es siempre el set completo o varía por cliente? | ⏳ Bloqueada — pendiente confirmacion de Santi Ahmed. El OBPH describe el proceso de onboarding de Centaurus pero no el set exacto de documentos que adjuntan en el flujo manual de Trello. | Define si hay gap de datos en el flujo actual |
| P-08 | ¿Los T&C de Ardua con el cliente autorizan compartir datos con terceros como Centaurus? | ✅ Respondida — los T&C no están redactados. Cuando se redacten, el área Legal debe incluir el clause de compartir datos con terceros (qué datos, con quién, con qué fin). Prerequisito bloqueante para escalar la API. | Viabilidad legal del intercambio automatizado vía API |
| P-09 | ¿Hay contrato firmado entre Ardua y Centaurus, o el acuerdo es informal? | ✅ Respondida — no hay contrato firmado al 2026-06-02. Antecedente: ya se formalizó este tipo de acuerdo con ADCAP (no es un template, es un precedente). El contrato con Centaurus se redacta desde cero cuando corresponda. | Marco contractual necesario antes de operar la API a escala |

---

## Analisis del gap de datos

### Etapa 1 — Centaurus manda clientes a Ardua

**Lo que Centaurus tiene del cliente al finalizar su propio onboarding (segun OBPH):**
- Identidad verificada biometricamente (Motor Biometrico — APPROVED)
- Screening de compliance pasado (Checkone + OFAC)
- DNI/CUIL/CUIT + email verificado
- phoneNumber
- Domicilios RESIDENTIAL y FISCAL completos
- Datos laborales: companyName, jobRole, economicActivityId (ARCA)
- civilStatus
- Perfil inversor CNV (regulations)
- Condicion tributaria (taxes)
- Documentos adjuntos en el paso 6 del wizard (codigos de documento propios de Centaurus)
- Firma digital DocuSign completada

**Lo que Ardua necesita para abrir legajo en Ardua Solutions Corp:**
- Imagenes del ID (frente + dorso DNI o frente pasaporte)
- POA o domicilio confirmado
- Profesion / ocupacion
- Monto estimado a operar (rangos USD)
- Tipo de operacion
- World Check + Nosis
- DJ Origen de Fondos (al cierre)

**Gap Ardua Solutions Corp:**
- Imagenes del ID: Centaurus las obtiene via Motor Biometrico. Ardua usa AiPrise. Si el KYC de Centaurus es aceptado por Ardua (P-10), este gap se cierra. Si no, el cliente debe repetir el proceso.
- Monto estimado en USD: Centaurus no captura este dato. Debe completarse por el cliente o derivarse a un flujo adicional.
- DJ Origen de Fondos: tampoco esta en el OBPH. Requiere accion adicional.

**Gap adicional para Haz Pagos / Circuit Pay (PSP / PSAV):**
El onboarding en Haz Pagos o Circuit Pay requiere documentacion patrimonial que el OBPH de Centaurus no captura ni expone:

_Persona Fisica_: ultimos 3 recibos de sueldo, facturacion 6 meses (si monotributista), DDJJ Ganancias + Acuse, DDJJ REIBP + Acuse, DDJJ Bienes Personales + Acuse, DDJJ Regularizacion + Acuse, ingresos extraordinarios con documentacion de respaldo segun tipo (contratos de mutuos, compraventa de inmueble, donacion, creditos bancarios).

_Persona Juridica_: EECC legalizados o, en su defecto, facturas emitidas 12 meses, DDJJ IVA anual + Acuses, Acta de Asamblea con Aumento de Capital, Creditos Bancarios, Contratos de Mutuos, Certificacion Contable legalizada.

Este gap no tiene resolucion tecnica via API — el cliente debe proveer estos documentos por fuera del flujo de integracion con Centaurus. Implica que la Etapa 1 solo puede habilitar el alta en Ardua Solutions Corp de forma automatizada; Haz Pagos y Circuit Pay requieren un paso manual adicional.

**Para empresas**: Centaurus tiene onboarding digital para personas juridicas. Esta preparando la documentacion de integracion equivalente al OBPH para compartirla con Ardua (fuente: Santi Ahmed, 2026-06-11). PJ no esta fuera de scope — esta pendiente de documentacion. Cuando Centaurus entregue el documento, se retoma el analisis de gap para PJ en ambas etapas.

### Etapa 2 — Ardua manda clientes a Centaurus

**Lo que Ardua captura y coincide con lo que Centaurus necesita (segun OBPH):**
- Nombre, apellido, fecha de nacimiento, DNI, CUIT/CUIL (template LOCAL KYC)
- Domicilio (Ardua lo tiene; Centaurus requiere RESIDENTIAL y FISCAL separados con campos especificos)
- Email

**Gaps confirmados (segun OBPH):**

| Campo OBPH | Estado en Ardua | Severidad |
|---|---|---|
| `phoneNumber` | Probablemente capturado — validar con IT | Baja |
| `economicActivityId` (ID AFIP numerico) | Ardua captura profesion en texto libre — sin mapeo a IDs AFIP | Media — requiere tabla de mapeo o flujo hibrido |
| `civilStatus` (enum: SINGLE, MARRIED, DIVORCED, WIDOWED, CIVIL_UNION) | Ardua no captura estado civil en ningun template actual | Media |
| `regulations` (perfil inversor CNV) | Ardua no captura esto en ningun template. Obligatorio por normativa CNV para ALyC | **Alta — gap normativo critico. No se puede omitir ni delegar** |
| `taxes` (taxId + conditionId — IDs numericos) | Ardua captura condicion AFIP pero con diferente granularidad | Media |
| `notificationSources` | Ardua no captura esto | Baja |
| Documentos paso 6 (codigos propios de Centaurus) | Ardua tiene docs en AiPrise — los codigos de Centaurus pueden no coincidir | Media — requiere mapeo de codigos |

**Gap normativo critico (sin cambios):**
- **Perfil inversor CNV** (`regulations`): Centaurus como ALyC esta obligada a confeccionar el perfil inversor de cada cliente. Ardua no captura esto. Es un gap normativo — no se puede omitir ni delegar. La solucion mas probable es un flujo hibrido donde el cliente completa este paso directamente en la plataforma de Centaurus (ver P-12).

| P-10 | ¿El KYC biometrico de Centaurus (Motor Biometrico + Checkone + OFAC) puede ser aceptado por Ardua como evidencia suficiente de identidad para el alta en Ardua Solutions Corp, evitando repetir AiPrise? | ⏳ Pendiente — requiere validacion Legal y evaluacion tecnica IT | Cambia el diseno de Etapa 1: si aplica, Ardua recibe la referencia del KYC validado en lugar de los documentos crudos |
| P-11 | ¿El campo `economicActivityId` de Centaurus corresponde al catalogo AFIP estandar? ¿Es posible mapear el campo de profesion/ocupacion de Ardua a ese ID? | ⏳ Pendiente — requiere confirmacion tecnica IT y validacion con Centaurus | Gap de Etapa 2. Si no hay mapeo automatico, el cliente debe completar este campo en un flujo hibrido |
| P-12 | ¿El campo `regulations` (perfil inversor CNV, paso 4 del wizard de Centaurus) puede ser completado por el cliente en un flujo especifico, o Ardua debe capturarlo en su proceso antes de enviarlo? | ⏳ Pendiente — diseno de flujo a definir | Gap normativo critico de Etapa 2. Centaurus esta obligada como ALyC a contar con este dato — no es opcional |
| P-13 | ¿El OBPH recibido cubre el scope completo de la API de integracion de Centaurus para PF, o hay endpoints adicionales no documentados (ej: consulta de estado, actualizacion de datos)? | ⏳ Pendiente — validar con equipo Centaurus | Define si el analisis de Etapa 2 esta completo o hay gaps de documentacion |

---

## Documentacion tecnica OBPH (API Centaurus — Persona Humana)

Fuente: documento "OBPH — Documentacion de Integracion", Centaurus Securities, junio 2026. Confidencial — solo para uso del equipo integrador.

### Alcance del OBPH

El OBPH (Onboarding Persona Humana) es el proceso de alta de personas fisicas para cuentas de inversion en Centaurus. Cubre:
- Cuentas unipersonales (un TITULAR)
- Cuentas conjuntas (TITULAR + uno o mas COTITULARES)

**Personas juridicas: pendiente documentacion.** Centaurus tiene onboarding digital para PJ y esta preparando el documento de integracion equivalente al OBPH para compartir con Ardua (fuente: Santi Ahmed, 2026-06-11). Cuando se reciba, se retoma el analisis de gap para PJ en ambas etapas.

### Flujo principal (4 etapas)

**Etapa 1 — Solicitud de Cuenta**
Registro inicial. Datos minimos: documentType (DNI | CUIL | CUIT), documentNumber, email, condominio (TITULAR | COTITULAR). El sistema detecta si el email ya esta verificado y redirige al estado correcto del wizard.

**Etapa 2 — Compliance**
Ejecutada por Centaurus de forma automatica e independiente:
- Verificacion de email (link con redireccion segun estado)
- KYC biometrico via Motor Biometrico (estados: NOT_STARTED, IN_PROGRESS, APPROVED, DECLINED, IN_REVIEW, EXPIRED, ABANDONED, KYC_EXPIRED)
- Checkone (screening de compliance)
- OFAC (screening de sanciones internacionales)

**Etapa 3 — Wizard de Onboarding (6 pasos)**
Protegido por WizardSession (TTL 24 horas; datos persisten 28 dias).

| Paso (backend) | Paso (UI) | Datos recolectados |
|---|---|---|
| Paso 1 | Paso 1 | phoneNumber, domicilios RESIDENTIAL y FISCAL (country, province, city, street, streetNumber, postalCode) |
| Paso 2 | Paso 2 | companyName, jobRole, economicActivityId (ID AFIP numerico), direccion laboral opcional |
| Paso 3 | Paso 3 | civilStatus (SINGLE | MARRIED | DIVORCED | WIDOWED | CIVIL_UNION), datos del conyuge opcionales |
| Paso 4 | Paso 5 | regulations (perfil inversor CNV — array de regulationId + additionalInfo) |
| Paso 5 | Paso 4 | taxes (taxId + conditionId), notificationSources |
| Paso 6 | Paso 6 | Documentos adjuntos via multipart/form-data (nombre de archivo = codigo de documento, ej: BUREAU.pdf) |

Nota: el paso 4 del backend se presenta como paso 5 al usuario, y el paso 5 del backend como paso 4. El orden en UI no coincide con el orden en la API.

**Etapa 4 — Finalizacion, Firma y Aprobacion**
Sincronizacion de datos → finalizacion del onboarding → firma digital via DocuSign → aprobacion interna.

### Estados de la solicitud

`IN_PROGRESS` → `SIGNATURE_PENDING` → `APPROVAL_PENDING` → `APPROVED`

La aprobacion final (APPROVAL_PENDING → APPROVED) es interna de Centaurus. No requiere accion del integrador.

### Referencia completa de endpoints

| Metodo | Endpoint | Proposito | Auth |
|---|---|---|---|
| POST | /public/account-applications/register-persona-fisica | Crear solicitud | Publico + Rate Limit |
| GET | /public/persons/verification-email/opened | Hub verificacion email | Publico (JWT query) |
| POST | /public/persons/:personId/finalize-onboarding | Finalizar onboarding | Publico |
| POST | /public/persons/:personDocument/resume-onboarding | Reanudar onboarding | Publico + Rate Limit |
| POST | /public/persons/sync-onboarding/:sessionId | Sincronizar datos del Wizard | WizardSessionGuard |
| POST | /public/wizard-registration/generate-session | Generar sesion del Wizard | x-one-time-token |
| GET | /public/wizard-registration/:sessionId/documents/:stepNumber | Obtener datos de un paso | WizardSessionGuard |
| POST | /public/wizard-registration/:sessionId/documents/seed | Inicializar documentos | WizardSessionGuard |
| POST | /public/wizard-registration/:sessionId/documents/step-one/override | Paso 1 | WizardSessionGuard |
| POST | /public/wizard-registration/:sessionId/documents/step-two/override | Paso 2 | WizardSessionGuard |
| POST | /public/wizard-registration/:sessionId/documents/step-three/override | Paso 3 | WizardSessionGuard |
| POST | /public/wizard-registration/:sessionId/documents/step-four/override | Paso 4 | WizardSessionGuard |
| POST | /public/wizard-registration/:sessionId/documents/step-five/override | Paso 5 | WizardSessionGuard |
| POST | /public/wizard-registration/:sessionId/documents/step-six/override | Paso 6 (multipart) | WizardSessionGuard |
| POST | /public/persons/verification-webhook | Webhook KYC Motor Biometrico | HMAC-SHA256 |
| POST | /webhooks/docusign/envelope-completed | Webhook DocuSign | DocuSign |

### Codigos de error

| Codigo | Clave | Descripcion |
|---|---|---|
| OB_001 | ALREADY_HAS_UNIPERSONAL_ACCOUNT_APPLICATION | La persona ya tiene una solicitud de cuenta unipersonal |
| OB_002 | MORE_THAN_ONE_ACCOUNT_TITULAR | No puede haber mas de un titular en una cuenta conjunta |
| OB_003 | MISSING_ACCOUNT_TITULAR | La cuenta debe tener al menos un titular |
| OB_004 | DUPLICATED_DOCUMENT_ON_ACCOUNT_APPLICATION | Hay DNIs duplicados en la solicitud |
| OB_005 | SIMILAR_CONJUNTO_ACCOUNT_APPLICATION | Ya existe una solicitud con los mismos titulares |
| OB_007 | MISSING_ONBOARDING_STEPS_TO_SYNC_DATA | No se completaron todos los pasos del Wizard |
| OB_008 | ALREADY_DONE_ONBOARDING | El onboarding ya fue finalizado |
| OB_009 | MISSING_REQUIRED_DATA_TO_FINALIZE_ONBOARDING | Faltan datos requeridos para finalizar |
| OB_011 | ALREADY_HAS_APPROVED_UNIPERSONAL_ACCOUNT_APPLICATION | Ya tiene cuenta aprobada |
| OB_014 | ALREADY_HAS_MISSING_SIGNATURE_UNIPERSONAL_ACCOUNT_APPLICATION | Ya tiene solicitud en firma pendiente |
| OB_015 | ALREADY_HAS_MISSING_APPROVAL_UNIPERSONAL_ACCOUNT_APPLICATION | Ya tiene solicitud en aprobacion pendiente |
| OB_016 | ALREADY_HAS_IN_PROGRESS_UNIPERSONAL_ACCOUNT_APPLICATION | Ya tiene solicitud en progreso |
| OB_017 | SINGLE_HOLDER_CONJUNTO_ACCOUNT_APPLICATION | Cuenta conjunta requiere al menos 2 titulares |
| OB_018 | CANNOT_RESUME_ONBOARDING | No se puede reanudar el onboarding |
| OB_019 | WIZARD_REGISTRATION_SESSION_EXPIRED | La sesion del Wizard expiro |
| OB_100 | DUPLICATED_EMAIL_ON_ACCOUNT_APPLICATION | Hay emails duplicados en la solicitud |

### Validaciones de documento de identidad

- DNI: numero numerico sin puntos, 7 u 8 digitos.
- CUIL / CUIT: formato XX-XXXXXXXX-X.
- Si se ingresa un CUIL como numero de documento, se convierte automaticamente a DNI para busqueda y almacenamiento.

---

## Sub-hipotesis: identidad portable

Una hipotesis derivada que puede cambiar el diseno de ambas etapas:

> ¿Existe un mecanismo donde el KYC validado en una plataforma le sirve al cliente para operar en la otra sin repetir el proceso completo?

Si existe y es viable, la arquitectura de la integracion cambia radicalmente: en lugar de replicar datos entre sistemas, se comparte una referencia al KYC ya validado. Esto esta siendo evaluado por el mercado bajo el concepto de "identidad portable" o "KYC portatil".

Requiere investigacion especifica. Ver item "identidad portable?, investigar" del backlog de iniciativa.

---

## Contexto de los sistemas de Ardua relevantes

### Proceso de onboarding actual de Ardua

El onboarding de Ardua hoy es un proceso operativo manual de Compliance, no un producto digital para el cliente. Los dos canales son:

- **Telegram (referenciadores, internacional)**: analista de Compliance carga los datos del cliente en AiPrise. Onboarding solo en Ardua Solutions Corp.
- **Trello (canal Comercial, locales)**: cliente completa AiPrise por cuenta propia o con ayuda. Onboarding en Ardua + Circuit Pay + Haz Pagos. Incluye limite transaccional y CVU.

La integracion con Centaurus implicaria un tercer canal o la extension de uno de los existentes. Esto refuerza la necesidad de "pensar el onboarding como producto" antes de especificar la API.

### Infraestructura de validacion de Ardua

- **AiPrise**: KYC/KYB all-in-one, integrado con LEX. Los templates relevantes son #1 (Ardua KYC self-service), #2 (Ardua KYC analista), #4 (Local KYC Comercial).
- **LEX**: plataforma interna de legajos. Fuente de verdad de clientes de Ardua.
- **World Check + Nosis**: compliance obligatorio para todos los clientes.

---

## Hallazgos y decisiones

> Seccion para completar a medida que avanza la investigacion.

| Fecha | Hallazgo / Decision | Impacto |
|---|---|---|
| 2026-06-02 | Centaurus ya esta en Trello de Compliance de Ardua como cliente institucional | La relacion comercial comenzo antes del partnership tecnico |
| 2026-06-02 | Onboarding web de Centaurus para empresas no esta digitalizado | Etapa 1 para juridicas no tiene flujo API disponible del lado de Centaurus |
| 2026-06-02 | Perfil inversor CNV es obligatorio para Centaurus como ALyC | Gap normativo en Etapa 2, pero Centaurus lo resuelve directamente con el cliente — no bloquea Etapa 1 |
| 2026-06-02 | Ya existen clientes compartidos con flujo manual activo (fuente: Nicolas Comercial) | La API automatiza un proceso existente, no inventa uno nuevo |
| 2026-06-02 | Los clientes usan Ardua para transacciones y Centaurus para activos | P-01 y P-02 respondidas |
| 2026-06-02 | Canal de intercambio: grupo WhatsApp "documentacion clientes CNT" (no formalizado) | El canal actual no es escalable — la API lo reemplaza |
| 2026-06-02 | Volumen: ~10 clientes de Centaurus → Ardua en el ultimo mes | P-05 respondida, flujo dominante es Etapa 1 |
| 2026-06-02 | Proto-proceso en Trello: el tag Centaurus es el disparador del pedido de documentación, no lo elimina. Coordinación multi-canal: mail, WhatsApp y posible Slack. | El MVP de la integración es centralizar y automatizar ese pedido disperso |
| 2026-06-02 | P-06 cerrada (fuente: Nico, Comercial): el flujo de pedido de docs es multi-canal y no estandarizado | Define el problema concreto que la API resuelve en Etapa 1 |
| 2026-06-02 | P-04 y P-07: resolución documental pendiente — Facu Arce (requisitos Ardua por tipo) + Santi Ahmed (requisitos Centaurus) | El cruce de ambos documentos define el gap exacto de datos |
| 2026-06-02 | T&C de Ardua no están redactados (P-08). El área Legal debe incluir clause de datos con terceros al redactarlos. | Prerequisito bloqueante para operar la API a escala |
| 2026-06-02 | No hay contrato firmado Ardua–Centaurus (P-09). Antecedente: acuerdo ADCAP ya formalizado en su momento. | Prerequisito bloqueante para operar la API a escala. Se redacta desde cero cuando corresponda. |
| 2026-06-02 | Facu Arce (Legales) va a pasar los requisitos diferenciados por tipo de onboarding (PSP vs PSAV vs Ardua) | Pendiente recibir — define el gap de datos exacto por tipo de cliente |
| 2026-06-02 | El modelo del partnership no es de clientes compartidos ni legajo compartido — es intercambio de datos de onboarding para habilitar acceso a los servicios de cada plataforma | Reframe completo del modelo. Impacta el scope de ambos REQs |
| 2026-06-02 | Centaurus ya tiene una API disponible. Ardua debe adaptarse a su documentacion para la Etapa 2 | Etapa 2: Ardua se integra a la API existente de Centaurus |
| 2026-06-02 | REQs formalizados en Jira: PWI-69 (Etapa 1) y PWI-70 (Etapa 2) | Primera formalizacion del scope en Jira |
| 2026-06-09 | Documentacion tecnica OBPH recibida de Centaurus. El proceso de onboarding PF consta de 4 etapas: Solicitud de Cuenta, Compliance (email + KYC + Checkone + OFAC), Wizard (6 pasos), Finalizacion + DocuSign | Bloqueante de documentacion API para PWI-70 (Etapa 2) parcialmente resuelto |
| 2026-06-09 | Centaurus ejecuta KYC biometrico propio (Motor Biometrico) + Checkone + OFAC como parte de su flujo de compliance. Resultado disponible via webhook | Abre P-10: sub-hipotesis de identidad portable. Podria eliminar el gap de imagenes de ID en Etapa 1 si Legal y IT validan |
| 2026-06-09 | El OBPH recibido es exclusivo para personas fisicas | Scope inicial de la integracion API limitado a PF — pendiente documentacion PJ de Centaurus |
| 2026-06-09 | Gap Etapa 2 confirmado: `economicActivityId` usa IDs numericos AFIP. Ardua captura profesion en texto libre | Requiere tabla de mapeo o flujo hibrido de completado. Pendiente validacion IT |
| 2026-06-09 | Gap Etapa 2 confirmado: `regulations` (perfil inversor CNV) es el paso 4 del wizard — obligatorio por normativa CNV para ALyC. Ardua no captura este dato en ningun template | Gap normativo sin resolucion actual. Solucion probable: flujo hibrido donde el cliente completa este paso en Centaurus (P-12) |
| 2026-06-09 | Gap Etapa 2 confirmado: `civilStatus`, `taxes` (IDs numericos), `notificationSources` — campos del wizard que Ardua no captura o captura con diferente granularidad | Afectan la completitud del payload que Ardua puede enviar en Etapa 2 |
| 2026-06-09 | Documentacion patrimonial Ardua recibida (PF y PJ). Confirmado: Centaurus no captura esta documentacion en su OBPH | Gap de Etapa 1 para onboarding en Haz Pagos / Circuit Pay. El cliente debe proveer estos docs por fuera del flujo API — sin solucion tecnica via integracion |
| 2026-06-09 | La aprobacion final en Centaurus (APPROVAL_PENDING → APPROVED) es interna. El integrador no la controla — solo puede observar el estado via la API | Para Etapa 2 Ardua necesita poder consultar el estado del cliente en Centaurus (P-13) |
| 2026-06-11 | Centaurus tiene onboarding digital para personas juridicas. Esta preparando la documentacion de integracion equivalente al OBPH para enviarnos (fuente: Santi Ahmed) | PJ no esta fuera de scope — esta pendiente de documentacion. PWI-69 y PWI-70 deberan ampliar scope cuando llegue la doc |
| 2026-06-11 | La aceptacion de TyC se almacena en AiPrise. Ardua no tiene copia propia en su infraestructura. El modelo a seguir es el mismo de PWI-67 (videos y selfies). Los TyC los redacta Legal cuando corresponda — no bloqueante para IT. Ver `aiprise-tyc-discovery.md` | PRE-01 ajustado: el gap es de propiedad del dato, no de captura |

---

## Prerequisitos para la integración API

Condiciones que deben estar resueltas antes de que la API pueda operar a escala. No bloquean el mapeo de gap ni el desarrollo exploratorio, pero sí bloquean el go-live.

| # | Prerequisito | Estado | Área responsable |
|---|---|---|---|
| PRE-01 | Aceptacion de TyC replicada a infraestructura propia de Ardua (S3). La captura existe en AiPrise — Ardua no tiene copia propia. Modelo: PWI-67. Redaccion de los TyC a cargo de Legal cuando corresponda — no bloqueante para IT. Ver `aiprise-tyc-discovery.md` | ⏳ Pendiente requerimiento tecnico (modelo PWI-67) | IT |
| PRE-02 | Contrato firmado entre Ardua y Centaurus | ❌ Bloqueante — no hay contrato al 2026-06-02 | Legal / Comercial |
| PRE-03 | Entidad de Ardua contraparte confirmada (P-03) | ⏳ Pendiente confirmación formal | Legal / CTO |
| PRE-04 | LEX con capacidad de exponer datos del legajo vía API | ⏳ Pendiente evaluación técnica (Mati) | Tecnología |
| PRE-05 | Identificador común entre sistemas Ardua y Centaurus para el mismo cliente | ⏳ Pendiente evaluación técnica (Mati) | Tecnología |

---

## Referencias

- **Entity**: `entities/centaurus.md`
- **Manual de Onboardings Ardua** (Facundo Arce, nov 2025) — proceso completo de apertura de legajos
- **Registro CNV Centaurus**: https://www.cnv.gov.ar/SitioWeb/RegistrosPublicos/DetallesRegistrosPublicos/30794?tipoEntidadId=2
- **Politica de privacidad Centaurus**: https://files.centaurus.com.ar/privacidad.pdf
- **Discovery relacionado**: `discoveries/ardua-api-documentation-discovery.md` — contexto de API publica de Ardua
