# SPEC-004: Módulo de Soporte: Gestión y Escalamiento de Reclamos

## 1. Visión General
Habilitar al cliente la capacidad de registrar reclamos formales sobre pedidos propios entregados, y proporcionar al personal con rol `SOPORTE` la bandeja para atenderlos, responderlos, resolverlos o escalarlos al `ADMIN`.

- **Requerimientos Guía:** RF13 (Reclamos del cliente), RF24 (Atención de reclamos por Soporte), RF28 (Escalamiento al Administrador).
- **Actores:** `CLIENTE`, `SOPORTE`, `ADMIN`.

---

## 2. Historias de Usuario

### Historia P1: Registro de Reclamo (Cliente)
**Como** cliente  
**Quiero** registrar un reclamo detallando el motivo y la descripción sobre un pedido que ya recibí  
**Para que** el equipo de soporte revise mi disconformidad y me dé una solución.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Registro de reclamo en pedido entregado
  Given un cliente autenticado con un pedido propio en estado ENTREGADO
  When envía un reclamo con motivo "Producto con falla" y descripción "El teclado no enciende"
  Then el sistema crea el reclamo en estado ABIERTO
  And queda visible para el equipo de soporte
```

### Historia P2: Atención y Respuesta de Soporte (Soporte)
**Como** agente de soporte  
**Quiero** tomar un reclamo abierto, registrar una respuesta y marcarlo como resuelto  
**Para que** el cliente reciba la atención correspondiente.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Resolución de reclamo por soporte
  Given un reclamo en estado ABIERTO o EN_ATENCION
  When un usuario con rol SOPORTE registra respuesta "Se coordinará cambio de equipo" y estado RESUELTO
  Then el reclamo queda cerrado y el cliente puede ver la respuesta
```

### Historia P3: Escalamiento al Administrador (Soporte & Admin)
**Como** agente de soporte  
**Quiero** escalar reclamos complejos o casos especiales al Administrador con una justificación  
**Para que** la administración tome una decisión ejecutiva.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Escalamiento y resolución administrativa
  Given un reclamo en estado EN_ATENCION
  When soporte lo escala con motivo "Solicitud de compensación económica especial"
  Then el reclamo pasa a estado ESCALADO
  And el Administrador puede registrar la resolución definitiva
```

---

## 3. Casos de Borde y Validaciones
1. **Reclamo en Pedido No Entregado:** No se permite abrir reclamo sobre pedidos pendientes, cancelados o en preparación (`400 Bad Request`).
2. **Reclamo sobre Pedido Ajeno:** Rechazado con `404 Not Found`.
3. **Control de Rol:** Solo `SOPORTE` puede atender/escalar; solo `ADMIN` puede resolver reclamos escalados.
