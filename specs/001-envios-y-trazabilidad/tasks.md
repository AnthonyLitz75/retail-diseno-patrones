# TASKS: Envíos Físicos y Trazabilidad Logística

## Fase 1: Persistencia Base y Migración (Foundational)
- [ ] **T01:** Crear script aditivo `database/06_envios.sql` con la definición de la tabla `envio` e índices.
- [ ] **T02:** Agregar DDL de `envio` a `database/00_esquema_base.sql` para instalación reproducible desde cero.
- [ ] **T03:** Crear modelo Java record `Envio(Long id, Long pedidoId, String destinatario, String direccionSnapshot, String empresaTransporte, String codigoSeguimiento, Long almaceneroId, Instant fechaDespacho, Instant fechaEntrega)` en `com.grupo.retail.model`.

## Fase 2: Capa Backend y TDD
- [ ] **T04:** Crear `EnvioDAO` con métodos `insertarEnvioInicial(Connection, Envio)`, `actualizarDespacho(Connection, Long pedidoId, String transportista, String tracking, Long almaceneroId)` y `consultarPorPedidoId(Connection/DataSource, Long pedidoId)`.
- [ ] **T05:** Pruebas unitarias de persistencia en `EnvioDAOTests`.
- [ ] **T06:** Actualizar `CheckoutFacade` y `PedidoService` para incluir la creación del envío dentro de la transacción de confirmación.
- [ ] **T07:** Actualizar las clases de estado `EstadoEnPreparacion` y `EstadoDespachado` para recibir y persistir datos de despacho y entrega.
- [ ] **T08:** Exponer endpoints `POST /api/pedidos/{id}/despachar` y `POST /api/pedidos/{id}/entregar` en `PedidoController`.
- [ ] **T09:** Pruebas de integración en `EnvioLogisticaTests` (autorización de rol `ALMACEN`, rechazo a `CLIENTE`, validación de campos obligatorios).

## Fase 3: Integración Frontend
- [ ] **T10:** Actualizar modal/pantalla de checkout en `frontend/src/carrito/` para capturar `destinatario` y `direccion`.
- [ ] **T11:** En `/mis-pedidos` (`frontend/src/cliente/`), mostrar bloque de seguimiento: transportista, tracking y fechas.
- [ ] **T12:** En portal de almacén (`frontend/src/almacen/`), agregar formulario modal para ingresar transportista y tracking al despachar.

## Fase 4: Verificación
- [ ] **T13:** Ejecutar suite completa con `./mvnw.cmd test`.
- [ ] **T14:** Validar empaquetado frontend con `npm run build`.
- [ ] **T15:** Ejecutar `/speckit-converge` y verificar ausencia de divergencias.
