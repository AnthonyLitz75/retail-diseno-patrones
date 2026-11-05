-- Migración aditiva para idempotencia y datos de entrega del pedido (Hito 60% / Cierre B4.2).
-- Agrega clave_confirmacion, destinatario y direccion_envio a la tabla pedido.
-- No elimina registros existentes y permite nulos en pedidos históricos.
BEGIN;

ALTER TABLE pedido
    ADD COLUMN IF NOT EXISTS clave_confirmacion VARCHAR(100),
    ADD COLUMN IF NOT EXISTS destinatario VARCHAR(120),
    ADD COLUMN IF NOT EXISTS direccion_envio VARCHAR(250);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pedido_clave_confirmacion
    ON pedido(clave_confirmacion)
    WHERE clave_confirmacion IS NOT NULL;

COMMIT;

