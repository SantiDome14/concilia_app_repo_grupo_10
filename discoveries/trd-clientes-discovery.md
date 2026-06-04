---
name: TRD — Módulo Clientes · Visualización de saldos y límites
features: [TRD]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-04
updated_at: 2026-06-04
validated_by: Facundo Vásques (Trading Desk)
propagates_to:
  - features/trd/trd-clientes.md
---

# TRD — Módulo Clientes · Visualización de saldos y límites

## Objetivo

Definir el patrón de visualización óptimo para exponer el saldo por moneda y el límite operativo por entidad de cada cliente directamente desde el módulo Clientes de TRD, sin que el operador tenga que iniciar el flujo de creación de un quote para acceder a esos datos.

## Contexto

**Requerimiento asociado:** PWI-64 — TRD · Clientes — Visibilidad de saldos y límites por cliente

El módulo Clientes de TRD muestra hoy tres campos por cliente: Nombre, N° de legajo y Está activo. Para conocer el saldo y el límite operativo de un cliente, los operadores deben iniciar el flujo de creación de un quote (4 pasos: abrir formulario → escribir nombre → seleccionar cliente → ver datos). Esto obliga a comenzar una operación para acceder a información de contexto que debería estar disponible antes de tomar la decisión de operar.

El sistema ya expone estos datos en el formulario de quote:
- **Límites operativos por entidad:** valor junto al nombre del cliente (ej. Haz Pagos $6.793.360 / Circuit $6.793.360)
- **Saldo por moneda:** campo "balance" al lado de los montos del par seleccionado

**Caso de uso central (validado con el área de Trading Desk):** antes de pasarle una cotización a un cliente, el trader necesita saber si ese cliente tiene saldo suficiente en la moneda de origen y si tiene límite operativo disponible. Hoy ese chequeo requiere simular el inicio de un quote. El objetivo es que ese chequeo sea un clic en la fila del cliente.

---

## Hipótesis exploradas

### H1 — Columnas adicionales en la tabla de Clientes
Agregar columnas de saldo y límite directamente en la tabla existente.

**Descartada.** La tabla ya tiene tres columnas (Nombre, Legajo, Activo). Agregar 7 columnas más (5 monedas + 2 entidades) la vuelve ilegible. Tampoco hay espacio natural para jerarquizar la información.

---

### H2 — Fila expandible inline (accordion)
Al hacer clic en una fila, se expande hacia abajo mostrando saldos y límites en un panel de dos columnas.

**Evaluada, descartada.** Es útil cuando el caso de uso es comparar múltiples clientes en paralelo. El caso de uso real es consultar un cliente a la vez antes de cotizar — el accordion abre espacio para ruido visual sin aportar ventaja sobre el sidebar. Además, múltiples filas expandidas simultáneamente degradan la legibilidad de la lista.

---

### H3 — Panel lateral deslizante (sidebar derecho) ✅ DECISIÓN

Al hacer clic en una fila de cliente, se abre un panel lateral desde la derecha (slide-in) que muestra todos los datos de ese cliente sin desplazar el contenido principal.

**Validado con Facundo Vásques (Trading Desk) mediante wireframe interactivo en dos rondas.** Ganó sobre las otras dos opciones.

**Combinación ganadora:** Panel lateral · Variante B (con quote) · Color por moneda activado. El wireframe incluye variantes de patrón y de contenido; Tecnología debe implementar exclusivamente esta combinación.
**Justificación:**
- El flujo es lineal: el trader selecciona un cliente, revisa su posición, y decide si cotiza o no. Un panel lateral acompaña ese flujo sin perder el contexto de la lista.
- La lista de clientes queda visible al fondo, lo que permite cambiar de cliente sin cerrar el panel (próximo clic reemplaza el contenido).
- La información puede organizarse en secciones diferenciadas (Saldos / Límites) con jerarquía visual clara.

---

## Decisiones de diseño consolidadas

Validadas mediante revisión de wireframe iterativo (dos rondas).

### Patrón general del panel
- Ancho: 380px. Slide-in desde la derecha, transición 200ms ease-out.
- Se abre al hacer clic en cualquier fila de cliente.
- Se cierra al hacer clic fuera del panel o en el botón ×.
- Dark theme consistente con el resto de la aplicación TRD.

### Header del panel
- Nombre del cliente (heading principal)
- Legajo como badge (outline, xs)
- Estado como badge pill verde sutil (`green-900/40` bg, `green-700` border, `green-400` texto) — no texto plano "true"

### Sección Saldos por Moneda
- Una card por moneda: ARS, USDC, BTC, ETH, USDT
- Grid de 2 columnas (USDT ocupa celda completa si es impar)
- Cada card tiene:
  - Dot de color semántico: ARS → verde (#22c55e), USDC → azul (#3b82f6), USDT → teal (#14b8a6), BTC → naranja (#f97316), ETH → violeta (#a855f7)
  - Borde izquierdo de 2px del mismo color del dot
  - Valor en monospace, tamaño base
- Si el saldo es $0, se muestra de todas formas (no se oculta)

### Sección Límite Operativo por Entidad
- Una card por entidad: Haz Pagos y Circuit Pay
- Cada card muestra:
  - Dot naranja + nombre de entidad + valor del límite disponible

### Botón de acción
- Label: "Crear Quote"
- Estilo: CTA primario (fondo violeta sólido)
- Comportamiento: redirige al módulo Quotes y abre directamente la card de creación de quote con el cliente pre-cargado. La creación ocurre en Quotes — no desde Clientes.
- Restricción (Facundo Vásques): la card de creación de quote en Quotes no se modifica como parte de este requerimiento.

### Confirmación de scope
El módulo Clientes es estrictamente de solo lectura. La creación de quotes no se inicia desde Clientes — el botón "Crear Quote" actúa como shortcut de navegación que lleva al operador directamente a la card de creación en Quotes, con el cliente pre-cargado. Confirmado con Facundo Vásques. La card de creación de quote en Quotes queda fuera del alcance de este requerimiento.

---

## Wireframe de referencia

https://claude.ai/design/p/de8ec9f4-56a2-4a9d-8de2-943b62568bb4?file=_original%2FClientes+-+Saldos+y+L%C3%ADmites+%28v1%29.html 

Tecnología debe implementar: **Panel lateral + Variante B (con quote) + Color por moneda activado**. Las demás variantes del wireframe quedan como registro de lo evaluado.

---

## Estado y próximos pasos

| # | Acción | Estado |
|---|---|---|
| 1 | Wireframe validado — combinación ganadora confirmada con Facundo Vásques | ✅ Completo |
| 2 | Handoff a Tecnología (PWI-64 → EWI espejo) | Pendiente |
| 3 | Crear `features/trd/trd-clientes.md` una vez el módulo llegue a producción | Pendiente |
