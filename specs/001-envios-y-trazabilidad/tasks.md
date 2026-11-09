# TASKS: Envíos Físicos y Trazabilidad Logística

## Estado: COMPLETADO Y VERIFICADO (2026-11-08)

## Fase 1: Persistencia Base y Migración (Foundational)
- [x] **T01:** Crear script aditivo `database/07_envio_pedido.sql` con la definición de la tabla `envio` e índice único de seguimiento.
- [x] **T02:** Agregar DDL canónico de `envio` a `database/00_esquema_base.sql` para instalación reproducible desde cero.
- [x] **T03:** Crear modelo Java record `EnvioPedido(String transportista, String codigoSeguimiento, OffsetDateTime despachadoEn)` en `com.grupo.retail.model`.

## Fase 2: Capa Backend y TDD
- [x] **T04:** Integrar persistencia de envío en `PedidoDAO` con métodos de cambio de estado atómico a `DESPACHADO` y lectura de `envio`.
- [x] **T05:** Pruebas unitarias de persistencia y validaciones en `PedidoEnvioTests.java`.
- [x] **T06:** Actualizar `CheckoutFacade` y `PedidoService` para incluir captura de destinatario y dirección en la confirmación.
- [x] **T07:** Actualizar las transiciones de estado en `PedidoService` y `PedidoDAO` para persistir transportista, código de seguimiento y registrar en `pedido_historial_estado`.
- [x] **T08:** Exponer endpoints `POST /api/pedidos/{id}/despachar` y `POST /api/pedidos/{id}/entregar` en `PedidoController`.
- [x] **T09:** Pruebas de integración en `PedidoEnvioTests` y `PedidoAutorizacionTests` (autorización de rol `ALMACEN`/`ADMIN`, rechazo 403 a `CLIENTE`, validación de campos obligatorios).

## Fase 3: Integración Frontend
- [x] **T10:** Actualizar modal y formulario de checkout en `frontend/src/carrito/` para capturar `destinatario` y `direccionEnvio`.
- [x] **T11:** En `/mis-pedidos` (`frontend/src/pedidos/pedidos-vista.js`), mostrar bloque de seguimiento: transportista, tracking y fechas.
- [x] **T12:** En portal de almacén (`frontend/src/pedidos/pedidos-vista.js`), agregar formulario modal `crearFormularioDespacho` para ingresar transportista y tracking al despachar.

## Fase 4: Verificación
- [x] **T13:** Ejecutar suite completa con `./mvnw.cmd test` (131 tests pasando, 0 fallos).
- [x] **T14:** Validar empaquetado frontend con `npm run build` y suite de tests con `node --test` (120 tests pasando).
- [x] **T15:** Auditoría estática SonarQube con Quality Gate `PASSED (OK)`.
