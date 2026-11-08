# Roadmap de Especificaciones (SDD) - Camino al 100%

Este directorio contiene las especificaciones formales desarrolladas bajo la metodología **Spec-Driven Development (SDD)** con **GitHub Spec Kit**. Cada especificación gobierna la implementación de una funcionalidad antes de codificar, asegurando contratos sincronizados, cero regresiones y alineación total con la guía académica del curso.

---

## Matriz de Hitos y Especificaciones

| ID | Especificación | Hito Objetivo | Requerimientos Guía | Patrones GoF/GRASP | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SPEC-001** | [`001-envios-y-trazabilidad`](./001-envios-y-trazabilidad/) | Hito 75% | RF10, RF23 | State, Creator | 📝 Planificado |
| **SPEC-002** | [`002-patron-command-carrito`](./002-patron-command-carrito/) | Hito 75% | RF08 | Command | 📝 Planificado |
| **SPEC-003** | [`003-patron-observer-pedidos`](./003-patron-observer-pedidos/) | Hito 75% | RF02, RF10 | Observer, Factory Method | 📝 Planificado |
| **SPEC-004** | [`004-soporte-reclamos-escalamiento`](./004-soporte-reclamos-escalamiento/) | Hito 90% | RF13, RF24, RF28 | Controller, Information Expert | 📝 Planificado |
| **SPEC-005** | [`005-soporte-devoluciones-reembolsos`](./005-soporte-devoluciones-reembolsos/) | Hito 90% | RF14, RF25, RF26, RF27 | Adapter, Facade, Low Coupling | 📝 Planificado |
| **SPEC-006** | [`006-portales-frontend-completos`](./006-portales-frontend-completos/) | Hito 100% | RF01 – RF28 (UI) | Pure Fabrication, Controller | 📝 Planificado |

---

## Estructura Estándar de Cada Especificación

Cada carpeta de especificación contiene:
1. `spec.md`: Historias de usuario priorizadas (P1, P2...), criterios de aceptación en formato Gherkin y casos de borde.
2. `plan.md`: Arquitectura técnica de capas, modelo de datos relacional, patrones GoF/GRASP justificados y contratos REST.
3. `tasks.md`: Desglose atómico de tareas secuenciales y paralelas `[P]` (Foundational $\rightarrow$ Backend TDD $\rightarrow$ Frontend $\rightarrow$ Verificación).

---

## Ciclo de Ejecución en Antigravity

1. **Especificar:** `/speckit-specify <nombre-especificacion>`
2. **Planificar:** `/speckit-plan`
3. **Desglosar:** `/speckit-tasks`
4. **Implementar:** `/speckit-implement`
5. **Auditar:** `/speckit-converge`
