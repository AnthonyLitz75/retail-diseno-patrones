-- Migración aditiva e idempotente para preguntas de clientes y respuestas de vendedores.
-- Ejecutar una vez en bases existentes después de 04_cancelacion_pedido.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS consulta_producto (
    id_consulta BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id BIGINT NOT NULL REFERENCES producto(id),
    cliente_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    pregunta VARCHAR(1000) NOT NULL CHECK (length(btrim(pregunta)) > 0),
    respuesta VARCHAR(1000),
    vendedor_id BIGINT REFERENCES usuario(id_usuario),
    creada_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respondida_en TIMESTAMPTZ,
    CHECK (respuesta IS NULL OR length(btrim(respuesta)) > 0),
    CHECK ((respuesta IS NULL AND vendedor_id IS NULL AND respondida_en IS NULL)
        OR (respuesta IS NOT NULL AND vendedor_id IS NOT NULL AND respondida_en IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS ix_consulta_cliente_fecha
    ON consulta_producto(cliente_id, creada_en DESC, id_consulta DESC);
CREATE INDEX IF NOT EXISTS ix_consulta_pendiente_fecha
    ON consulta_producto(creada_en, id_consulta) WHERE respuesta IS NULL;

COMMIT;
