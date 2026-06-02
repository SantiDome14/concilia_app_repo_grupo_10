---
name: Centaurus — Partnership e integracion API bidireccional de onboarding
features: []
status: En investigacion
owner: Santino Domeniconi
created_at: 2026-06-02
updated_at: 2026-06-02
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

> Una integracion API bidireccional entre Ardua y Centaurus puede eliminar la friccion de onboarding para clientes que quieran operar en ambas plataformas. Para que sea operable desde el dia 1, los gaps normativos (perfil inversor CNV, sujeto obligado UIF) y los gaps de datos (Ardua no captura todo lo que Centaurus necesita, y viceversa) deben estar resueltos antes del desarrollo.

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

**Proto-proceso en Trello**: cuando el referenciador es Centaurus, la documentacion del cliente se adjunta directamente en la tarjeta de Trello y Compliance (Facu Arce) no solicita documentacion adicional porque ya viene incluida. Pendiente confirmar con Nico si este flujo es consistente y cuales son exactamente los documentos que adjunta Centaurus.

**Implicancia sobre el perfil inversor CNV:** el hecho de que Centaurus ya acepte legajos de Ardua como base sugiere que el gap del perfil inversor lo resuelve Centaurus directamente con el cliente. No es un bloqueante tecnico para la Etapa 1 — es una responsabilidad que queda del lado de Centaurus.

---

## Preguntas abiertas

| # | Pregunta | Estado | Impacto |
|---|---|---|---|
| P-01 | ¿Que producto o servicio de Ardua usan los clientes de Centaurus? | ✅ Respondida — transacciones (FX, pagos, cables) | Entidad contraparte probable: Ardua Solutions Corp |
| P-02 | ¿Que producto o servicio de Centaurus usan los clientes de Ardua? | ✅ Respondida — compra/venta de activos (acciones, CEDEARs, bonos, FCI) | Instrumentos de mercado de capitales vía ALyC |
| P-03 | ¿Cual es la entidad de Ardua que firma con Centaurus? | ⏳ Pendiente confirmacion formal | Probable: Ardua Solutions Corp. Restriccion de diseno del marco legal |
| P-04 | ¿Que datos puntuales faltan y se piden hoy cuando falta informacion? | ⏳ Pendiente — confirmar con Nico y Facu Arce | Define exactamente los campos que la API debe exponer |
| P-05 | ¿El flujo hoy es principalmente Ardua → Centaurus, o tambien viene gente de Centaurus → Ardua? | ✅ Respondida — flujo dominante es Centaurus → Ardua (~10 clientes/mes) | Etapa 1 es la prioridad de desarrollo |
| P-06 | ¿El tag Centaurus en Trello referenciadores implica que Compliance no pide documentacion adicional? | ⏳ Pendiente confirmacion con Nico | Si se confirma, ese flujo es el MVP de la integracion |
| P-07 | ¿Que documentacion adjunta Centaurus en Trello exactamente? ¿Es siempre el set completo o varia por cliente? | ⏳ Pendiente — Facu Arce envia los requisitos diferenciados hoy | Define si hay gap de datos en el flujo actual |
| P-08 | ¿Los T&C de Ardua con el cliente autorizan compartir datos con terceros como Centaurus? | ⏳ Pendiente — Camila Legal | Viabilidad legal del intercambio automatizado via API |
| P-09 | ¿Hay contrato firmado entre Ardua y Centaurus, o el acuerdo es informal? | ⏳ Pendiente — Facundo Vasques o quien maneje la relacion comercial | Marco contractual necesario antes de operar la API a escala |

---

## Analisis del gap de datos

### Etapa 1 — Centaurus manda clientes a Ardua

**Lo que Centaurus captura en su onboarding web (personas fisicas):**
- Entrada minima: DNI + Email
- Proceso completo (segun politica de privacidad): nombre, apellido, fecha de nacimiento, nacionalidad, DNI, CUIT/CUIL/CDI/CIE, domicilio completo, estado civil, email, profesion, relacion laboral, condicion ante AFIP, telefono, informacion fiscal

**Lo que Ardua necesita para abrir legajo en Ardua Solutions Corp:**
- Imagenes del ID (frente + dorso DNI o frente pasaporte)
- POA o domicilio confirmado
- Profesion / ocupacion
- Monto estimado a operar (rangos USD)
- Tipo de operacion
- World Check + Nosis
- DJ Origen de Fondos (al cierre)

**Gap**: Centaurus no captura imagenes del ID ni monto estimado en USD. La integracion API debe resolver si Centaurus pasa estos datos o si el cliente los completa directamente en un flujo de AiPrise de Ardua. Para onboarding en PSP/PSAV (Haz Pagos / Circuit Pay) se suma documentacion patrimonial que Centaurus no tiene.

**Para empresas**: Centaurus no tiene onboarding digital publico para juridicas. El flujo es manual — sin API disponible en esta etapa.

### Etapa 2 — Ardua manda clientes a Centaurus

**Lo que Ardua captura y coincide con lo que Centaurus necesita:**
- Nombre, apellido, fecha de nacimiento, DNI, CUIT/CUIL (template LOCAL KYC), domicilio, profesion, email

**Gap normativo critico (no opcional):**
- **Perfil inversor CNV**: Centaurus como ALyC esta obligada a confeccionar el perfil inversor de cada cliente (tolerancia al riesgo, horizonte temporal, experiencia inversora, objetivos). Ardua no captura esto en ningun template. Es un gap normativo — no se puede omitir ni delegar.

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
| 2026-06-02 | Proto-proceso en Trello: tag Centaurus en referenciadores evita que Compliance pida doc adicional | Pendiente confirmar con Nico — si se confirma, es el MVP de la integracion |
| 2026-06-02 | Facu Arce (Legales) va a pasar los requisitos diferenciados por tipo de onboarding (PSP vs PSAV vs Ardua) | Pendiente recibir — define el gap de datos exacto por tipo de cliente |

---

## Referencias

- **Entity**: `entities/centaurus.md`
- **Manual de Onboardings Ardua** (Facundo Arce, nov 2025) — proceso completo de apertura de legajos
- **Registro CNV Centaurus**: https://www.cnv.gov.ar/SitioWeb/RegistrosPublicos/DetallesRegistrosPublicos/30794?tipoEntidadId=2
- **Politica de privacidad Centaurus**: https://files.centaurus.com.ar/privacidad.pdf
- **Discovery relacionado**: `discoveries/ardua-api-documentation-discovery.md` — contexto de API publica de Ardua
