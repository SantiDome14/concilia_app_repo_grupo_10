# AiPrise

> Última actualización: 2026-05-21
> Tipo: Proveedor
> Jurisdicción(es): SaaS internacional (operado desde Argentina por Legal & Compliance)
> Estado de la relación: Activa

## Qué es

AiPrise es la plataforma global de verificación de identidad y cumplimiento normativo (KYC/KYB) que Ardua utiliza como columna vertebral de su proceso de onboarding. Permite validar personas físicas y jurídicas, realizar controles AML, detección de PEPs y noticias negativas, y generar perfiles de riesgo completos.

Está integrada con LEX: al finalizar el onboarding en AiPrise, el legajo del cliente se genera automáticamente en la sección "Altas" de LEX, listo para ser confirmado en las sociedades correspondientes.

---

## Capacidades que nos habilita

- **KYC (personas físicas)**: validación de identidad mediante documento oficial (DNI frente/dorso o pasaporte), verificación de domicilio, detección de riesgo AML, scoring automático.
- **KYB (personas jurídicas)**: validación de sociedades mediante estatuto social, identificación y verificación de beneficiarios finales y representantes legales, detección de riesgo corporativo. A partir del CUIT cargado, AiPrise realiza una búsqueda automática en bases de datos locales y muestra la actividad registrada de la sociedad.
- **Detección de PEPs y noticias negativas**: control automático contra listas de PEPs, sanciones y noticias negativas en cada validación. Si se detecta un PEP — directo o por parentesco — el onboarding se detiene y el caso es rechazado en las tres sociedades.
- **Integración con LEX**: al completar el onboarding, el perfil del cliente aparece automáticamente en la sección "Altas" de LEX para su activación en las sociedades correspondientes.
- **Generación de informe descargable**: al finalizar cada validación se puede descargar un informe PDF ("Informe AiPrise") que se archiva en el legajo del cliente dentro de LEX.
- **Templates diferenciados por sociedad y tipo de cliente**: 6 templates configurados según si el onboarding es para Ardua o las sociedades locales (Circuit Pay / Haz Pagos) y si el cliente es PF o PJ.

---

## Templates disponibles

| # | Nombre | Uso |
|---|--------|-----|
| #1 | ARDUA — KYC | PF que se autogestiona vía referenciadores |
| #2 | ARDUA — KYC (ANALISTA LEGALES) | PF onboardeada por el analista vía canal Telegram |
| #3 | ARDUA — KYB | Sociedades no offshore que operan solo en Ardua, vía referenciadores |
| #4 | LOCAL — KYC | PF que opera en Circuit Pay / Haz Pagos, vía Área Comercial |
| #5 | LOCAL — KYC (ANALISTA LEGALES) | PF onboardeada por el analista para Circuit Pay / Haz Pagos |
| #6 | LOCAL — KYB | Sociedades argentinas que operan en entidades locales, vía Área Comercial |

**Excepción:** las Sociedades de Inversión (offshore) no pueden validarse en AiPrise — se crean manualmente en LEX mediante la opción "Crear Empresa Manual".

---

## Integración operativa

- **Área que la opera**: Legal & Compliance (analistas de onboarding).
- **Flujo estándar**: analista selecciona template → genera link de sesión → completa datos del cliente (nombre, fecha de nacimiento, documento, domicilio, monto a operar, profesión, documentación adicional) → envía → AiPrise valida y genera resultado (Aprobado / Rechazado / En Revisión) → analista descarga informe → lo archiva en LEX.
- **Sincronización con LEX**: automática al finalizar el onboarding. El perfil aparece en "Altas" de LEX listo para confirmar sociedades.
- **Documentos aceptados**: JPG y PNG exclusivamente. No se aceptan PDFs.
- **Nomenclatura del informe**: se guarda como "Informe AiPrise" en la pestaña Documentos del legajo en LEX.
- **Acceso**: link disponible en el canal Slack del Equipo de Legales.

---

## Restricciones y condiciones

- **Formato de documentos JPG/PNG obligatorio**: AiPrise no acepta PDFs. Restricción hard — los documentos deben convertirse antes de cargar.
- **Sin US Persons**: no se onboardean ciudadanos o residentes estadounidenses bajo ningún template ni circunstancia.
- **Sin PEPs**: si World Check o AiPrise detectan que el cliente es una Persona Expuesta Políticamente — directa o por parentesco — el onboarding se detiene y el caso es rechazado en las tres sociedades automáticamente. Política actual en revisión hacia un modelo de admisión progresiva por niveles de exposición.
- **Sociedades offshore excluidas**: las Sociedades de Inversión no pueden validarse en AiPrise. Se crean manualmente en LEX.
- **[A completar]**: plan contratado, límites de validaciones mensuales, costos por verificación, SLAs de validación automática.

---

## Referencias

- **Manual de Onboardings v1.0** (Facundo Arce, nov 2025) — sección "AiPrise".
- **Manual de Onboarding de Clientes** (Legal & Compliance, mayo 2026) — §5 y §6.
- **Contactos clave**: [A completar — account manager de AiPrise asignado a Ardua]
