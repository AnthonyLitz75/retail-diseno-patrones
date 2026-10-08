
-- Tablas, restricciones, relaciones e índices para el avance del 40%.
-- Ejecutar primero en retail_diseno_patrones desde pgAdmin.
-- Conserva las tablas y filas existentes.

BEGIN;

-- Esquema base: permite iniciar también en una base vacía.
-- En bases existentes, CREATE TABLE IF NOT EXISTS conserva tablas y datos.
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    correo VARCHAR(180) NOT NULL UNIQUE,
    clave_hash VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'CLIENTE'
        CHECK (rol IN ('ADMIN', 'CLIENTE', 'VENDEDOR', 'ALMACEN', 'SOPORTE')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_alta TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS producto (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    categoria VARCHAR(80) NOT NULL,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS movimiento_inventario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id BIGINT NOT NULL REFERENCES producto(id),
    tipo VARCHAR(20) NOT NULL,
    cantidad_firmada INTEGER NOT NULL CHECK (cantidad_firmada <> 0),
    motivo VARCHAR(250) NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 1. Categorías normalizadas. Se copian los valores que ya tiene producto.categoria.
CREATE TABLE IF NOT EXISTS categoria (
    id_categoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO categoria (nombre)
VALUES ('Periféricos'), ('Accesorios'), ('General')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO categoria (nombre)
SELECT DISTINCT categoria
FROM producto
WHERE categoria IS NOT NULL AND BTRIM(categoria) <> ''
ON CONFLICT (nombre) DO NOTHING;

ALTER TABLE producto
    ADD COLUMN IF NOT EXISTS categoria_id BIGINT;

UPDATE producto p
SET categoria_id = c.id_categoria
FROM categoria c
WHERE p.categoria_id IS NULL
  AND c.nombre = p.categoria;

UPDATE producto p
SET categoria_id = c.id_categoria
FROM categoria c
WHERE p.categoria_id IS NULL
  AND c.nombre = 'General';

ALTER TABLE producto
    ALTER COLUMN categoria_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_producto_categoria'
    ) THEN
        ALTER TABLE producto
            ADD CONSTRAINT fk_producto_categoria
            FOREIGN KEY (categoria_id) REFERENCES categoria(id_categoria);
    END IF;
END $$;

ALTER TABLE producto
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- Compatibilidad temporal: el código actual todavía escribe producto.categoria.
-- Este trigger sincroniza esa columna con categoria_id durante la migración del backend.
CREATE OR REPLACE FUNCTION sincronizar_categoria_producto()
RETURNS TRIGGER AS $$
DECLARE
    nombre_categoria VARCHAR(80);
BEGIN
    IF NEW.categoria_id IS NULL THEN
        SELECT id_categoria INTO NEW.categoria_id
        FROM categoria
        WHERE nombre = NEW.categoria;

        IF NEW.categoria_id IS NULL THEN
            RAISE EXCEPTION 'La categoría % no existe', NEW.categoria;
        END IF;
    ELSE
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

DROP TRIGGER IF EXISTS trg_producto_categoria ON producto;
CREATE TRIGGER trg_producto_categoria
BEFORE INSERT OR UPDATE OF categoria, categoria_id ON producto
FOR EACH ROW EXECUTE FUNCTION sincronizar_categoria_producto();

-- 2. Responsable opcional para conservar los movimientos históricos existentes.
ALTER TABLE movimiento_inventario
    ADD COLUMN IF NOT EXISTS usuario_responsable_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_responsable'
    ) THEN
        ALTER TABLE movimiento_inventario
            ADD CONSTRAINT fk_movimiento_responsable
            FOREIGN KEY (usuario_responsable_id) REFERENCES usuario(id_usuario);
    END IF;
END $$;

-- Los movimientos de venta registran la salida con una cantidad firmada negativa.
-- Se reemplaza cualquier CHECK legado que mencione tipo, sin tocar otros CHECK
-- de movimiento_inventario (por ejemplo, el que impide cantidades en cero).
DO $$
DECLARE
    restriccion RECORD;
BEGIN
    FOR restriccion IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.movimiento_inventario'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%tipo%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.movimiento_inventario DROP CONSTRAINT %I',
            restriccion.conname
        );
    END LOOP;

    ALTER TABLE public.movimiento_inventario
        ADD CONSTRAINT ck_movimiento_inventario_tipo
        CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE'));
END $$;

-- 3. Un carrito activo por cliente; las líneas se conservan en PostgreSQL.
CREATE TABLE IF NOT EXISTS carrito (
    id_carrito BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'CONVERTIDO', 'ABANDONADO')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_carrito_activo_por_usuario
    ON carrito(usuario_id) WHERE estado = 'ACTIVO';

CREATE TABLE IF NOT EXISTS carrito_detalle (
    carrito_id BIGINT NOT NULL REFERENCES carrito(id_carrito) ON DELETE CASCADE,
    producto_id BIGINT NOT NULL REFERENCES producto(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    agregado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (carrito_id, producto_id)
);

-- 4. Pedido conserva el total y los datos de cada producto al momento de comprar.
CREATE TABLE IF NOT EXISTS pedido (
    id_pedido BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO')),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_pedido_usuario_fecha
    ON pedido(usuario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS ix_pedido_estado_fecha
    ON pedido(estado, creado_en);

CREATE TABLE IF NOT EXISTS pedido_detalle (
    id_detalle BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    producto_id BIGINT NOT NULL REFERENCES producto(id),
    nombre_producto VARCHAR(120) NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario > 0),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    subtotal NUMERIC(12, 2) GENERATED ALWAYS AS (precio_unitario * cantidad) STORED,
    UNIQUE (pedido_id, producto_id)
);

-- 5. Pago simulado y auditoría de cada cambio de estado del pedido.
CREATE TABLE IF NOT EXISTS pago (
    id_pago BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id_pedido),
    metodo VARCHAR(20) NOT NULL DEFAULT 'SIMULADO'
        CHECK (metodo IN ('SIMULADO')),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    monto NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
    referencia VARCHAR(100) UNIQUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_pago_pedido ON pago(pedido_id);

CREATE TABLE IF NOT EXISTS pedido_historial_estado (
    id_historial BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    estado VARCHAR(30) NOT NULL
        CHECK (estado IN ('PENDIENTE', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO')),
    responsable_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    comentario VARCHAR(250),
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_historial_pedido_fecha
    ON pedido_historial_estado(pedido_id, fecha);

COMMIT;

-- Verificar que la regla del tipo de movimiento permite ENTRADA, SALIDA y AJUSTE.
SELECT conname, pg_get_constraintdef(oid) AS regla
FROM pg_constraint
WHERE conrelid = 'public.movimiento_inventario'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%tipo%'
ORDER BY conname;
