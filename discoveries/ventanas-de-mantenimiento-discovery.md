---
name: Ventanas de Mantenimiento — Comunicacion proactiva al usuario
features: [COMMON]
status: En investigacion
owner: Santino Domeniconi
created_at: 2026-05-05
updated_at: 2026-05-05
enriched_at: 2026-05-05
---

# Ventanas de Mantenimiento — Comunicacion proactiva al usuario

## Objetivo

Determinar como Ardua debe comunicar a los usuarios del financial-core la existencia de ventanas de mantenimiento planificadas — tanto antes de que ocurran como durante su ejecucion — de manera granular por componente, sin generar ansiedad operativa ni perdida de confianza por falta de informacion.

## Contexto

Ardua tiene ventanas de mantenimiento planificadas definidas por IT pero actualmente no existe ningun mecanismo para informar al usuario final sobre ellas. El caso critico: un cliente puede iniciar una operacion por montos significativos y encontrar una funcionalidad no disponible sin ninguna explicacion visible. Esto genera perdida de confianza y riesgo reputacional.

La solucion alineada con el HoP (Yasmani) es implementar un sistema de banners in-app con granularidad por componente del financial-core. Este discovery captura las decisiones tomadas y los frentes abiertos pendientes de resolucion antes de derivar el REQ formal.

## Hipotesis centrales

**H1 — Granularidad por componente reduce el impacto percibido**
Un banner acotado al modulo o aplicacion afectada genera menos friccion que un aviso generico de "sistema en mantenimiento". El usuario que no usa el componente afectado no ve ninguna interrupcion.

**H2 — Anticipacion suficiente para que el cliente planifique**
El objetivo es que el usuario reciba el aviso con suficiente antelacion para reorganizar operaciones criticas (especialmente transferencias de alto valor). Producto define el criterio de anticipacion minima recomendada; IT define el mecanismo y los tiempos reales segun su proceso interno. Ver decision #3.

**H3 — El canal web es suficiente como primer canal**
El banner in-app en la web del financial-core es el punto de contacto principal. Canales adicionales (email, push) son out of scope de esta iteracion.

## Decisiones tomadas

| # | Decision | Valor | Quien decide |
|---|---|---|---|
| 1 | Alcance | Solo ventanas de mantenimiento planificadas informadas por IT | Producto |
| 2 | Canal | Banner in-app (web) unicamente | Producto |
| 3 | Anticipacion del aviso previo | Recomendacion de Producto: minimo 48 horas antes del inicio. El objetivo es que el usuario pueda planificar operaciones criticas. IT define el mecanismo y los tiempos reales segun su proceso interno. | Producto (criterio) / IT (implementacion) |
| 4 | Granularidad | Por componente — el banner aparece solo en la vista del componente afectado | Producto |
| 5 | Audiencia | Todos los usuarios ven el mismo mensaje; sin segmentacion por rol en v1 | Producto |
| 6 | Comportamiento del banner activo | Permanece visible hasta que la funcionalidad vuelva a operar bajo criterios de operacion optima definidos por IT por componente — incluyendo mecanismo de desactivacion y criterios de "servicio restablecido" | IT |
| 7 | Operabilidad durante el mantenimiento | Producto define caso a caso, segun criticidad del componente, si el usuario puede seguir operando o no | Producto |
| 8 | Persistencia del banner | No se puede cerrar. Minimizado al 50% es una recomendacion de Producto, no un requisito hard — IT puede ajustar segun su criterio | Producto (recomendacion) / IT (decision final) |
| 9 | Estado minimizado | Muestra unicamente: "Mantenimiento en curso · Ver detalle" — click expande | Producto |
| 10 | Multiples mantenimientos simultaneos | Un banner por componente afectado, solo en su propia vista | Producto |
| 11 | Color banner aviso previo | Amarillo | Producto |
| 12 | Color banner mantenimiento activo | Rojo | Producto |
| 13 | Copy por defecto v1 | Templates definidos para ambos estados (ver seccion Copy) | Producto |
| 14 | Redaccion del copy | Se recomienda a IT usar IA para redactar el texto de cada ventana en lenguaje no tecnico, claro y empatico, a partir de los datos tecnicos de la ventana (componente, fecha, duracion estimada) | Producto (recomendacion) / IT (ejecucion) |
| 15 | Wording configurable | Out of scope v1 — portal de wording como evolucion v2 (referencia: REQ-66) | Producto |
| 16 | Base tecnica | Recicla el patron `ardua-add-alert-banner` del core-template-frontend | Tecnologia |

## Copy por defecto

### Banner amarillo — aviso previo

> "El [nombre del componente] estara en mantenimiento el [fecha] de [hora inicio] a [hora fin]. Durante ese periodo [podras / no podras] operar con normalidad. Disculpa las molestias."

### Banner rojo — mantenimiento activo

> "El [nombre del componente] se encuentra en mantenimiento en este momento. Estamos trabajando para restablecer el servicio. Disculpa las molestias."

### Recomendacion de redaccion para IT

Se recomienda que IT utilice IA para transformar los datos tecnicos de cada ventana de mantenimiento (componente afectado, fecha, duracion estimada, impacto operativo) en un texto claro, no tecnico y empatico, alineado con los templates anteriores. Esto reduce la carga operativa de IT y asegura consistencia de tono en todos los avisos.

## Codigo de color — detalle de implementacion

El banner utiliza color como senial semantica del estado de la ventana:

- **Amarillo** — el mantenimiento aun no comenzo. El usuario recibe el aviso con anticipacion para poder planificar.
- **Rojo** — el mantenimiento esta activo en este momento.

Esta distincion debe estar documentada en la spec del componente y guiar las decisiones de disenio e implementacion. No es una leyenda visible para el usuario final.

La eleccion de amarillo y rojo es consistente con el sistema de colores semanticos del financial-core (naranja ya esta tomado por Release Awareness — REQ-66).

## Frentes abiertos

| # | Pregunta | Estado |
|---|---|---|
| F-01 | Como llega la informacion de IT al sistema que renderiza los banners? IT carga directamente en un backoffice, Operaciones/Producto lo carga manualmente, o hay integracion automatica? | Cerrado — lo define IT completamente segun su proceso interno |
| F-02 | Cuales son los criterios de "operacion optima" que determinan cuando se levanta el banner activo? | Cerrado — lo define IT por componente, incluyendo mecanismo de desactivacion y criterios de servicio restablecido |
| F-04 | Quien tiene ownership operacional del proceso completo cuando IT informa una ventana? | Cerrado — ownership completo de IT |

## Scope v1

**In scope:**
- Banner in-app para ventanas de mantenimiento planificadas informadas por IT
- Dos estados: aviso previo (amarillo) y mantenimiento activo (rojo)
- Granularidad por componente del financial-core
- Copy hardcoded con templates por defecto
- Minimizado al 50% con texto reducido

**Out of scope v1:**
- Caidas no planificadas
- Notificaciones por email o push
- Segmentacion de mensajes por rol
- Portal de wording configurable sin deploy (v2)
- Canal de carga automatica desde sistemas de IT (ownership de IT — fuera del scope de definicion de Producto)

## Referencias

- Discovery relacionado: `discoveries/release-awareness-discovery.md` (REQ-66) — patron de banner y portal de wording v2
- Base tecnica: `core-template-frontend-discovery.md` — skill `ardua-add-alert-banner`
- Alineacion inicial con HoP: Yasmani
- Rama de trabajo: `ventanas_de_mantenimiento`
- Owner: Santino Domeniconi — Technical Product Manager
