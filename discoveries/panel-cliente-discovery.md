---
name: Panel de Cliente — Vista 360 transversal del core
features: [COMMON]
status: En investigación
owner: Santino Domeniconi / Yasmani Rodriguez
created_at: 2026-06-04
updated_at: 2026-06-08
propagates_to:
  - features/common/panel-cliente.md
---

# Panel de Cliente — Vista 360 transversal del core

## Objetivo

Validar que el dolor de acceso fragmentado al contexto de cliente es real y transversal en
el financial-core (mas alla de TRD), determinar que datos y que areas componen el v1 del
panel, y definir si el patron de panel lateral confirmado en TRD (PWI-64) es la solucion
correcta a escala transversal.

**Las tres preguntas que este discovery debe responder antes de concluir:**

1. **Cual es el problema real del usuario?**
   Un operador de backoffice — trabajando en TRD, OPS, LEX o FIN — necesita acceder al
   contexto completo de un cliente (quien es, en que estado esta, que posicion tiene, que
   historial tiene) sin salir de la app en la que esta operando. Hipotesis: hoy ese acceso
   requiere navegar entre apps o abrir multiples tabs, lo que introduce friccion en el flujo
   de trabajo. A validar por area.

2. **Como sabemos que es el problema correcto?**
   La senal es solida en TRD (validada con Facundo Vasques, dos rondas de wireframe, PWI-64).
   Pero la transversalidad es una hipotesis — aun no hay evidencia directa de que el dolor
   exista en OPS, LEX y FIN con la misma semantica. Esta validacion es la tarea central del
   discovery.

3. **Como mediremos que lo resolvimos?**
   Por definir al concluir la validacion por area. Candidatos: reduccion de navegacion
   cross-app por sesion de trabajo, tiempo hasta primera accion sobre un cliente.

---

## Contexto

**Senal de origen:** PWI-64 (TRD — Modulo Clientes, sidebar de saldo y limites) revelo que
el patron de panel lateral de contexto de cliente tiene demanda implicita mas alla de TRD.
Santino Domeniconi y Yasmani Rodriguez identificaron la senal como potencialmente transversal
durante la revision del discovery (2026-06-04).

**Estado del seed:** `discoveries/trd-clientes-discovery.md` — el patron panel lateral fue
validado con Facundo Vasques (Trading Desk) mediante wireframe interactivo en dos rondas.
Decision de diseno consolidada: Panel lateral + Variante B (con quote) + Color por moneda.
El scope de PWI-64 esta cerrado y no se modifica — es el primer caso del patron, no la
generalizacion.

**Por que esto es una hipotesis transversal y no una extension de TRD:**
El valor del panel en TRD es acceso a saldos y limites en el momento de cotizar. En otras
apps, la necesidad podria ser diferente: en LEX seria acceso al estado de compliance y
documentacion; en OPS seria acceso al historial de operaciones y estado de onboarding; en
FIN podria ser acceso a posicion contable. Si las necesidades son lo suficientemente similares
en su patron de interaccion (panel lateral, datos de contexto del cliente, sin salir de la
app), hay un patron transversal que vale estandarizar. Si son sustancialmente distintas, la
solucion correcta es feature-por-app, no una feature common.

**Conexion con datos comerciales (HubSpot):**
Comercial usara HubSpot para almacenar datos CRM del cliente (account manager, tier, deal
stage, segmentacion comercial). La hipotesis de que otras areas podrian consumir esos datos
sin abrir HubSpot es una dimension adicional del panel. Ver Q-H en
`discoveries/hubspot-integration-discovery.md`. La validacion de que datos de HubSpot son
utiles por area debe hacerse en el mismo round de consulta que la validacion de senales por
area (evitar dos rondas con las mismas personas).

---

## Hipotesis

### H-01 — El dolor de acceso a contexto de cliente es transversal

**Hipotesis:** los operadores de OPS, LEX y FIN experimentan el mismo tipo de friccion que
TRD: tienen que salir de la app o abrir multiples tabs para acceder al contexto completo de
un cliente mientras trabajan.

**Estado:** no validada. Requiere entrevistas o walkthrough de flujo de trabajo con cada area.

**Criterio de validacion:** al menos dos areas adicionales a TRD confirman el dolor con un
caso de uso concreto y frecuente.

---

### H-02 — El patron panel lateral es la solucion correcta a escala transversal

**Hipotesis:** el mismo patron de interaccion validado en TRD (slide-in desde la derecha,
sin desplazar el contenido principal, contenido reemplazable al cambiar de cliente) es
correcto para todas las apps donde el panel aplique.

**Estado:** validada en TRD. A confirmar en otras apps (puede haber variaciones de contenido
sin alterar el patron de interaccion).

**Nota:** el patron de interaccion puede ser el mismo aunque el contenido del panel varie
por app. La feature `[COMMON]` define el patron y la estructura de secciones; cada app
puede tener secciones relevantes distintas.

---

### H-03 — La federacion de datos entre apps es viable sin infraestructura adicional

**Hipotesis:** el panel puede agregar datos de multiples fuentes (LEX, TRD, HubSpot, audit
trail) consumiendo endpoints y streams existentes, filtrados por `cliente_id`, sin necesidad
de un backend dedicado de agregacion.

**Estado:** no validada. Requiere contraste con Mati (CTO) antes del handoff a Tecnologia.

---

### H-04 — El panel es un framework de secciones contextuales, no una vista universal

**Hipotesis:** el panel de cliente no es una unica vista que muestra todos los datos del
cliente a todos los operadores. Es un framework con:

- Un **nucleo comun** siempre visible desde cualquier app: identidad basica del cliente
  (nombre, legajo, entidad operativa, estado KYC resumido). Util independientemente del area.
- **Secciones contextuales por app:** cada app activa las secciones relevantes para su
  flujo de trabajo. Las secciones de otras areas no aparecen, no se colapsan: directamente
  no existen en ese contexto.

**Mapa de secciones hipotetico por app:**

| Seccion | TRD | OPS | LEX | FIN |
|---|---|---|---|---|
| Identidad y estado (nucleo) | ✓ | ✓ | ✓ | ✓ |
| Saldos y limites operativos | ✓ | — | — | — |
| Estado de compliance y documentacion | — | — | ✓ | — |
| Historial operativo cross-app | ✓ | ✓ | ✓ | ✓ |
| Datos comerciales (HubSpot) | ✓ | — | ✓ | — |
| Items abiertos (alertas / solicitudes) | ✓ | ✓ | ✓ | ✓ |
| Posicion contable | — | — | — | ✓ |

> Este mapa es una hipotesis inicial. La validacion por area confirmara o corregira que
> secciones corresponden a cada app.

**Implicancia de diseno.** El componente del panel es el mismo en todas las apps — mismo
patron de interaccion, mismo ancho, mismo comportamiento. Lo que varia es el conjunto de
secciones registradas para el contexto de cada app. La decision tecnica sobre como se
implementa ese registro (prop de configuracion, contexto de app, tabla de secciones) es
de Tecnologia.

**Implicancia de datos.** El panel agrega en el cliente, no en el servidor. Cada seccion
consume solo las APIs necesarias para sus datos. No hay un endpoint unico que devuelva todo.

**Estado:** hipotesis de diseno. A confirmar con cada area (que secciones le corresponden)
y con Mati (viabilidad tecnica del registro de secciones).

---

### H-05 — El panel requiere dos capas de control de acceso independientes

**Hipotesis:** la separacion visual entre secciones no es suficiente. Existen datos en
algunas secciones que un operador de otra area no deberia poder ver aunque tecnicamente
pudiera navegar a esa app. Se requieren dos capas de control independientes:

**Capa 1 — Autorizacion por contexto de app (implicita)**
Las secciones disponibles en el panel estan determinadas por la app en la que esta
renderizado, no por el usuario. Si el panel esta en TRD, solo existen secciones de TRD
— independientemente de que otros accesos tenga el usuario. El acceso a la app es la puerta
de entrada; si no tenes acceso a TRD, no podes ver las secciones de TRD de ningun cliente.

Esta capa resuelve la separacion estructural entre areas: un analista de LEX trabajando en
LEX nunca ve posicion de trading, aunque ese dato exista en el sistema.

**Capa 2 — Autorizacion por rol dentro de la seccion (explicita)**
Dentro de una app, no todos los roles deberian ver el mismo nivel de detalle. Ejemplos
hipoteticos: dentro de LEX, un Analista de Compliance ve el detalle completo del legajo;
un usuario con rol Comercial ve solo el estado resumido. Dentro de TRD, un trader ve saldos
y limites; un usuario de soporte ve solo nombre y estado.

Esta capa requiere que las apps tengan un modelo de roles definido y que las secciones del
panel lo consulten.

**Estado del modelo de roles por app (relevado al 2026-06-08):**

| App | Modelo de roles | Estado |
|---|---|---|
| OPS | Si, tiene modelo de roles propio | Confirmado |
| LEX | Si, tiene modelo de roles propio | Confirmado |
| TRD | Desconocido | A validar con Mati / Facu |
| FIN | Desconocido | A validar con Mati |
| CLP | Fuera de scope (app del cliente, no del operador) | — |

**Nota de implementacion.** La Capa 1 es prioritaria y relativamente simple. La Capa 2 es
condicional al modelo de roles de cada app — a validar con Mati antes de comprometer un
diseno. Si en algun momento el core unifica el modelo de roles entre apps, el panel hereda
esa consistencia automaticamente.

**Estado:** hipotesis de arquitectura. Confirmada la necesidad de ambas capas. Pendiente
validar estado de roles en TRD y FIN.

---

## Senales por area

| Area | Caso de uso hipotetico | Senal existente | Estado |
|---|---|---|---|
| **TRD** | Trader consulta saldo y limite antes de cotizar, sin iniciar un quote | Validada (PWI-64, Facundo Vasques) | ✅ Confirmada |
| **OPS** | Operador verifica estado de onboarding y CBU/CVU de un cliente durante revision de whitelist | Hipotesis — aun no consultado | ⬜ Sin validar |
| **LEX** | Analista de compliance consulta posicion operativa de un cliente mientras revisa su legajo | Hipotesis — aun no consultado | ⬜ Sin validar |
| **FIN** | Analista financiero consulta posicion de un cliente para conciliar operaciones | Hipotesis debil — bajo contacto directo con clientes | ⬜ Sin validar |
| **CLP** | — | No aplica: CLP es la app del cliente, no del operador backoffice | ❌ Fuera de scope |

---

## Modelo conceptual del panel — fuentes de datos

Preliminar. A contrastar con Tecnologia antes de concluir el discovery.

| Seccion del panel | Datos | Fuente | Disponibilidad hoy |
|---|---|---|---|
| **Identidad y compliance** | Nombre, legajo, tipo de cliente, estado KYC, entidad (Haz Pagos / Circuit Pay) | LEX | Disponible (modulo Clientes) |
| **Posicion operativa** | Saldo por moneda (ARS, USDC, USDT, BTC, ETH), limite operativo por entidad | TRD | Disponible (implementado en PWI-64) |
| **Datos comerciales** | Account Manager, tier, deal stage, segmentacion comercial | HubSpot (API) | Condicional — depende de Q-H en hubspot-integration-discovery y de que carga Comercial |
| **Historial cross-app** | Ultimas N operaciones / eventos relevantes del cliente en cualquier app | Audit trail REQ-68, filtrado por `cliente_id` | Condicional — depende del estado de REQ-68 |
| **Items abiertos** | Alertas y Solicitudes relacionadas al cliente | Centro de Alertas / Centro de Solicitudes | Condicional — depende del estado de los centros transversales |

**Decision pendiente:** el panel v1 incluye solo las secciones con disponibilidad hoy
(Identidad + Posicion operativa), o espera al audit trail y los centros transversales?

---

## Criterios de conclusion

Este discovery puede marcarse como `Concluida` cuando:

1. El dolor de H-01 esta validado (o descartado) en al menos OPS y LEX.
2. El mapa de secciones por app (H-04) esta acordado con cada area y con Yasmani.
3. El modelo de roles de TRD y FIN esta confirmado con Mati (H-05, Capa 2).
4. La viabilidad tecnica de la federacion (H-03) tiene el visto bueno de Mati.
5. El feature file `features/common/panel-cliente.md` tiene un borrador inicial.

---

## Estado y proximos pasos

Investigacion a retomar aproximadamente en julio 2026 (co-owned con Yasmani).

| # | Accion | Responsable | Estado |
|---|---|---|---|
| 1 | Validar dolor en OPS + que secciones le interesan: walkthrough con Manu | Santino | ⬜ Pendiente (julio 2026) |
| 2 | Validar dolor en LEX + que secciones le interesan: walkthrough con Juan / Cami | Santino | ⬜ Pendiente (julio 2026) |
| 3 | Validar que datos de HubSpot son utiles por area (coordinar con validacion de senales) | Santino | ⬜ Pendiente (julio 2026) |
| 4 | Confirmar modelo de roles en TRD y FIN con Mati | Santino | ⬜ Pendiente |
| 5 | Contrastar modelo de datos y viabilidad de federacion con Mati (H-03) | Santino | ⬜ Pendiente |
| 6 | Definir scope de datos del v1 con Yasmani | Santino / Yasmani | ⬜ Pendiente |
| 7 | Crear `features/common/panel-cliente.md` (borrador inicial) | Santino | ⬜ Al concluir la validacion |
