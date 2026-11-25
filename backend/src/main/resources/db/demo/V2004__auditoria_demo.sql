-- Escenario de demostración: auditoría coherente con todo lo anterior, con los mismos códigos de
-- acción y el mismo formato de detalle que escribe la aplicación. Los cambios de estado de pedidos,
-- reclamos y devoluciones se derivan del historial y de los avisos ya cargados; el correo y el rol
-- del actor se guardan como estaban (AuditoriaDAO).

INSERT INTO registro_auditoria (fecha, usuario_id, usuario_correo, rol, accion, entidad, entidad_id, detalle)
SELECT x.fecha, x.usuario_id, u.correo, u.rol, x.accion, x.entidad, x.entidad_id, x.detalle
FROM (
    -- Inicios de sesión (AuthController).
    SELECT l.fecha, u.id_usuario AS usuario_id, 'INICIO_SESION' AS accion, 'USUARIO' AS entidad,
           u.id_usuario AS entidad_id, '' AS detalle
    FROM (VALUES
    (NOW() - INTERVAL '334 hours', 'lucia.paredes@pixelandino.example'),
    (NOW() - INTERVAL '333 hours', 'diego.salazar@pixelandino.example'),
    (NOW() - INTERVAL '312.5 hours', 'carmen.vargas@correo.example'),
    (NOW() - INTERVAL '301 hours', 'marco.huaman@pixelandino.example'),
    (NOW() - INTERVAL '300.5 hours', 'renzo.gutierrez@correo.example'),
    (NOW() - INTERVAL '270.5 hours', 'sofia.medina@correo.example'),
    (NOW() - INTERVAL '260.5 hours', 'renzo.gutierrez@correo.example'),
    (NOW() - INTERVAL '251 hours', 'marco.huaman@pixelandino.example'),
    (NOW() - INTERVAL '232 hours', 'diego.salazar@pixelandino.example'),
    (NOW() - INTERVAL '230.5 hours', 'oscar.ticona@correo.example'),
    (NOW() - INTERVAL '216 hours', 'andrea.flores@pixelandino.example'),
    (NOW() - INTERVAL '215.5 hours', 'valeria.rojas@correo.example'),
    (NOW() - INTERVAL '200 hours', 'lucia.paredes@pixelandino.example'),
    (NOW() - INTERVAL '191 hours', 'andrea.flores@pixelandino.example'),
    (NOW() - INTERVAL '191 hours', 'javier.ccori@pixelandino.example'),
    (NOW() - INTERVAL '190.5 hours', 'carmen.vargas@correo.example'),
    (NOW() - INTERVAL '181 hours', 'andrea.flores@pixelandino.example'),
    (NOW() - INTERVAL '161 hours', 'andrea.flores@pixelandino.example'),
    (NOW() - INTERVAL '161 hours', 'javier.ccori@pixelandino.example'),
    (NOW() - INTERVAL '160.5 hours', 'sofia.medina@correo.example'),
    (NOW() - INTERVAL '151 hours', 'diego.salazar@pixelandino.example'),
    (NOW() - INTERVAL '151 hours', 'javier.ccori@pixelandino.example'),
    (NOW() - INTERVAL '140.5 hours', 'luis.chavez@correo.example'),
    (NOW() - INTERVAL '130.5 hours', 'carmen.vargas@correo.example'),
    (NOW() - INTERVAL '121 hours', 'marco.huaman@pixelandino.example'),
    (NOW() - INTERVAL '121 hours', 'javier.ccori@pixelandino.example'),
    (NOW() - INTERVAL '119 hours', 'diego.salazar@pixelandino.example'),
    (NOW() - INTERVAL '111 hours', 'andrea.flores@pixelandino.example'),
    (NOW() - INTERVAL '102 hours', 'diego.salazar@pixelandino.example'),
    (NOW() - INTERVAL '101 hours', 'andrea.flores@pixelandino.example'),
    (NOW() - INTERVAL '100 hours', 'lucia.paredes@pixelandino.example'),
    (NOW() - INTERVAL '91 hours', 'javier.ccori@pixelandino.example'),
    (NOW() - INTERVAL '84.5 hours', 'luis.chavez@correo.example'),
    (NOW() - INTERVAL '81 hours', 'andrea.flores@pixelandino.example'),
    (NOW() - INTERVAL '71 hours', 'andrea.flores@pixelandino.example'),
    (NOW() - INTERVAL '71 hours', 'javier.ccori@pixelandino.example'),
    (NOW() - INTERVAL '70 hours', 'lucia.paredes@pixelandino.example'),
    (NOW() - INTERVAL '61 hours', 'diego.salazar@pixelandino.example'),
    (NOW() - INTERVAL '50.5 hours', 'valeria.rojas@correo.example'),
    (NOW() - INTERVAL '49.5 hours', 'sofia.medina@correo.example'),
    (NOW() - INTERVAL '41 hours', 'marco.huaman@pixelandino.example'),
    (NOW() - INTERVAL '40.5 hours', 'carmen.vargas@correo.example'),
    (NOW() - INTERVAL '30.5 hours', 'oscar.ticona@correo.example'),
    (NOW() - INTERVAL '29.5 hours', 'sofia.medina@correo.example'),
    (NOW() - INTERVAL '24 hours', 'lucia.paredes@pixelandino.example'),
    (NOW() - INTERVAL '20.5 hours', 'renzo.gutierrez@correo.example'),
    (NOW() - INTERVAL '14.5 hours', 'luis.chavez@correo.example'),
    (NOW() - INTERVAL '12 hours', 'diego.salazar@pixelandino.example'),
    (NOW() - INTERVAL '8 hours', 'marco.huaman@pixelandino.example'),
    (NOW() - INTERVAL '6.5 hours', 'valeria.rojas@correo.example'),
    (NOW() - INTERVAL '3 hours', 'lucia.paredes@pixelandino.example'),
    (NOW() - INTERVAL '2.5 hours', 'oscar.ticona@correo.example'),
    (NOW() - INTERVAL '1.8 hours', 'lucia.paredes@pixelandino.example')
    ) AS l(fecha, correo)
    JOIN usuario u ON u.correo = l.correo
    UNION ALL
    -- Cuenta de soporte creada por la administradora (UsuarioService.registrarPersonal).
    SELECT NOW() - INTERVAL '280 hours', adm.id_usuario, 'CUENTA_CREADA', 'USUARIO', nuevo.id_usuario, nuevo.correo || ' como ' || nuevo.rol
    FROM usuario adm JOIN usuario nuevo ON nuevo.correo = 'javier.ccori@pixelandino.example'
    WHERE adm.correo = 'lucia.paredes@pixelandino.example'
    UNION ALL
    -- Cambios de estado de pedido (PedidoService, CheckoutFacade y AuditoriaPedidoObservador).
    SELECT h.fecha, h.responsable_id, 'PEDIDO_ESTADO', 'PEDIDO', h.pedido_id,
           'Pedido #' || h.pedido_id || ': ' || COALESCE(h.anterior, '(nuevo)') || ' → ' || h.estado || '. '
           || CASE WHEN h.estado = 'PENDIENTE' THEN 'Pedido confirmado; pago simulado aprobado' ELSE h.comentario END
    FROM (
        SELECT pedido_id, estado, responsable_id, comentario, fecha, id_historial,
               LAG(estado) OVER (PARTITION BY pedido_id ORDER BY fecha, id_historial) AS anterior
        FROM pedido_historial_estado
    ) h
    UNION ALL
    -- Reclamos y devoluciones: un registro por cada aviso al cliente (ReclamoService y DevolucionService).
    SELECT n.creada_en,
           CASE WHEN n.estado IN ('RECLAMO_REGISTRADO', 'DEVOLUCION_SOLICITADA') THEN n.usuario_id
                WHEN n.estado LIKE 'RECLAMO%' THEN (SELECT r.soporte_id FROM reclamo r WHERE r.pedido_id = n.pedido_id)
                ELSE (SELECT v.soporte_id FROM devolucion v WHERE v.pedido_id = n.pedido_id) END,
           'PEDIDO_ESTADO',
           CASE WHEN n.estado LIKE 'RECLAMO%' THEN 'RECLAMO' ELSE 'DEVOLUCION' END,
           n.pedido_id,
           'Pedido #' || n.pedido_id || ': '
           || CASE n.estado WHEN 'RECLAMO_REGISTRADO' THEN '(nuevo)' WHEN 'DEVOLUCION_SOLICITADA' THEN '(nuevo)'
                            WHEN 'DEVOLUCION_APROBADA' THEN 'DEVOLUCION_SOLICITADA' WHEN 'DEVOLUCION_RECHAZADA' THEN 'DEVOLUCION_SOLICITADA'
                            WHEN 'DEVOLUCION_CERRADA' THEN 'DEVOLUCION_APROBADA' ELSE 'RECLAMO_EN_ATENCION' END
           || ' → ' || n.estado || '. ' || n.mensaje
    FROM notificacion n
    WHERE n.estado LIKE 'RECLAMO\_%' OR n.estado LIKE 'DEVOLUCION\_%'
    UNION ALL
    -- Ajustes de stock del vendedor (ProductoService.ajustarStock).
    SELECT a.fecha, u.id_usuario, 'STOCK_AJUSTADO', 'PRODUCTO', p.id, a.detalle
    FROM (VALUES
    (NOW() - INTERVAL '220 hours', 'diego.salazar@pixelandino.example', 'PA-0003', 'Teclado inalámbrico multidispositivo K380 (PA-0003): 22 → 20. Conteo físico: faltante en estantería'),
    (NOW() - INTERVAL '100 hours', 'diego.salazar@pixelandino.example', 'PA-0031', 'Tarjeta de video GeForce RTX 4060 Dual 8 GB (PA-0031): 3 → 2. Conteo físico: unidad con empaque dañado, retirada de la venta'),
    (NOW() - INTERVAL '60 hours', 'diego.salazar@pixelandino.example', 'PA-0021', 'Kit de limpieza para pantallas y teclados (PA-0021): 18 → 20. Conteo físico: sobrante en almacén')
    ) AS a(fecha, responsable, sku, detalle)
    JOIN usuario u ON u.correo = a.responsable
    JOIN producto p ON p.sku = a.sku
    UNION ALL
    -- Cambios de precio (ProductoService.actualizarPrecio); el catálogo de V1001 ya trae el precio nuevo.
    SELECT a.fecha, u.id_usuario, 'PRECIO_CAMBIADO', 'PRODUCTO', p.id, a.detalle
    FROM (VALUES
    (NOW() - INTERVAL '230 hours', 'diego.salazar@pixelandino.example', 'PA-0001', 'Teclado mecánico 60% RGB Fizz K617 (PA-0001): S/ 199.00 → S/ 169.00'),
    (NOW() - INTERVAL '150 hours', 'diego.salazar@pixelandino.example', 'PA-0008', 'Mouse gamer DeathAdder Essential (PA-0008): S/ 139.00 → S/ 119.00')
    ) AS a(fecha, responsable, sku, detalle)
    JOIN usuario u ON u.correo = a.responsable
    JOIN producto p ON p.sku = a.sku
    UNION ALL
    -- Descarga del CSV de ventas por la administradora (ReporteAdminController).
    SELECT NOW() - INTERVAL '1.5 hours', u.id_usuario, 'REPORTE_DESCARGADO', 'REPORTE', NULL::bigint, 'ventas.csv (sin filtro de fechas)'
    FROM usuario u WHERE u.correo = 'lucia.paredes@pixelandino.example'
) x
JOIN usuario u ON u.id_usuario = x.usuario_id
ORDER BY x.fecha, x.entidad_id;
