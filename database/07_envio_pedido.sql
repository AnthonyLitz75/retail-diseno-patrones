-- Migración aditiva para registrar datos de despacho por pedido.
-- Ejecutar una sola vez en instalaciones existentes antes de desplegar el backend actualizado.
-- No elimina ni modifica pedidos existentes; no aplicar automáticamente en Railway.

BEGIN;

CREATE TABLE IF NOT EXISTS envio (
    pedido_id BIGINT PRIMARY KEY REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    transportista VARCHAR(120) NOT NULL CHECK (length(btrim(transportista)) > 0),
    codigo_seguimiento VARCHAR(120) NOT NULL UNIQUE
        CHECK (length(btrim(codigo_seguimiento)) > 0),
    despachado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
