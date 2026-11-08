# TASKS: Patrón Command en Operaciones de Carrito

## Fase 1: Estructura del Patrón (Foundational)
- [ ] **T01:** Crear interfaz `ComandoCarrito` en `com.grupo.retail.patterns.command`.
- [ ] **T02:** Implementar `AgregarProductoComando`, `ModificarCantidadComando` y `EliminarProductoComando`.
- [ ] **T03:** Implementar `HistorialComandosCarrito` con límite de 20 entradas en memoria.

## Fase 2: Backend y TDD
- [ ] **T04:** Pruebas unitarias del patrón en `ComandoCarritoTests`.
- [ ] **T05:** Integrar el registro de comandos en `CarritoService` en las operaciones de adición, edición y borrado.
- [ ] **T06:** Implementar método `deshacer(HttpSession sesion)` en `CarritoService`.
- [ ] **T07:** Exponer endpoint `POST /api/carrito/deshacer` en `CarritoController`.
- [ ] **T08:** Pruebas de integración en `CarritoCommandIntegrationTests` (deshacer con éxito, conflicto de revisión 409 y control de rol).

## Fase 3: Integración Frontend
- [ ] **T09:** Agregar botón o toast "Deshacer" en `frontend/src/carrito/` tras modificar o eliminar un ítem.
- [ ] **T10:** Conectar botón con endpoint `POST /api/carrito/deshacer` y refrescar la vista.

## Fase 4: Verificación
- [ ] **T11:** Ejecutar suite completa con `./mvnw.cmd test`.
- [ ] **T12:** Verificar ausencia de regresiones.
