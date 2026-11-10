-- Migración V2: Reclamos, Devoluciones, Control Optimista de Carrito y Auditoría Extendida
-- Píxel Andino Tech Store - Hacia el 100%

-- 1. Control de revisión concurrente en carrito
ALTER TABLE carrito
    ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0;

-- 2. Monto reembolsado y unicidad de pago aprobado
ALTER TABLE pago
    ADD COLUMN IF NOT EXISTS monto_reembolsado NUMERIC(10, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_pago_monto_reembolsado'
    ) THEN
        ALTER TABLE pago ADD CONSTRAINT ck_pago_monto_reembolsado
            CHECK (monto_reembolsado >= 0 AND monto_reembolsado <= monto);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_aprobado_por_pedido
    ON pago(pedido_id)
    WHERE estado = 'APROBADO';

-- 3. Fecha de entrega efectiva en envíos
ALTER TABLE envio
    ADD COLUMN IF NOT EXISTS entregado_en TIMESTAMPTZ;

-- 4. Extensión de movimientos de inventario (tipo DEVOLUCION y referencias opcionales)
ALTER TABLE movimiento_inventario
    DROP CONSTRAINT IF EXISTS movimiento_inventario_tipo_check;

ALTER TABLE movimiento_inventario
    ADD CONSTRAINT movimiento_inventario_tipo_check
    CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'CANCELACION', 'DEVOLUCION'));

ALTER TABLE movimiento_inventario
    ADD COLUMN IF NOT EXISTS pedido_id BIGINT REFERENCES pedido(id_pedido) ON DELETE SET NULL;

ALTER TABLE movimiento_inventario
    ADD COLUMN IF NOT EXISTS devolucion_id BIGINT;

-- 5. Extensión de estados de notificación para atención y devoluciones
ALTER TABLE notificacion
    DROP CONSTRAINT IF EXISTS notificacion_estado_check;

ALTER TABLE notificacion
    ADD CONSTRAINT notificacion_estado_check
    CHECK (estado IN (
        'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO',
        'RECLAMO_REGISTRADO', 'RECLAMO_RESPONDIDO', 'RECLAMO_ESCALADO', 'RECLAMO_RESUELTO',
        'DEVOLUCION_SOLICITADA', 'DEVOLUCION_APROBADA', 'DEVOLUCION_RECHAZADA', 'DEVOLUCION_CERRADA'
    ));

-- 6. Tabla de Reclamos
CREATE TABLE IF NOT EXISTS reclamo (
    id_reclamo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    cliente_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    soporte_id BIGINT REFERENCES usuario(id_usuario),
    admin_id BIGINT REFERENCES usuario(id_usuario),
    motivo VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'ABIERTO'
        CHECK (estado IN ('ABIERTO', 'EN_ATENCION', 'RESUELTO', 'ESCALADO')),
    respuesta TEXT,
    motivo_escalamiento VARCHAR(250),
    resolucion_admin TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_reclamo_cliente_id ON reclamo(cliente_id);
CREATE INDEX IF NOT EXISTS ix_reclamo_pedido_id ON reclamo(pedido_id);
CREATE INDEX IF NOT EXISTS ix_reclamo_estado ON reclamo(estado);

-- 7. Tabla de Devoluciones
CREATE TABLE IF NOT EXISTS devolucion (
    id_devolucion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    cliente_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    soporte_id BIGINT REFERENCES usuario(id_usuario),
    motivo VARCHAR(120) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'SOLICITADA'
        CHECK (estado IN ('SOLICITADA', 'APROBADA', 'RECHAZADA', 'CERRADA')),
    observacion TEXT,
    importe_reembolso NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (importe_reembolso >= 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_devolucion_pedido_id ON devolucion(pedido_id);
CREATE INDEX IF NOT EXISTS ix_devolucion_cliente_id ON devolucion(cliente_id);
CREATE INDEX IF NOT EXISTS ix_devolucion_estado ON devolucion(estado);

-- 8. Detalle de Devolución
CREATE TABLE IF NOT EXISTS detalle_devolucion (
    id_detalle_devolucion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    devolucion_id BIGINT NOT NULL REFERENCES devolucion(id_devolucion) ON DELETE CASCADE,
    pedido_detalle_id BIGINT NOT NULL REFERENCES pedido_detalle(id_detalle),
    producto_id BIGINT NOT NULL REFERENCES producto(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    reintegrar_stock BOOLEAN NOT NULL DEFAULT FALSE,
    precio_unitario_historico NUMERIC(12, 2) NOT NULL CHECK (precio_unitario_historico > 0),
    subtotal_reembolso NUMERIC(12, 2) GENERATED ALWAYS AS (precio_unitario_historico * cantidad) STORED,
    UNIQUE (devolucion_id, pedido_detalle_id)
);

CREATE INDEX IF NOT EXISTS ix_detalle_devolucion_producto_id ON detalle_devolucion(producto_id);

-- Enlazar FK de movimiento_inventario hacia devolucion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_devolucion'
    ) THEN
        ALTER TABLE movimiento_inventario
            ADD CONSTRAINT fk_movimiento_devolucion
            FOREIGN KEY (devolucion_id) REFERENCES devolucion(id_devolucion) ON DELETE SET NULL;
    END IF;
END $$;
