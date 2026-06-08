---
name: QA — Entornos con datos realistas para el financial-core
features: []
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-08
updated_at: 2026-06-08
propagates_to: []
---

# QA — Entornos con datos realistas para el financial-core

## Objetivo

Entender qué datos son necesarios en cada entorno QA del financial-core para que el equipo de Producto pueda trabajar de forma autónoma, sin depender de producción para tareas de consulta, validación y discovery.

## Contexto

Los entornos QA del financial-core (TRD, OPS, LEX, CLP, FIN) no tienen datos que representen estados operativos reales. El equipo de Producto termina accediendo a producción para revisar comportamientos de módulos, interrumpiendo a los stakeholders. El caso más crítico es TRD, donde faltan operaciones históricas de proveedores y quotes. El PWI-76 captura el requerimiento; este discovery investiga qué datos exactamente se necesitan por aplicación, cómo se definen los criterios de "suficientemente realista", y qué estrategia de generación y mantenimiento es viable.

## Investigación

> _Por completar en sesiones futuras._

### Preguntas abiertas

- ¿Qué define "datos suficientemente realistas" en cada app? ¿Volumen, variedad de estados, ambas?
- ¿Datos sintéticos o snapshots anonimizados de producción? ¿Qué valida Legal/Compliance?
- ¿Qué módulos y flujos de cada app son los más críticos para el trabajo de Producto en QA?
- ¿Hay implicancias en la estrategia de CI/CD o en los pipelines de deploy a QA?
- Priorización del core secundario (OPS, LEX, FIN, CLP) — pendiente de alinear con Tecnología en el inicio de PWI-76.
