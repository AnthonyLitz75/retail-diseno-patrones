-- Migración V4: Módulo de auditoría (el administrador "consulta la auditoría", guía §2).
-- Una fila por acción sensible: inicios de sesión, cuentas y roles, catálogo, categorías,
-- reportes descargados y cambios de estado de pedidos, reclamos y devoluciones.
-- El correo y el rol se guardan como estaban en el momento de la acción: si luego cambian,
-- el registro sigue mostrando quién era el actor entonces.

CREATE TABLE IF NOT EXISTS registro_auditoria (
    id_auditoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_id BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    usuario_correo VARCHAR(180),
    rol VARCHAR(20),
    accion VARCHAR(40) NOT NULL
        CHECK (accion IN (
            'INICIO_SESION', 'INICIO_SESION_FALLIDO', 'INICIO_SESION_BLOQUEADO',
            'CUENTA_CREADA', 'ROL_CAMBIADO', 'CUENTA_DESACTIVADA',
            'PRODUCTO_CREADO', 'PRODUCTO_EDITADO', 'PRECIO_CAMBIADO', 'STOCK_AJUSTADO',
            'PRODUCTO_ACTIVADO', 'PRODUCTO_DESACTIVADO',
            'CATEGORIA_CREADA', 'CATEGORIA_RENOMBRADA', 'CATEGORIA_ACTIVADA', 'CATEGORIA_DESACTIVADA',
            'REPORTE_DESCARGADO',
            'PEDIDO_ESTADO'
        )),
    entidad VARCHAR(30),
    entidad_id BIGINT,
    detalle VARCHAR(500) NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS ix_auditoria_fecha
    ON registro_auditoria(fecha DESC, id_auditoria DESC);
CREATE INDEX IF NOT EXISTS ix_auditoria_accion_fecha
    ON registro_auditoria(accion, fecha DESC);
CREATE INDEX IF NOT EXISTS ix_auditoria_usuario_fecha
    ON registro_auditoria(usuario_id, fecha DESC);
