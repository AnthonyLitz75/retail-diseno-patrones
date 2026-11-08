# SPEC-001: Envíos Físicos y Trazabilidad Logística

## 1. Visión General
Permitir el registro de direcciones de entrega al confirmar una compra, la asignación de transportista y código de seguimiento al despachar mercadería por parte del personal de almacén, y la consulta de trazabilidad en tiempo real por parte del cliente y del equipo logístico.

- **Requerimientos Guía:** RF10 (Seguimiento de pedidos), RF23 (Despacho y entrega).
- **Actores:** `CLIENTE` (propietario), `ALMACEN` (operador logístico), `ADMIN` / `VENDEDOR` (supervisión).

---

## 2. Historias de Usuario

### Historia P1: Captura de Dirección al Confirmar Pedido (Cliente)
**Como** cliente de la tienda  
**Quiero** ingresar el destinatario y la dirección de entrega al confirmar mi compra  
**Para que** el personal de almacén sepa a dónde y a quién enviar mis productos.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Confirmación de compra con datos de envío válidos
  Given un cliente autenticado con productos en su carrito
  When envía la confirmación con destinatario "Carlos Pérez" y dirección "Av. Arequipa 1234, Lima"
  Then el sistema crea el pedido, descuenta stock y crea el registro de envío asociado
  And el estado del envío queda inicialmente como pendiente de despacho
```

### Historia P2: Asignación de Despacho y Tracking (Almacén)
**Como** encargado de almacén  
**Quiero** registrar el nombre de la empresa de transporte y el código de seguimiento al despachar un pedido  
**Para que** el cliente y la tienda puedan rastrear el paquete físico.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Despacho de un pedido en preparación
  Given un pedido en estado EN_PREPARACION
  When el usuario con rol ALMACEN registra transportista "Olva Courier" y tracking "OLV-987654"
  Then el pedido transiciona a estado DESPACHADO
  And se registra la fecha de despacho y el responsable en la tabla de envío y en el historial
```

### Historia P3: Registro de Entrega Efectiva (Almacén)
**Como** encargado de almacén  
**Quiero** registrar la confirmación de entrega del transportista  
**Para que** el pedido pase a su estado final ENTREGADO y se habilite la ventana de reclamos/devoluciones.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Entrega de un pedido despachado
  Given un pedido en estado DESPACHADO
  When el usuario con rol ALMACEN registra la confirmación de entrega
  Then el pedido transiciona a estado ENTREGADO
  And se registra la fecha_entrega en el registro de envío
```

### Historia P4: Consulta de Seguimiento de Envío (Cliente)
**Como** cliente  
**Quiero** ver la información de transporte, tracking y fechas en el detalle de mi pedido  
**Para** conocer el estado de entrega de mis compras.

---

## 3. Casos de Borde y Validaciones
1. **Intento de Despacho sin Tracking:** La solicitud debe ser rechazada con `400 Bad Request` si el transportista o código de seguimiento están vacíos.
2. **Acceso a Pedido Ajeno:** Un cliente que intente consultar el envío de otro cliente recibe `404 Not Found`.
3. **Rol No Autorizado:** Si un cliente o vendedor intenta despachar o entregar un pedido, se responde `403 Forbidden`.
