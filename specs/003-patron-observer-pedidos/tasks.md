# TASKS: Patrón Observer en Eventos de Pedido

## Fase 1: Estructura del Patrón (Foundational)
- [ ] **T01:** Crear record `EventoPedido(Long pedidoId, Long clienteId, String estadoAnterior, String estadoNuevo, Instant fecha, String motivo)`.
- [ ] **T02:** Crear interfaz `ObservadorPedido` y clase `PublicadorEventosPedido`.
- [ ] **T03:** Implementar `NotificadorInAppObservador` y `AuditoriaConsolaObservador`.

## Fase 2: Backend y TDD
- [ ] **T04:** Pruebas unitarias del patrón en `ObserverPedidoTests`.
- [ ] **T05:** Integrar `PublicadorEventosPedido` en `PedidoService` dentro de transacciones de confirmación, despacho, entrega y cancelación.
- [ ] **T06:** Agregar endpoint `PATCH /api/notificaciones/{id}/leida` en `NotificacionController`.
- [ ] **T07:** Pruebas de integración de reversión transaccional si el observador falla.

## Fase 3: Integración Frontend
- [ ] **T08:** En el navbar global (`frontend/src/main.js` o componente compartido), mostrar campana con contador de notificaciones no leídas.
- [ ] **T09:** Dropdown o vista para ver mensajes y marcarlos como leídos.

## Fase 4: Verificación
- [ ] **T10:** Ejecutar suite completa con `./mvnw.cmd test`.
