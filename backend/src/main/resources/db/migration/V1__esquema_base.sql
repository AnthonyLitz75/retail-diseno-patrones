-- Esquema base limpio para una instalación nueva de Pixel Andino.
-- Ejecutar en la base destino antes de 02_datos_prueba.sql.
-- Seguro para volver a ejecutarse sobre una base creada con este mismo esquema.
-- No migra estructuras antiguas ni elimina o reinicia información.


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

CREATE TABLE IF NOT EXISTS categoria (
    id_categoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    categoria_padre_id BIGINT REFERENCES categoria(id_categoria) ON DELETE SET NULL
);

-- categoria_id es la FK normalizada (nullable para productos en 'Otros'); categoria es la denominación textual desnormalizada.
CREATE TABLE IF NOT EXISTS producto (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    marca VARCHAR(80),
    categoria VARCHAR(80),
    categoria_id BIGINT REFERENCES categoria(id_categoria),
    descripcion VARCHAR(1000),
    precio NUMERIC(10, 2) NOT NULL CHECK (precio > 0),
    precio_anterior NUMERIC(10, 2) CHECK (precio_anterior IS NULL OR precio_anterior > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    nuevo BOOLEAN NOT NULL DEFAULT FALSE,
    imagen VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS movimiento_inventario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id BIGINT NOT NULL REFERENCES producto(id),
    tipo VARCHAR(20) NOT NULL
        CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'CANCELACION')),
    cantidad_firmada INTEGER NOT NULL CHECK (cantidad_firmada <> 0),
    motivo VARCHAR(250) NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_responsable_id BIGINT REFERENCES usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS carrito (
    id_carrito BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'CONVERTIDO', 'ABANDONADO')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carrito_detalle (
    carrito_id BIGINT NOT NULL REFERENCES carrito(id_carrito) ON DELETE CASCADE,
    producto_id BIGINT NOT NULL REFERENCES producto(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    agregado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (carrito_id, producto_id)
);

CREATE TABLE IF NOT EXISTS pedido (
    id_pedido BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO')),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    clave_confirmacion VARCHAR(100),
    destinatario VARCHAR(120),
    direccion_envio VARCHAR(250),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pedido_clave_confirmacion
    ON pedido(clave_confirmacion)
    WHERE clave_confirmacion IS NOT NULL;

CREATE TABLE IF NOT EXISTS envio (
    pedido_id BIGINT PRIMARY KEY REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    transportista VARCHAR(120) NOT NULL CHECK (length(btrim(transportista)) > 0),
    codigo_seguimiento VARCHAR(120) NOT NULL UNIQUE
        CHECK (length(btrim(codigo_seguimiento)) > 0),
    despachado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS pago (
    id_pago BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id_pedido),
    metodo VARCHAR(20) NOT NULL DEFAULT 'SIMULADO'
        CHECK (metodo IN ('SIMULADO')),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REVERSADO')),
    monto NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
    referencia VARCHAR(100) UNIQUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedido_historial_estado (
    id_historial BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    estado VARCHAR(30) NOT NULL
        CHECK (estado IN ('PENDIENTE', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO')),
    responsable_id BIGINT NOT NULL REFERENCES usuario(id_usuario),
    comentario VARCHAR(250),
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

-- Índices para búsquedas habituales, uniones por claves foráneas y cascadas.
CREATE INDEX IF NOT EXISTS ix_categoria_padre_id
    ON categoria(categoria_padre_id);
CREATE INDEX IF NOT EXISTS ix_producto_categoria_id
    ON producto(categoria_id);
CREATE INDEX IF NOT EXISTS ix_producto_marca
    ON producto(marca);
CREATE INDEX IF NOT EXISTS ix_producto_nuevo
    ON producto(nuevo);
CREATE INDEX IF NOT EXISTS ix_movimiento_inventario_producto_fecha
    ON movimiento_inventario(producto_id, fecha DESC);
CREATE INDEX IF NOT EXISTS ix_movimiento_inventario_fecha
    ON movimiento_inventario(fecha, id);
CREATE INDEX IF NOT EXISTS ix_movimiento_inventario_responsable
    ON movimiento_inventario(usuario_responsable_id);
CREATE INDEX IF NOT EXISTS ix_carrito_usuario
    ON carrito(usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_carrito_activo_por_usuario
    ON carrito(usuario_id) WHERE estado = 'ACTIVO';
CREATE INDEX IF NOT EXISTS ix_carrito_detalle_producto
    ON carrito_detalle(producto_id);
CREATE INDEX IF NOT EXISTS ix_pedido_usuario_fecha
    ON pedido(usuario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS ix_pedido_estado_fecha
    ON pedido(estado, creado_en);
CREATE INDEX IF NOT EXISTS ix_pedido_detalle_producto
    ON pedido_detalle(producto_id);
CREATE INDEX IF NOT EXISTS ix_pago_pedido
    ON pago(pedido_id);
CREATE INDEX IF NOT EXISTS ix_historial_pedido_fecha
    ON pedido_historial_estado(pedido_id, fecha);
CREATE INDEX IF NOT EXISTS ix_historial_responsable
    ON pedido_historial_estado(responsable_id);
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
CREATE INDEX IF NOT EXISTS ix_consulta_cliente_fecha
    ON consulta_producto(cliente_id, creada_en DESC, id_consulta DESC);
CREATE INDEX IF NOT EXISTS ix_consulta_pendiente_fecha
    ON consulta_producto(creada_en, id_consulta) WHERE respuesta IS NULL;

-- Categorías iniciales del catálogo; INSERT ... ON CONFLICT permite repetirlo.
INSERT INTO categoria (nombre)
VALUES ('Periféricos'), ('Accesorios'), ('Audio')
ON CONFLICT (nombre) DO NOTHING;

