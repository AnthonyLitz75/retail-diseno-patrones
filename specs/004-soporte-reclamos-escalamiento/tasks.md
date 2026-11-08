# TASKS: Módulo de Soporte - Reclamos y Escalamiento

## Fase 1: Persistencia Base (Foundational)
- [ ] **T01:** Crear script aditivo `database/07_reclamos.sql` y sincronizar `00_esquema_base.sql`.
- [ ] **T02:** Crear record `Reclamo` y DTOs (`RegistrarReclamoDTO`, `ResponderReclamoDTO`, `EscalarReclamoDTO`).

## Fase 2: Backend y TDD
- [ ] **T03:** Crear `ReclamoDAO` con consultas parametrizadas JDBC.
- [ ] **T04:** Pruebas unitarias de DAO en `ReclamoDAOTests`.
- [ ] **T05:** Crear `ReclamoService` con validaciones de propiedad, rol `SOPORTE` y transiciones de estado.
- [ ] **T06:** Pruebas de servicio en `ReclamoServiceTests`.
- [ ] **T07:** Crear `ReclamoController` y `ReclamoAdminController`.
- [ ] **T08:** Pruebas de integración de seguridad y contratos API en `ReclamoIntegrationTests`.

## Fase 3: Integración Frontend
- [ ] **T09:** En `/mis-pedidos` (`frontend/src/cliente/`), agregar botón y modal "Registrar Reclamo" en pedidos entregados.
- [ ] **T10:** Crear módulo y vista de soporte `frontend/src/soporte/` para listar reclamos y atenderlos.
- [ ] **T11:** En portal administrativo (`frontend/src/administracion/`), agregar pestaña de incidencias escaladas.

## Fase 4: Verificación
- [ ] **T12:** Ejecutar suite completa con `./mvnw.cmd test`.
