# TASKS: Módulo de Soporte - Devoluciones y Reembolsos

## Fase 1: Persistencia Base (Foundational)
- [ ] **T01:** Crear script aditivo `database/08_devoluciones.sql` y sincronizar `00_esquema_base.sql`.
- [ ] **T02:** Crear records Java: `Devolucion`, `DetalleDevolucion` y DTOs de solicitud y cierre.

## Fase 2: Backend y TDD
- [ ] **T03:** Crear `DevolucionDAO` con métodos para registrar solicitud, cambiar estado y bloquear registros.
- [ ] **T04:** Pruebas unitarias de persistencia en `DevolucionDAOTests`.
- [ ] **T05:** Ampliar `PuertoPago` y `PagoPruebaAdapter` para soportar reembolsos (`reembolsarPago(...)`).
- [ ] **T06:** Implementar `DevolucionService` con la orquestación transaccional completa (bloqueo pesimista ordenado, movimientos de kardex y reembolso simulado).
- [ ] **T07:** Pruebas unitarias de servicio en `DevolucionServiceTests` (validación de cantidades excedidas, simulación de error y rollback).
- [ ] **T08:** Crear `DevolucionController` y `DevolucionSoporteController`.
- [ ] **T09:** Pruebas de integración de seguridad y control de rol `SOPORTE` en `DevolucionIntegrationTests`.

## Fase 3: Integración Frontend
- [ ] **T10:** En `/mis-pedidos` (`frontend/src/cliente/`), agregar selector de productos y formulario para solicitar devolución.
- [ ] **T11:** En `/soporte` (`frontend/src/soporte/`), implementar pantalla de evaluación de devoluciones y modal de recepción física (checkboxes de reposición de stock).

## Fase 4: Verificación
- [ ] **T12:** Ejecutar suite completa con `./mvnw.cmd test`.
