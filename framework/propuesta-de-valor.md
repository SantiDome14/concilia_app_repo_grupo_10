# Propuesta de Valor — Por qué existe Ardua

Versión: 1.0 | Last updated: 2026-04-12
Parte del Framework de Producto del Área de Producto de Ardua.

---

## 1. El cliente y su problema esencial

Los clientes de Ardua — Exchanges, Brokers, ALyCs, Traders, Arbitradores y operadores de activos digitales — tienen un denominador común: su negocio depende de mover, convertir y custodiar valor de forma rápida, confiable y a escala.

Para hacerlo necesitan una infraestructura que combine:

- Habilitaciones regulatorias en múltiples jurisdicciones
- Acceso a cuentas operativas en bancos, ALyCs, Exchanges y otros proveedores financieros
- Capacidad de operar en pesos, dólares y criptoactivos dentro de un mismo flujo
- Contratos y estructuras legales que optimicen el costo fiscal y operativo de cada operación
- Procesos que funcionen con consistencia, sin depender de decisiones ad-hoc

Construir esa infraestructura por cuenta propia es costoso, lento y completamente distractor del negocio core. La mayoría de los operadores no puede ni quiere hacerlo.

**Ese es el problema que Ardua resuelve.**

---

## 2. El Job To Be Done

> *"Necesito operar en los mercados financieros y de activos digitales a escala, sin tener que construir ni gestionar la infraestructura que lo hace posible."*

Los clientes no contratan a Ardua por un servicio puntual. Nos contratan porque sin la infraestructura que Ardua representa, su operatoria no puede escalar — o directamente no puede operar.

---

## 3. Cómo Ardua lo resuelve

Ardua es una infraestructura operativa. No un conjunto de servicios financieros sueltos — una plataforma de capacidades integradas que el cliente activa según su necesidad.

### 3.1 Las entidades como habilitaciones institucionales

Cada entidad legal del grupo no es un producto independiente. Es una habilitación institucional que otorga a la infraestructura una capacidad específica:

| Entidad | Jurisdicción | Capacidad que aporta a la infraestructura |
|---|---|---|
| Haz Pagos | Argentina (PSP) | Operatoria en pesos: CVU, recaudación, pagos locales |
| Circuit Pay | Argentina (PSAV) | Conversión cripto/fiat bajo marco regulatorio argentino |
| Ardua Solutions Corp | Canadá (MSB) | Operatoria internacional: FX, pagos cross-border, eje del grupo |
| Astra Ventures | Polonia (VASP) | Custodia de cripto y swap fiat/crypto con respaldo regulatorio europeo |

Desde la perspectiva del cliente, Ardua es uno. Las entidades son el backstage que hace posible la operatoria.

### 3.2 Los Sponsors como nodos de acceso

Los Sponsors — bancos, ALyCs, Exchanges y otros proveedores financieros — son los nodos donde Ardua opera cuentas específicas por entidad. La combinación Sponsor × Entidad no es aleatoria: responde a las capacidades regulatorias de cada entidad, las ventajas fiscales habilitadas en cada nodo y los contratos intercompany que optimizan el flujo entre ellas.

Esta matriz es uno de los activos más difíciles de replicar para un operador que quisiera construir su propia infraestructura.

### 3.3 Los contratos como optimizadores del sistema

Los acuerdos intercompany entre entidades del grupo — como el acuerdo de recaudación por cuenta y orden entre Haz Pagos y Ardua Solutions Corp, o el acuerdo de giro al descubierto entre Circuit Pay y Ardua Solutions Corp — no son detalles administrativos. Son los mecanismos que permiten que la infraestructura opere de forma integrada, con ventajas legales y fiscales que una entidad sola no podría obtener.

---

## 4. Implicancias para el Área de Producto

### 4.1 La unidad de diseño es la infraestructura, no el servicio

Un producto de Ardua no es una feature aislada. Es una capacidad de la infraestructura. Un producto que no suma capacidad infraestructural — que no habilita algo que el cliente no podía hacer antes — no tiene lugar en el roadmap.

### 4.2 Cada flujo activa una combinación específica

Cuando se diseña un flujo de producto, hay una decisión implícita de qué combinación Sponsor × Entidad se activa. Esa decisión tiene implicancias legales, fiscales y operativas que deben ser parte del diseño — no una consecuencia posterior.

### 4.3 El competidor no es otro PSP

Desde el JTBD, el competidor de Ardua no es otro proveedor de pagos o custodia. Es la decisión del cliente de construir su propia infraestructura — o de operar sin ella, asumiendo las limitaciones que eso implica. Eso cambia completamente cómo se evalúa el valor de cada producto y cómo se comunica.

### 4.4 El cliente ideal tiene un momento específico

No cualquier Exchange o Broker es el cliente ideal de Ardua. Es el que llegó al punto en que su operatoria creció lo suficiente como para que la falta de infraestructura sea su principal limitante. Ese momento es cuando Ardua tiene valor máximo — y es el momento que el Área de Producto debe aprender a identificar y diseñar para él.

---

## 5. Punto de control — Competitividad por producto

Antes de finalizar la especificación de cualquier producto, el Área de Producto debe poder responder las siguientes preguntas. El detalle específico por producto vive en el template de documentación correspondiente en Notion.

**¿Cuáles son las alternativas reales del cliente para resolver el mismo job?**
No solo competidores directos — incluye construirlo por cuenta propia, operar sin infraestructura, o usar soluciones parciales. El análisis parte siempre del job, no del mercado.

**¿Por qué Ardua en lugar de esas alternativas?**
La respuesta debe ser específica para este producto — no genérica. Si la ventaja no puede articularse con precisión, el producto tiene un problema de posicionamiento que debe resolverse antes de diseñar.

**¿Qué tan difícil es replicar lo que Ardua ofrece aquí?**
La combinación de entidades, Sponsors y contratos intercompany es el activo más difícil de replicar. Si la ventaja competitiva de este producto no está anclada en esa combinación, es estructuralmente vulnerable.

---

*Este documento es una referencia viva. Se actualiza cuando cambia la comprensión del cliente, se incorporan nuevas entidades o Sponsors, o cuando el modelo de negocio de Ardua evoluciona de forma significativa.*
