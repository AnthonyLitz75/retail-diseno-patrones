# PLAN TÉCNICO: Envíos Físicos y Trazabilidad Logística

## 1. Arquitectura y Modelo de Datos Relacional

### Tabla Canónica: `envio`
Se incorpora la tabla según la sección 4 de la guía técnica:

```sql
CREATE TABLE IF NOT EXISTS envio (
    id_envio SERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL UNIQUE REFERENCES pedido(id_pedido),
    destinatario VARCHAR(120) NOT NULL,
    direccion_snapshot VARCHAR(255) NOT NULL,
    empresa_transporte VARCHAR(80),
    codigo_seguimiento VARCHAR(60),
    almacenero_id BIGINT REFERENCES usuario(id_usuario),
    fecha_despacho TIMESTAMP WITH TIME ZONE,
    fecha_entrega TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_envio_pedido_id ON envio(pedido_id);
CREATE INDEX IF NOT EXISTS idx_envio_codigo_seguimiento ON envio(codigo_seguimiento);
```

---

## 2. Integración con Patrones Existentes
- **State Pattern (`EstadoPedido`):**
  - `EstadoEnPreparacion.despachar(contexto, almaceneroId, transportista, tracking)` valida que los datos no estén vacíos antes de pasar a `EstadoDespachado`.
  - `EstadoDespachado.entregar(contexto, almaceneroId)` registra la fecha de entrega y pasa a `EstadoEntregado`.
- **Facade Pattern (`CheckoutFacade`):**
  - Se actualiza el método `confirmarCompra(...)` para recibir `destinatario` y `direccion` e invocar a `EnvioDAO.insertarEnvio(...)` dentro de la misma transacción JDBC del pedido.

---

## 3. Contratos de API REST

### 1. Confirmar Compra con Envío (Actualización)
- **Ruta:** `POST /api/pedidos/confirmar`
- **Permiso:** `CLIENTE`
- **Request Body:**
  ```json
  {
    "clave_confirmacion": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "metodo_pago": "PRUEBA_APROBADA",
    "destinatario": "Carlos Pérez",
    "direccion": "Av. Arequipa 1234, Dpto 501, Lima"
  }
  ```

### 2. Despachar Pedido con Tracking
- **Ruta:** `POST /api/pedidos/{id}/despachar`
- **Permiso:** `ALMACEN` o `ADMIN`
- **Request Body:**
  ```json
  {
    "empresa_transporte": "Olva Courier",
    "codigo_seguimiento": "OLV-987654"
  }
  ```
- **Respuesta (200 OK):**
  ```json
  {
    "pedido_id": 42,
    "estado": "DESPACHADO",
    "empresa_transporte": "Olva Courier",
    "codigo_seguimiento": "OLV-987654",
    "fecha_despacho": "2026-11-07T16:30:00Z"
  }
  ```

### 3. Registrar Entrega
- **Ruta:** `POST /api/pedidos/{id}/entregar`
- **Permiso:** `ALMACEN` o `ADMIN`
- **Respuesta (200 OK):** Estado actualizado a `ENTREGADO` con `fecha_entrega`.
