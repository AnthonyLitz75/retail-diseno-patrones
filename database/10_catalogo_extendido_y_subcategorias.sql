-- Migración 10: Soporte para subcategorías jerárquicas y catálogo extendido
-- Píxel Andino Tech Store
-- Agrega columna categoria_padre_id y atributos extendidos a producto

BEGIN;

-- 1. Soporte para jerarquía de categorías
ALTER TABLE categoria
    ADD COLUMN IF NOT EXISTS categoria_padre_id BIGINT REFERENCES categoria(id_categoria) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_categoria_padre_id
    ON categoria(categoria_padre_id);

-- 2. Permitir que categoria y categoria_id en producto sean nulas (ej. para productos en "Otros" / sin categoría)
ALTER TABLE producto
    ALTER COLUMN categoria DROP NOT NULL,
    ALTER COLUMN categoria DROP DEFAULT,
    ALTER COLUMN categoria_id DROP NOT NULL;

-- 3. Extender producto con atributos del catálogo profesional
ALTER TABLE producto
    ADD COLUMN IF NOT EXISTS sku VARCHAR(50),
    ADD COLUMN IF NOT EXISTS marca VARCHAR(80),
    ADD COLUMN IF NOT EXISTS descripcion VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS precio_anterior NUMERIC(10, 2) CHECK (precio_anterior IS NULL OR precio_anterior > 0),
    ADD COLUMN IF NOT EXISTS nuevo BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS imagen VARCHAR(255);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_producto_sku'
    ) THEN
        ALTER TABLE producto ADD CONSTRAINT uq_producto_sku UNIQUE (sku);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_producto_marca
    ON producto(marca);

CREATE INDEX IF NOT EXISTS ix_producto_nuevo
    ON producto(nuevo);

-- 4. Actualizar trigger sincronizar_categoria_producto para permitir categoria_id NULL
CREATE OR REPLACE FUNCTION sincronizar_categoria_producto()
RETURNS TRIGGER AS $$
DECLARE
    nombre_categoria VARCHAR(80);
BEGIN
    -- Caso 1: Producto sin categoría asignada o categoría nula
    IF NEW.categoria_id IS NULL THEN
        IF NEW.categoria IS NULL OR NEW.categoria = '' OR NEW.categoria = 'Sin categoría' THEN
            NEW.categoria_id := NULL;
            NEW.categoria := NULL;
            RETURN NEW;
        END IF;

        -- Buscar por nombre si viene especificado
        SELECT id_categoria INTO NEW.categoria_id
        FROM categoria
        WHERE nombre = NEW.categoria;

        IF NEW.categoria_id IS NULL THEN
            NEW.categoria := NULL;
        END IF;
    ELSE
        -- Caso 2: Se proporcionó categoria_id
        SELECT nombre INTO nombre_categoria
        FROM categoria
        WHERE id_categoria = NEW.categoria_id;

        IF nombre_categoria IS NULL THEN
            RAISE EXCEPTION 'La categoría con id % no existe', NEW.categoria_id;
        END IF;

        NEW.categoria := nombre_categoria;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Eliminar categoría General si no tiene productos asociados
DELETE FROM categoria
WHERE nombre = 'General'
  AND NOT EXISTS (SELECT 1 FROM producto WHERE categoria_id = categoria.id_categoria);

COMMIT;
