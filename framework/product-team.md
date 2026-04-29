# Modelo de Equipo — Área de Producto

Versión: 1.1 | Horizonte de implementación: 9 meses | Last updated: 2026-04-13
Parte del Framework de Producto del Área de Producto de Ardua.

---

## 1. Visión del modelo

El Área de Producto opera bajo un modelo de equipo reducido y alto leverage, donde un tridente estratégico humano gobierna un conjunto de agentes de IA especializados por producto.

El principio fundacional es simple: **las personas gobiernan sistemas, los sistemas ejecutan el trabajo operativo.**

Todo el modelo existe para un único propósito: diseñar y evolucionar las capacidades de la infraestructura operativa de Ardua de forma que resuelvan el job del cliente con consistencia y a escala. Para entender ese job, ver `propuesta-de-valor.md`.

Este modelo permite escalar la capacidad de producto sin escalar el headcount de manera proporcional. El leverage no está en contratar más PMs — está en construir agentes con contexto profundo que operen con consistencia y sin dependencia de personas específicas.

---

## 2. Estructura

```
Head of Product
├── Technical PM
└── Growth PM
       ↓ ambos configuran, alimentan y gobiernan
       ├── Agente: RFQ Gateway
       ├── Agente: Client Portal (CLP)
       ├── Agente: COM (CRM Comercial)
       └── Agente: [producto n]
```

El equipo humano está conformado por tres personas. Los agentes no son herramientas de apoyo — son el nivel operativo del área. No tienen rol de recomendación: tienen rol de ejecución dentro de un scope configurado y gobernado.

---

## 3. Roles y responsabilidades

### 3.1 Head of Product

- Visión estratégica del área y de cada producto
- Decisión final ante cualquier conflicto de prioridad o dirección
- Gestión de stakeholders senior (Directorio, C-Level, áreas transversales)
- Definición y evolución del framework del área
- Gobierno del roadmap anual
- Alineación del tridente: asegurar coherencia entre las perspectivas técnica y de crecimiento

### 3.2 Technical PM

- Interfaz principal con Tecnología y Delivery
- Viabilidad técnica de los productos en definición
- Integridad del sistema: detectar inconsistencias entre productos, dependencias y deuda técnica
- Configuración y mantenimiento de los agentes desde una perspectiva técnica (calidad del contexto, precisión de las specs, consistencia de los criterios de aceptación)
- Gestión del framework de requerimientos y su evolución

### 3.3 Growth PM

- Perspectiva de usuario: discovery, validación, feedback — siempre anclado en el job del cliente definido en `propuesta-de-valor.md`
- Métricas de producto: definición, seguimiento, interpretación
- Oportunidades de negocio: benchmarking, nuevos segmentos, evolución de productos existentes
- Configuración y mantenimiento de los agentes desde una perspectiva de negocio (objetivos, impacto esperado, contexto de usuario)
- Gestión de clientes y usuarios como fuente continua de aprendizaje

### 3.4 Agentes de Producto (IA)

Cada agente es el repositorio vivo de conocimiento de un producto y su ejecutor operativo dentro del área.

**Responsabilidades operativas de cada agente:**

- Conocimiento profundo y actualizado del producto (specs, decisiones, contexto)
- Generación de requerimientos funcionales bajo el formato estándar del área
- Detección de duplicados, inconsistencias y gaps en el backlog
- Respuesta a consultas de otras áreas sobre el producto
- Soporte al tridente en discovery, análisis y redacción de artefactos

El agente no toma decisiones estratégicas. El agente ejecuta con el contexto que el tridente le provee.

---

## 4. Modelo de gobernanza — El Tridente

El tridente es el mecanismo de alineación estratégica del área. No es una jerarquía — es una unidad de decisión orientada a un único norte: que cada producto de Ardua sume capacidad infraestructural que resuelva el job del cliente.

### Composición

| Rol | Perspectiva dominante |
|---|---|
| Head of Product | Visión, prioridad, stakeholders |
| Technical PM | Viabilidad, delivery, integridad |
| Growth PM | Usuario, métricas, oportunidad |

### Principios de operación

- Las tres perspectivas se integran antes de tomar decisiones de producto relevantes
- Los conflictos de dirección (técnico vs. negocio) se resuelven en el tridente, con el HoP como voto de desempate
- La configuración de los agentes refleja siempre la decisión alineada del tridente — nunca la perspectiva unilateral de un solo rol
- La cadencia mínima de alineación es semanal (Product Check-in)

### Separación de responsabilidades

- **Producto (tridente)** → define el qué y el por qué
- **Tecnología** → define el cómo
- **Delivery** → define el cuándo

---

## 5. Relación Tridente → Agentes

El valor de los agentes es proporcional a la calidad del contexto que el tridente les provee. Un agente mal alimentado opera sobre bases inconsistentes y genera más ruido que valor.

### Responsabilidades del tridente sobre los agentes

| Actividad | Responsable |
|---|---|
| Definición del scope y objetivos del agente | HoP |
| Actualización de context files y product specs | Technical PM + Growth PM |
| Validación de outputs del agente | Technical PM o Growth PM según naturaleza |
| Resolución de conflictos entre inputs del agente | HoP |
| Evolución del framework de configuración | HoP + Technical PM |

### Flujo operativo

1. El tridente toma una decisión o genera un artefacto
2. El PM responsable actualiza el contexto del agente correspondiente
3. El agente opera sobre el contexto actualizado
4. Los outputs del agente son revisados por el PM responsable antes de ser formalizados
5. Los aprendizajes retroalimentan el contexto → ciclo continuo

---

## 6. Hoja de ruta de implementación (9 meses)

### Fase 1 — Base (Meses 1-3)

**Objetivo:** Consolidar la infraestructura de conocimiento y el HoP como único nodo del tridente activo.

- Completar los context files de todos los productos activos
- Madurar los agentes existentes (Miles, contexto de productos)
- Definir el framework de configuración de agentes (criterios, formato, ciclo de actualización)
- Iniciar proceso de búsqueda y selección del Technical PM y Growth PM

### Fase 2 — Tridente en construcción (Meses 4-6)

**Objetivo:** Incorporar al Technical PM y al Growth PM. Transferir gobierno de agentes.

- Onboarding del Technical PM y Growth PM sobre el modelo, los productos y los agentes existentes
- Distribución formal de responsabilidades sobre los agentes por producto
- Primera versión del ritual de alineación del tridente operando con regularidad
- Ajuste del framework de configuración a partir del trabajo conjunto

### Fase 3 — Modelo operando (Meses 7-9)

**Objetivo:** El tridente opera con autonomía. Los agentes son el nivel operativo del área.

- El tridente toma decisiones de producto de manera alineada y consistente
- Los agentes son actualizados y operados por los PMs sin intervención constante del HoP
- El HoP opera principalmente en visión estratégica, stakeholders y evolución del modelo
- Revisión del modelo y ajustes para el siguiente ciclo

---

## 7. Indicadores de éxito del modelo

| Indicador | Señal de éxito |
|---|---|
| Cobertura de contexto | Todos los productos activos tienen context file actualizado |
| Calidad de outputs de agentes | Los requerimientos generados requieren mínimas iteraciones |
| Autonomía del tridente | El HoP no es cuello de botella en decisiones operativas |
| Escalabilidad | Se incorpora un nuevo producto sin rediseñar el modelo |
| Alineación | Los tres roles comparten el mismo entendimiento del estado de cada producto |

---

*Disclaimer: Este modelo es una visión objetivo, no un estado actual. Su implementación es progresiva y está sujeta a ajustes en función del aprendizaje operativo y la evolución del área.*
