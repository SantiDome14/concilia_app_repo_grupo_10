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

## Preguntas abiertas — bloqueantes de diseno

Estas tres preguntas son prerequisito de cualquier especificacion tecnica. Sin respuesta, el diseno de la integracion es ciego.

| # | Pregunta | Impacto |
|---|---|---|
| P-01 | ¿Que producto o servicio de Ardua van a usar los clientes que manda Centaurus? | Define que entidad de Ardua actua como contraparte, que compliance aplica, y que datos de onboarding necesita Ardua |
| P-02 | ¿Que producto o servicio de Centaurus van a usar los clientes de Ardua? | Define que instrumento de mercado de capitales se ofrece, y que requisitos normativos de Centaurus (incluido perfil inversor CNV) aplican |
| P-03 | ¿Cual es la entidad de Ardua que firma con Centaurus? | Restriccion de diseno del marco legal — cada paso del flujo debe poder asignarse a una entidad del grupo con la licencia para ejecutarlo |

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
| 2026-06-02 | Perfil inversor CNV es obligatorio para Centaurus como ALyC | Gap normativo en Etapa 2 — no puede omitirse |
| 2026-06-02 | P-01, P-02, P-03 sin respuesta | Bloquean cualquier especificacion tecnica |

---

## Referencias

- **Entity**: `entities/centaurus.md`
- **Manual de Onboardings Ardua** (Facundo Arce, nov 2025) — proceso completo de apertura de legajos
- **Registro CNV Centaurus**: https://www.cnv.gov.ar/SitioWeb/RegistrosPublicos/DetallesRegistrosPublicos/30794?tipoEntidadId=2
- **Politica de privacidad Centaurus**: https://files.centaurus.com.ar/privacidad.pdf
- **Discovery relacionado**: `discoveries/ardua-api-documentation-discovery.md` — contexto de API publica de Ardua
