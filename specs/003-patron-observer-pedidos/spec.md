# SPEC-003: Patrón Observer en Eventos del Ciclo de Vida del Pedido

## 1. Visión General
Implementar el patrón de comportamiento **Observer** para desacoplar las notificaciones y los registros de auditoría de los servicios centrales de logística. Cada vez que un pedido se confirma, se cancela o transiciona de estado logístico, el sujeto (`PublicadorEventosPedido`) emite un `EventoPedido` hacia los observadores suscritos.

- **Requerimientos Guía:** RF02 (Sesión y Notificaciones), RF10 (Seguimiento de pedidos).
- **Actores:** `CLIENTE` (destinatario de alertas), `SISTEMA` / `OPERADORES` (emisores de cambios).

---

## 2. Historias de Usuario

### Historia P1: Notificación In-App Atómica (Cliente)
**Como** cliente  
**Quiero** recibir una notificación en mi campana de alertas dentro de la plataforma cuando mi pedido sea despachado o entregado  
**Para que** pueda estar al tanto del estado de mi compra en tiempo real.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Notificación atómica por despacho
  Given un pedido en estado EN_PREPARACION
  When el personal de almacén despacha el pedido
  Then el observador de notificaciones in-app inserta la alerta en la misma conexión transaccional
  And si la inserción de la alerta falla, la transacción del pedido se revierte
```

### Historia P2: Registro de Auditoría Desacoplado (Sistema)
**Como** administrador o auditor del sistema  
**Quiero** que cada transición emita un registro de log estructurado post-commit  
**Para** supervisar la trazabilidad operativa sin impactar la lógica transaccional.

---

## 3. Casos de Borde y Reglas
1. **Transaccionalidad del Observador In-App:** El observador in-app debe participar en la misma transacción JDBC; si falla, revierte el cambio de estado.
2. **Observadores Asíncronos o Post-Commit:** Los observadores de correo simulado o logs de consola solo deben ejecutarse **después** de que la transacción haya hecho `commit` con éxito, evitando falsos positivos si la base de datos revierte.
