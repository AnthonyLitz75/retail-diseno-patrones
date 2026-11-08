# SPEC-002: Patrón Command en Operaciones de Carrito (Deshacer / Revertir)

## 1. Visión General
Implementar el patrón de comportamiento **Command** para encapsular las acciones que modifican el carrito de compras (agregar producto, modificar cantidad y eliminar ítem), permitiendo al cliente deshacer su última acción antes de confirmar la compra.

- **Requerimientos Guía:** RF08 (Carrito y Deshacer).
- **Actores:** `CLIENTE` (propietario del carrito).

---

## 2. Historias de Usuario

### Historia P1: Deshacer Eliminación de un Producto del Carrito
**Como** cliente  
**Quiero** hacer clic en "Deshacer" si eliminé accidentalmente un ítem de mi carrito  
**Para que** el producto vuelva a aparecer con la cantidad que tenía antes de retirarlo.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Reversión exitosa de una eliminación
  Given un carrito con 2 unidades del producto A
  When el cliente elimina el producto A del carrito
  And solicita la operación deshacer
  Then el producto A reaparece en el carrito con 2 unidades
  And la revisión del carrito se incrementa
```

### Historia P2: Deshacer Modificación de Cantidad
**Como** cliente  
**Quiero** revertir un cambio involuntario en la cantidad de un ítem  
**Para** restaurar la cantidad anterior inmediatamente.

#### Criterios de Aceptación (Gherkin)
```gherkin
Scenario: Reversión exitosa de ajuste de cantidad
  Given un carrito con 1 unidad del producto B
  When el cliente cambia la cantidad a 5 unidades
  And solicita deshacer
  Then el producto B vuelve a tener 1 unidad
```

---

## 3. Casos de Borde y Reglas de Negocio
1. **Conflicto de Revisión:** Si el carrito fue modificado desde otra pestaña o dispositivo y la revisión no coincide con la esperada por el comando, se rechaza la operación con `409 Conflict`.
2. **Historial Vacío:** Si el cliente solicita deshacer sin acciones previas, se responde `400 Bad Request` indicando que no hay acciones para revertir.
3. **Límite Temporal en Memoria:** El historial mantiene hasta 20 comandos por sesión en memoria; al confirmar la compra o cerrar sesión, el historial se limpia automáticamente.
