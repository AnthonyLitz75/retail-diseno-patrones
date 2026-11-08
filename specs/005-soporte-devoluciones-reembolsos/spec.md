# SPEC-005: Módulo de Soporte: Devoluciones y Reembolsos Transaccionales

## 1. Visión General
Permitir a los clientes solicitar devoluciones parciales o totales sobre pedidos en estado `ENTREGADO`. Proporcionar a `SOPORTE` el flujo de evaluación (`APROBADA` / `RECHAZADA`) y de recepción física de mercadería con cierre transaccional: reposición de existencias solo para unidades aptas y emisión de reembolso simulado a través del `PagoPruebaAdapter`.

- **Requerimientos Guía:** RF14 (Solicitud de devolución), RF25 (Evaluación de devolución), RF26 (Recepción y cierre transaccional), RF27 (Consulta de soporte).
- **Actores:** `CLIENTE` (solicitante), `SOPORTE` (evaluador y receptor).

---

## 2. Historias de Usuario

### Historia P1: Solicitud de Devolución por Líneas (Cliente)
**Como** cliente  
**Quiero** seleccionar uno o más productos de un pedido entregado y la cantidad a devolver  
**Para que** el equipo de soporte evalúe mi caso y me autorice el reembolso.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Solicitud válida de devolución
  Given un pedido ENTREGADO con 2 unidades del producto A
  When el cliente solicita devolver 1 unidad del producto A indicando motivo "Producto no compatible"
  Then el sistema crea una devolución en estado SOLICITADA con sus líneas
```

```gherkin
Scenario: Intento de devolver más unidades de las compradas o ya devueltas
  Given un pedido con 2 unidades del producto A donde 1 ya fue devuelta previamente
  When el cliente intenta solicitar la devolución de 2 unidades
  Then el sistema rechaza la solicitud con 400 Bad Request
```

### Historia P2: Evaluación de Solicitud (Soporte)
**Como** agente de soporte  
**Quiero** aprobar o rechazar la solicitud de devolución  
**Para que** el cliente sepa si debe enviar o entregar los productos físicos a la tienda.

### Historia P3: Recepción Física, Reposición y Reembolso Transaccional (Soporte)
**Como** agente de soporte  
**Quiero** registrar la recepción de la mercadería indicando cuántas unidades están aptas para volver al stock  
**Para que** en una única transacción atómica se devuelva el dinero simulado al cliente y se incremente el stock solo de los productos no dañados.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Cierre transaccional de devolución con unidades aptas y defectuosas
  Given una devolución APROBADA de 2 unidades
  When soporte registra la recepción indicando 1 apta para stock y 1 defectuosa
  Then el stock del producto aumenta en 1 unidad con movimiento DEVOLUCION
  And se genera el reembolso simulado por el importe histórico de las 2 unidades
  And la devolución pasa a estado CERRADA
```

---

## 3. Casos de Borde y Reglas de Negocio
1. **Doble Devolución Protegida:** Las cantidades de solicitudes `SOLICITADA`, `APROBADA` y `CERRADA` consumen el saldo disponible de las líneas del pedido.
2. **Reversión de Transacción:** Si la pasarela de pagos rechaza el reembolso simulado o falla la inserción de movimientos, la transacción completa revierte (rollback).
