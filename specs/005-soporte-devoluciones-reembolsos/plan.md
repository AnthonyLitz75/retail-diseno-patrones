# PLAN TÉCNICO: Módulo de Soporte - Devoluciones y Reembolsos

## 1. Esquema de Base de Datos: `devolucion` y `detalle_devolucion`

```sql
CREATE TABLE IF NOT EXISTS devolucion (
    id_devolucion SERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id_pedido),
    cliente_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    soporte_id BIGINT REFERENCES usuario(id_usuario),
    motivo VARCHAR(120) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'SOLICITADA',
    importe_reembolso NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_devolucion_estado CHECK (estado IN ('SOLICITADA', 'APROBADA', 'RECHAZADA', 'CERRADA'))
);

CREATE TABLE IF NOT EXISTS detalle_devolucion (
    id_detalle_devolucion SERIAL PRIMARY KEY,
    devolucion_id BIGINT NOT NULL REFERENCES devolucion(id_devolucion) ON DELETE CASCADE,
    pedido_detalle_id BIGINT NOT NULL REFERENCES pedido_detalle(id_detalle_pedido),
    producto_id BIGINT NOT NULL REFERENCES producto(id_producto),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    reintegrar_stock BOOLEAN NOT NULL DEFAULT TRUE,
    precio_unitario_historico NUMERIC(12, 2) NOT NULL,
    subtotal_reembolso NUMERIC(12, 2) NOT NULL,
    CONSTRAINT uq_devolucion_detalle_pedido UNIQUE (devolucion_id, pedido_detalle_id)
);

CREATE INDEX IF NOT EXISTS idx_devolucion_pedido ON devolucion(pedido_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_cliente ON devolucion(cliente_id);
CREATE INDEX IF NOT EXISTS idx_detalle_devolucion_producto ON detalle_devolucion(producto_id);
```

---

## 2. Transaccionalidad en JDBC Puro

Método principal en `DevolucionService.cerrarDevolucion(...)`:
1. `con.setAutoCommit(false);`
2. `SELECT ... FOR UPDATE` sobre la cabecera `devolucion` y sobre los productos afectados (orden ascendente por `id_producto`).
3. Validar estado actual = `APROBADA`.
4. Calcular total de reembolso sumando `subtotal_reembolso` de las líneas.
5. Por cada línea con `reintegrar_stock = true`:
   - Incrementar stock en `producto`.
   - Insertar registro en `movimiento_inventario` con tipo `DEVOLUCION` y responsable `soporte_id`.
6. Invocar `PuertoPago.reembolsar(...)` mediante `PagoPruebaAdapter`.
7. Actualizar `devolucion` a `CERRADA` con `fecha_cierre` e `importe_reembolso`.
8. Insertar notificación para el cliente.
9. `con.commit();`

---

## 3. Contratos de API REST

### 1. Solicitar Devolución (Cliente)
- **Ruta:** `POST /api/pedidos/{id}/devoluciones`
- **Permiso:** `CLIENTE` propietario
- **Body:**
  ```json
  {
    "motivo": "Falla de conectividad",
    "lineas": [
      { "pedido_detalle_id": 101, "cantidad": 1 }
    ]
  }
  ```

### 2. Evaluar Solicitud (Soporte)
- **Ruta:** `POST /api/soporte/devoluciones/{id}/decision`
- **Permiso:** `SOPORTE`
- **Body:** `{ "aprobada": true, "observacion": "Aprobado para revisión en tienda" }`

### 3. Recepción y Cierre Transaccional (Soporte)
- **Ruta:** `POST /api/soporte/devoluciones/{id}/recepcion`
- **Permiso:** `SOPORTE`
- **Body:**
  ```json
  {
    "lineas": [
      { "detalle_devolucion_id": 1, "reintegrar_stock": true }
    ]
  }
  ```
