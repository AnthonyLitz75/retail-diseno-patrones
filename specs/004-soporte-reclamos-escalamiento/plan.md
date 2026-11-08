# PLAN TÉCNICO: Módulo de Soporte - Reclamos y Escalamiento

## 1. Esquema de Base de Datos: `reclamo`

```sql
CREATE TABLE IF NOT EXISTS reclamo (
    id_reclamo SERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id_pedido),
    cliente_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    soporte_id BIGINT REFERENCES usuario(id_usuario),
    admin_id BIGINT REFERENCES usuario(id_usuario),
    motivo VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO',
    respuesta TEXT,
    motivo_escalamiento TEXT,
    resolucion_admin TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_reclamo_estado CHECK (estado IN ('ABIERTO', 'EN_ATENCION', 'RESUELTO', 'ESCALADO'))
);

CREATE INDEX IF NOT EXISTS idx_reclamo_cliente ON reclamo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reclamo_pedido ON reclamo(pedido_id);
CREATE INDEX IF NOT EXISTS idx_reclamo_estado ON reclamo(estado);
```

---

## 2. Contratos de API REST

### 1. Registrar Reclamo (Cliente)
- **Ruta:** `POST /api/pedidos/{id}/reclamos`
- **Permiso:** `CLIENTE` propietario
- **Body:** `{ "motivo": "Falla técnica", "descripcion": "Detalle del problema" }`

### 2. Listar Reclamos del Cliente
- **Ruta:** `GET /api/reclamos/mis-reclamos`
- **Permiso:** `CLIENTE`

### 3. Bandeja de Soporte
- **Ruta:** `GET /api/soporte/reclamos`
- **Permiso:** `SOPORTE` o `ADMIN`
- **Filtros opcionales:** `estado` (ABIERTO, EN_ATENCION, ESCALADO).

### 4. Responder / Resolver Reclamo
- **Ruta:** `POST /api/soporte/reclamos/{id}/responder`
- **Permiso:** `SOPORTE`
- **Body:** `{ "respuesta": "Solución propuesta", "estado": "RESUELTO" }`

### 5. Escalar Reclamo
- **Ruta:** `POST /api/soporte/reclamos/{id}/escalar`
- **Permiso:** `SOPORTE`
- **Body:** `{ "motivo_escalamiento": "Justificación de escalamiento" }`

### 6. Resolver Incidencia Escalada (Admin)
- **Ruta:** `POST /api/admin/incidencias/{id}/resolver`
- **Permiso:** `ADMIN`
- **Body:** `{ "resolucion": "Decisión final administrativa" }`
