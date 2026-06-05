# LEX — Legal & Compliance

> Última actualización: 2026-06-03
> Estado: En definición progresiva

---

## Propósito

> Por completar. LEX es la aplicación del financial-core que gestiona el ciclo de vida legal y de compliance de los clientes y operaciones de Ardua. La definición consolidada del propósito, alcance y modelo de uso del producto se irá aterrizando progresivamente desde las sesiones de discovery actuales hacia este archivo.

---

## Módulos

> Por completar. Listar los módulos de LEX con su estado actual (construido / en construcción / en discovery / pendiente).

| Módulo | Estado | Feature file | Referencias |
|---|---|---|---|
| Clientes | Producción | `lex-clientes-export-altas-legales.md` · `lex-clientes-informacion-contacto.md` (en definición) | `discoveries/lex-clientes-informacion-contacto-discovery.md` · `discoveries/lex-clientes-export-altas-legales-discovery.md` |
| Detalle de Cliente — Tab Operatoria | SENT TO DEV (PWI-21) | _Pendiente_ | — |
| Detalle de Cliente — Tab Details · Sección Onboarding | `TO DO` (PWI-72 enriquecido) | _Pendiente_ | `discoveries/lex-discovery.md` §3.4 + §4.7 + §8.8 |
| Detalle de Cliente — Tab Operatoria · Sección Quotes | SENT TO DEV (PWI-53) | `lex-operatoria-quotes.md` | `discoveries/lex-operatoria-rulo-quotes-discovery.md` |
| Alertas | _En discovery_ | _Pendiente_ | `discoveries/lex-alertas-discovery.md` |
| Límites | _En discovery_ | _Pendiente_ | `discoveries/lex-limites-discovery.md` |
| _Otros por completar_ | _—_ | _—_ | _—_ |

---

## Estado actual

> Por completar. Resumen ejecutivo de qué está construido, qué está en construcción y qué está pendiente en LEX.

---

## Decisiones clave

> Por completar. Decisiones de diseño que sobrevivieron y por qué.

---

## Frentes abiertos

> Por completar. Hipótesis bajo investigación que pueden modificar el estado actual del producto. Cada frente debe referenciar el discovery correspondiente en `discoveries/`.

---

## Stakeholders

> Por completar. Referente funcional principal: Juan Gonzalez (Legal).

---

## Referencias históricas

Mientras se completa la migración del modelo agregado al modelo nuevo, la fuente de contexto histórico del producto vive en:

- `discoveries/lex-discovery.md` — discovery agregado de LEX (modelo previo). El estado actual del producto se irá migrando desde acá hacia este `README.md` y los feature files individuales.
- `discoveries/lex-alertas-discovery.md` — discovery del módulo Alertas (canónico Perfil B Workflow del financial-core). Su estado consolidado se migrará a `features/lex/lex-alertas.md`.
- `discoveries/lex-limites-discovery.md` — discovery del módulo Límites. Su estado consolidado se migrará a `features/lex/lex-limites.md`.
