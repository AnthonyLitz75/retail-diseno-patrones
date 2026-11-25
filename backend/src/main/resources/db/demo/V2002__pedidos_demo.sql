-- Escenario de demostración: 20 pedidos de los 6 clientes en los últimos 14 días
-- (4 pendientes, 3 en preparación, 2 despachados, 9 entregados y 2 cancelados). Cada pedido lleva
-- detalle con el precio de entonces, total, pago, historial completo, envío, kardex y avisos al cliente,
-- con los mismos textos que escribe la aplicación (CheckoutFacade y PedidoService).
-- Los pedidos se localizan por su clave de confirmación demo-pedido-N (un UUID derivado del número).

CREATE TEMP TABLE demo_pedido (
    n INT PRIMARY KEY, cliente TEXT, estado TEXT,
    creado TIMESTAMPTZ, preparado TIMESTAMPTZ, despachado TIMESTAMPTZ, entregado TIMESTAMPTZ, cancelado TIMESTAMPTZ,
    cancelado_por TEXT, transportista TEXT, codigo TEXT, destinatario TEXT, direccion TEXT
) ON COMMIT DROP;

INSERT INTO demo_pedido VALUES
    (1, 'carmen.vargas@correo.example', 'ENTREGADO', NOW() - INTERVAL '312 hours', NOW() - INTERVAL '308 hours', NOW() - INTERVAL '286 hours', NOW() - INTERVAL '246 hours', NULL::timestamptz, NULL, 'Olva Courier', 'OLV-48213907', 'Carmen Vargas Lozano', 'Av. Arequipa 1840, Lince, Lima'),
    (2, 'renzo.gutierrez@correo.example', 'ENTREGADO', NOW() - INTERVAL '300 hours', NOW() - INTERVAL '297 hours', NOW() - INTERVAL '277 hours', NOW() - INTERVAL '227 hours', NULL::timestamptz, NULL, 'Shalom', 'SHA-71530482', 'Renzo Gutiérrez Pinto', 'Jr. Los Cedros 322, Santiago de Surco, Lima'),
    (3, 'sofia.medina@correo.example', 'ENTREGADO', NOW() - INTERVAL '270 hours', NOW() - INTERVAL '265 hours', NOW() - INTERVAL '244 hours', NOW() - INTERVAL '199 hours', NULL::timestamptz, NULL, 'Serpost', 'RR482913075PE', 'Sofía Medina Arce', 'Calle Las Orquídeas 145, San Isidro, Lima'),
    (4, 'renzo.gutierrez@correo.example', 'ENTREGADO', NOW() - INTERVAL '260 hours', NOW() - INTERVAL '256 hours', NOW() - INTERVAL '236 hours', NOW() - INTERVAL '192 hours', NULL::timestamptz, NULL, 'Olva Courier', 'OLV-48350116', 'Renzo Gutiérrez Pinto', 'Jr. Los Cedros 322, Santiago de Surco, Lima'),
    (5, 'oscar.ticona@correo.example', 'ENTREGADO', NOW() - INTERVAL '230 hours', NOW() - INTERVAL '227 hours', NOW() - INTERVAL '205 hours', NOW() - INTERVAL '159 hours', NULL::timestamptz, NULL, 'Shalom', 'SHA-71588830', 'Óscar Ticona Mamani', 'Av. Universitaria 1122, Los Olivos, Lima'),
    (6, 'valeria.rojas@correo.example', 'ENTREGADO', NOW() - INTERVAL '215 hours', NOW() - INTERVAL '211 hours', NOW() - INTERVAL '181 hours', NOW() - INTERVAL '101 hours', NULL::timestamptz, NULL, 'Olva Courier', 'OLV-48402265', 'Valeria Rojas Nieto', 'Jr. Huancavelica 560, Cercado de Lima'),
    (7, 'carmen.vargas@correo.example', 'ENTREGADO', NOW() - INTERVAL '190 hours', NOW() - INTERVAL '185 hours', NOW() - INTERVAL '165 hours', NOW() - INTERVAL '117 hours', NULL::timestamptz, NULL, 'Shalom', 'SHA-71614093', 'Carmen Vargas Lozano', 'Av. Arequipa 1840, Lince, Lima'),
    (8, 'sofia.medina@correo.example', 'ENTREGADO', NOW() - INTERVAL '160 hours', NOW() - INTERVAL '157 hours', NOW() - INTERVAL '138 hours', NOW() - INTERVAL '96 hours', NULL::timestamptz, NULL, 'Olva Courier', 'OLV-48477031', 'Sofía Medina Arce', 'Calle Las Orquídeas 145, San Isidro, Lima'),
    (9, 'luis.chavez@correo.example', 'ENTREGADO', NOW() - INTERVAL '140 hours', NOW() - INTERVAL '135 hours', NOW() - INTERVAL '111 hours', NOW() - INTERVAL '63 hours', NULL::timestamptz, NULL, 'Shalom', 'SHA-71660528', 'Luis Alberto Chávez Ríos', 'Av. La Marina 2250, San Miguel, Lima'),
    (10, 'carmen.vargas@correo.example', 'CANCELADO', NOW() - INTERVAL '130 hours', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NOW() - INTERVAL '128 hours', 'carmen.vargas@correo.example', NULL, NULL, 'Carmen Vargas Lozano', 'Av. Arequipa 1840, Lince, Lima'),
    (11, 'luis.chavez@correo.example', 'DESPACHADO', NOW() - INTERVAL '84 hours', NOW() - INTERVAL '81 hours', NOW() - INTERVAL '63 hours', NULL::timestamptz, NULL::timestamptz, NULL, 'Serpost', 'RR483620941PE', 'Luis Alberto Chávez Ríos', 'Av. La Marina 2250, San Miguel, Lima'),
    (12, 'valeria.rojas@correo.example', 'DESPACHADO', NOW() - INTERVAL '50 hours', NOW() - INTERVAL '48 hours', NOW() - INTERVAL '32 hours', NULL::timestamptz, NULL::timestamptz, NULL, 'Olva Courier', 'OLV-48555372', 'Valeria Rojas Nieto', 'Jr. Huancavelica 560, Cercado de Lima'),
    (13, 'sofia.medina@correo.example', 'CANCELADO', NOW() - INTERVAL '49 hours', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NOW() - INTERVAL '43 hours', 'diego.salazar@pixelandino.example', NULL, NULL, 'Sofía Medina Arce', 'Calle Las Orquídeas 145, San Isidro, Lima'),
    (14, 'carmen.vargas@correo.example', 'EN_PREPARACION', NOW() - INTERVAL '40 hours', NOW() - INTERVAL '34 hours', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL, NULL, NULL, 'Carmen Vargas Lozano', 'Av. Arequipa 1840, Lince, Lima'),
    (15, 'oscar.ticona@correo.example', 'EN_PREPARACION', NOW() - INTERVAL '30 hours', NOW() - INTERVAL '25 hours', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL, NULL, NULL, 'Óscar Ticona Mamani', 'Av. Universitaria 1122, Los Olivos, Lima'),
    (16, 'sofia.medina@correo.example', 'PENDIENTE', NOW() - INTERVAL '29 hours', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL, NULL, NULL, 'Sofía Medina Arce', 'Calle Las Orquídeas 145, San Isidro, Lima'),
    (17, 'renzo.gutierrez@correo.example', 'EN_PREPARACION', NOW() - INTERVAL '20 hours', NOW() - INTERVAL '17 hours', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL, NULL, NULL, 'Renzo Gutiérrez Pinto', 'Jr. Los Cedros 322, Santiago de Surco, Lima'),
    (18, 'luis.chavez@correo.example', 'PENDIENTE', NOW() - INTERVAL '14 hours', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL, NULL, NULL, 'Luis Alberto Chávez Ríos', 'Av. La Marina 2250, San Miguel, Lima'),
    (19, 'valeria.rojas@correo.example', 'PENDIENTE', NOW() - INTERVAL '6 hours', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL, NULL, NULL, 'Valeria Rojas Nieto', 'Jr. Huancavelica 560, Cercado de Lima'),
    (20, 'oscar.ticona@correo.example', 'PENDIENTE', NOW() - INTERVAL '2 hours', NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL, NULL, NULL, 'Óscar Ticona Mamani', 'Av. Universitaria 1122, Los Olivos, Lima');

CREATE TEMP TABLE demo_linea (n INT, sku TEXT, cantidad INT, precio NUMERIC(10, 2)) ON COMMIT DROP;

INSERT INTO demo_linea VALUES
    (1, 'PA-0006', 1, 49.00),
    (1, 'PA-0017', 2, 35.00),
    (2, 'PA-0002', 1, 289.00),
    (3, 'PA-0011', 1, 159.00),
    (3, 'PA-0010', 1, 189.00),
    (4, 'PA-0028', 1, 279.00),
    (4, 'PA-0025', 2, 175.00),
    (5, 'PA-0013', 1, 109.00),
    (5, 'PA-0005', 1, 89.00),
    (6, 'PA-0015', 2, 59.00),
    (6, 'PA-0020', 1, 79.00),
    (6, 'PA-0003', 1, 149.00),
    (7, 'PA-0008', 1, 139.00),
    (7, 'PA-0018', 1, 59.00),
    (8, 'PA-0009', 1, 199.00),
    (8, 'PA-0003', 1, 149.00),
    (9, 'PA-0016', 1, 179.00),
    (9, 'PA-0019', 1, 149.00),
    (10, 'PA-0001', 1, 169.00),
    (10, 'PA-0006', 1, 49.00),
    (11, 'PA-0022', 1, 549.00),
    (11, 'PA-0025', 1, 175.00),
    (12, 'PA-0029', 1, 189.00),
    (12, 'PA-0017', 1, 35.00),
    (13, 'PA-0024', 1, 779.00),
    (14, 'PA-0012', 1, 289.00),
    (14, 'PA-0021', 1, 25.00),
    (15, 'PA-0004', 1, 399.00),
    (16, 'PA-0030', 1, 319.00),
    (17, 'PA-0008', 1, 119.00),
    (17, 'PA-0018', 1, 59.00),
    (18, 'PA-0026', 1, 215.00),
    (18, 'PA-0015', 1, 59.00),
    (19, 'PA-0027', 1, 289.00),
    (20, 'PA-0005', 1, 89.00),
    (20, 'PA-0006', 1, 49.00);

-- 1. Pedidos (el total es la suma de su detalle).
INSERT INTO pedido (usuario_id, estado, total, clave_confirmacion, destinatario, direccion_envio, creado_en, actualizado_en)
SELECT u.id_usuario, d.estado,
       (SELECT SUM(l.precio * l.cantidad) FROM demo_linea l WHERE l.n = d.n),
       md5('demo-pedido-' || d.n)::uuid::text, d.destinatario, d.direccion, d.creado,
       COALESCE(d.cancelado, d.entregado, d.despachado, d.preparado, d.creado)
FROM demo_pedido d
JOIN usuario u ON u.correo = d.cliente
ORDER BY d.n;

-- 2. Detalle con el precio unitario de entonces.
INSERT INTO pedido_detalle (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad)
SELECT p.id_pedido, pr.id, pr.nombre, l.precio, l.cantidad
FROM demo_linea l
JOIN demo_pedido d ON d.n = l.n
JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.n)::uuid::text
JOIN producto pr ON pr.sku = l.sku
ORDER BY d.n, pr.id;

-- 3. Pago simulado: aprobado; reversado en los pedidos cancelados (como PedidoService.cancelarPedido).
INSERT INTO pago (pedido_id, metodo, estado, monto, referencia, creado_en)
SELECT p.id_pedido, 'SIMULADO', CASE WHEN d.cancelado IS NULL THEN 'APROBADO' ELSE 'REVERSADO' END,
       p.total, 'SIM-' || md5('demo-pago-' || d.n)::uuid, d.creado
FROM demo_pedido d
JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.n)::uuid::text
ORDER BY d.n;

-- 4. Historial de estados completo, en orden cronológico.
INSERT INTO pedido_historial_estado (pedido_id, estado, responsable_id, comentario, fecha)
SELECT x.pedido_id, x.estado, x.responsable_id, x.comentario, x.fecha
FROM (
    SELECT p.id_pedido AS pedido_id, 'PENDIENTE' AS estado, p.usuario_id AS responsable_id,
           'Pedido creado y pago simulado aprobado' AS comentario, d.creado AS fecha, d.n
    FROM demo_pedido d JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.n)::uuid::text
    UNION ALL
    SELECT p.id_pedido, 'EN_PREPARACION', a.id_usuario, 'Pedido preparado por almacén', d.preparado, d.n
    FROM demo_pedido d JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.n)::uuid::text
    JOIN usuario a ON a.correo = 'marco.huaman@pixelandino.example' WHERE d.preparado IS NOT NULL
    UNION ALL
    SELECT p.id_pedido, 'DESPACHADO', a.id_usuario, 'Pedido despachado por almacén', d.despachado, d.n
    FROM demo_pedido d JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.n)::uuid::text
    JOIN usuario a ON a.correo = 'marco.huaman@pixelandino.example' WHERE d.despachado IS NOT NULL
    UNION ALL
    SELECT p.id_pedido, 'ENTREGADO', a.id_usuario, 'Entrega del pedido registrada por almacén', d.entregado, d.n
    FROM demo_pedido d JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.n)::uuid::text
    JOIN usuario a ON a.correo = 'marco.huaman@pixelandino.example' WHERE d.entregado IS NOT NULL
    UNION ALL
    SELECT p.id_pedido, 'CANCELADO', a.id_usuario, 'Pedido cancelado; stock y pago simulado reversados', d.cancelado, d.n
    FROM demo_pedido d JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.n)::uuid::text
    JOIN usuario a ON a.correo = d.cancelado_por WHERE d.cancelado IS NOT NULL
) x
ORDER BY x.fecha, x.n;

-- 5. Envío (transportista y código de seguimiento) de los pedidos despachados y entregados.
INSERT INTO envio (pedido_id, transportista, codigo_seguimiento, despachado_en, entregado_en)
SELECT p.id_pedido, d.transportista, d.codigo, d.despachado, d.entregado
FROM demo_pedido d
JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.n)::uuid::text
WHERE d.despachado IS NOT NULL
ORDER BY d.n;

-- 6. Avisos al cliente: uno por cambio de estado, con el motivo como mensaje (NotificadorInAppObservador).
INSERT INTO notificacion (usuario_id, pedido_id, estado, mensaje, leida, creada_en)
SELECT p.usuario_id, p.id_pedido, x.estado, x.mensaje, x.fecha < NOW() - INTERVAL '48 hours', x.fecha
FROM (
    SELECT d.n, 'PENDIENTE' AS estado, 'Pedido confirmado; pago simulado aprobado' AS mensaje, d.creado AS fecha FROM demo_pedido d
    UNION ALL SELECT d.n, 'EN_PREPARACION', 'Pedido preparado por almacén', d.preparado FROM demo_pedido d WHERE d.preparado IS NOT NULL
    UNION ALL SELECT d.n, 'DESPACHADO', 'Pedido despachado por almacén', d.despachado FROM demo_pedido d WHERE d.despachado IS NOT NULL
    UNION ALL SELECT d.n, 'ENTREGADO', 'Entrega del pedido registrada por almacén', d.entregado FROM demo_pedido d WHERE d.entregado IS NOT NULL
    UNION ALL SELECT d.n, 'CANCELADO', 'Pedido cancelado; stock y pago simulado reversados', d.cancelado FROM demo_pedido d WHERE d.cancelado IS NOT NULL
) x
JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || x.n)::uuid::text
ORDER BY x.fecha, x.n;

-- 7. Kardex y stock: SALIDA al confirmar y CANCELACION (con signo positivo) al cancelar.
WITH salidas AS (
    INSERT INTO movimiento_inventario (producto_id, tipo, cantidad_firmada, motivo, fecha, usuario_responsable_id, pedido_id)
    SELECT pr.id, 'SALIDA', -l.cantidad, 'Venta del pedido #' || p.id_pedido, d.creado, p.usuario_id, p.id_pedido
    FROM demo_linea l
    JOIN demo_pedido d ON d.n = l.n
    JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.n)::uuid::text
    JOIN producto pr ON pr.sku = l.sku
    ORDER BY d.creado, d.n, pr.id
    RETURNING producto_id, cantidad_firmada
), reposiciones AS (
    INSERT INTO movimiento_inventario (producto_id, tipo, cantidad_firmada, motivo, fecha, usuario_responsable_id, pedido_id)
    SELECT pr.id, 'CANCELACION', l.cantidad, 'Reposición por cancelación del pedido #' || p.id_pedido, d.cancelado, a.id_usuario, p.id_pedido
    FROM demo_linea l
    JOIN demo_pedido d ON d.n = l.n AND d.cancelado IS NOT NULL
    JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.n)::uuid::text
    JOIN producto pr ON pr.sku = l.sku
    JOIN usuario a ON a.correo = d.cancelado_por
    ORDER BY d.cancelado, d.n, pr.id
    RETURNING producto_id, cantidad_firmada
), delta AS (
    SELECT producto_id, SUM(cantidad_firmada) AS cambio
    FROM (SELECT * FROM salidas UNION ALL SELECT * FROM reposiciones) m
    GROUP BY producto_id
)
UPDATE producto p
SET stock = p.stock + delta.cambio
FROM delta
WHERE p.id = delta.producto_id;
