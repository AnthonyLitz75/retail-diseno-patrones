-- Migración aditiva e idempotente para notificaciones de cambios de pedido.
-- Ejecutar una vez en bases existentes después de 05_consultas_producto.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    estado VARCHAR(30) NOT NULL
        CHECK (estado IN ('EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO')),
    mensaje VARCHAR(250) NOT NULL CHECK (length(btrim(mensaje)) > 0),
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_notificacion_usuario_id
    ON notificacion(usuario_id, id_notificacion DESC);

COMMIT;
