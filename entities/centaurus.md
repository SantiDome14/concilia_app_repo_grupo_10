# Centaurus Securities S.A.

> Última actualización: 2026-06-02
> Tipo: Partner
> Jurisdicción(es): Argentina
> Estado de la relación: En onboarding

## Qué es

Centaurus Securities S.A. (CUIT 30-71119717-2) es una sociedad de bolsa argentina registrada ante la CNV como Agente de Liquidación y Compensación y Agente de Negociación Integral (N° 239) y como Agente de Colocación y Distribución Integral de Fondos Comunes de Inversión (N° 137). Opera en BYMA, MAE, MAV, ROFEX y MATBA. Tiene sede legal en Mendoza y operativa en Buenos Aires (Av. Leandro N. Alem 855, piso 31, Retiro).

Su base de clientes abarca individuos (portfolios personales y familiares), clientes corporativos (administracion de tesoreria, coberturas FX, tasas) e institucionales (FCI, companias de seguros, brokers, family offices). A nivel internacional ejecuta ordenes para fondos real money, hedge funds y brokers.

---

## Capacidades que nos habilita

- **Acceso a mercado de capitales argentino**: permite que clientes de Ardua accedan a instrumentos que Ardua no puede intermediar directamente — acciones, CEDEARs, titulos publicos nacionales y provinciales, bonos corporativos, FCI, opciones, cauciones bursatiles, cheques de pago diferido, prestamos de valores, pases, venta en corto, y operaciones por mandato en mercados internacionales.
- **Canal de distribucion bidireccional (en evaluacion)**: integracion API para que clientes de Centaurus accedan a servicios de Ardua (Etapa 1) y clientes de Ardua accedan a servicios de Centaurus (Etapa 2). Scope, entidad contraparte y producto concreto en definicion activa (ver `discoveries/centaurus-partnership-discovery.md`).

---

## Integracion operativa

- **Estado actual**: Centaurus esta siendo onboardeada como cliente institucional de Ardua por el canal Comercial (Trello de Compliance, columna "Compliance validando documentacion", al 2026-06-02).
- **Entidad de Ardua contraparte**: a definir. Depende del producto y servicio que consuman los clientes de Centaurus en Ardua.
- **Integraciones tecnicas**: integracion API bidireccional planificada. Sin implementacion activa al 2026-06-02.
- **Flujo Etapa 1**: clientes de Centaurus se onboardean en Ardua via API de Centaurus → Ardua valida identidad (AiPrise + World Check + Nosis) y abre legajo en LEX.
- **Flujo Etapa 2**: clientes de Ardua se onboardean en Centaurus via API de Ardua → Centaurus valida segun sus requisitos propios (incluye perfil inversor CNV obligatorio).

### Onboarding digital de Centaurus (personas fisicas — web)

El portal de Centaurus (`portal.centaurus.com.ar/es/onboarding`) captura como entrada: tipo de inversor (Individuo / Empresa), tipo de cuenta (Unipersonal / Conjunta), DNI + email del titular y de cotitulares si aplica. Es un punto de entrada ligero; el proceso completo captura datos adicionales segun la politica de privacidad (ver Referencias).

**Datos capturados segun politica de privacidad**: nombre, apellido, fecha de nacimiento, nacionalidad, DNI, CUIT/CUIL/CDI/CIE, domicilio completo, estado civil, email, profesion, relacion laboral, condicion ante AFIP, telefono, informacion fiscal.

**Para empresas**: sin flujo digital publico disponible al 2026-06-02. El proceso es presencial o por canal comercial.

---

## Restricciones y condiciones

- **Perfil inversor CNV (obligatorio)**: como ALyC, Centaurus esta obligada a confeccionar el perfil inversor de cada cliente (tolerancia al riesgo, horizonte temporal, experiencia inversora, objetivos de inversion) antes de operar. Este dato no existe en el onboarding de Ardua — es un gap normativo a resolver en la Etapa 2.
- **Sujeto Obligado ante UIF**: Centaurus es sujeto obligado. Tiene Manual PLAFT, Oficial de Cumplimiento y constancias de inscripcion ante UIF y CNV. Impacta el diseno de la integracion de datos KYC — no alcanza con pasar los datos de Ardua directamente.
- **Sin US Persons**: alineado con la restriccion de Ardua Solutions Corp y Astra Ventures.
- **Retencion de documentacion**: 10 anos segun normativa, declarado en politica de privacidad.
- **Comisiones publicadas**: compraventa 0.05%–2.5%, opciones y futuros hasta 2%, cauciones bursatiles colocadoras $100–2% anual + IVA, tomadoras $200–7% anual + IVA, cheques diferidos $50–7%.

---

## Referencias

- **Registro CNV**: https://www.cnv.gov.ar/SitioWeb/RegistrosPublicos/DetallesRegistrosPublicos/30794?tipoEntidadId=2
- **Web**: https://centaurus.com.ar
- **Servicios y productos**: https://centaurus.com.ar/servicios-productos
- **Portal de onboarding**: https://portal.centaurus.com.ar/es/onboarding
- **Politica de privacidad**: https://files.centaurus.com.ar/privacidad.pdf
- **Discovery del partnership**: `discoveries/centaurus-partnership-discovery.md`
- **Contacto operativo**: info@centaurus.com.ar / legales@centaurus.com.ar
- **Tel**: +54 (11) 3988-6560
