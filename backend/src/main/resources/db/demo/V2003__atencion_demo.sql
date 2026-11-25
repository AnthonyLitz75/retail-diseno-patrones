-- Escenario de demostración: atención al cliente. 6 reclamos (2 abiertos, 2 en atención, 1 escalado
-- y 1 resuelto), 4 devoluciones (solicitada, aprobada, cerrada y rechazada) y 5 consultas de clientes
-- (3 pendientes y 2 respondidas por el vendedor). Todos sobre pedidos entregados y después de su entrega.
-- Cada cambio deja el aviso al cliente que crea la aplicación (ReclamoService y DevolucionService).

CREATE TEMP TABLE demo_reclamo (
    r INT PRIMARY KEY, pedido_n INT, motivo TEXT, descripcion TEXT, estado TEXT, agente TEXT,
    respuesta TEXT, motivo_escalamiento TEXT, creado TIMESTAMPTZ, respondido TIMESTAMPTZ, escalado TIMESTAMPTZ
) ON COMMIT DROP;

INSERT INTO demo_reclamo VALUES
    (1, 2, 'Producto defectuoso', 'El teclado llegó con dos teclas que no responden (la F5 y la barra espaciadora a veces). Lo probé en dos computadoras y pasa lo mismo.', 'EN_ATENCION', 'andrea.flores@pixelandino.example', 'Hola Renzo, lamentamos el inconveniente. ¿Puedes enviarnos un video corto donde se vea qué teclas fallan? Con eso gestionamos el cambio o la devolución.', NULL, NOW() - INTERVAL '215 hours', NOW() - INTERVAL '180 hours', NULL::timestamptz),
    (2, 3, 'Producto dañado en el envío', 'La caja del parlante llegó golpeada y con una esquina aplastada. El parlante enciende, pero quiero que revisen si quedó dañado por dentro.', 'EN_ATENCION', 'javier.ccori@pixelandino.example', 'Hola Sofía, gracias por avisarnos. Revisaremos el estado del envío con el transportista. Mientras tanto, ¿puedes enviarnos una foto de la caja y del embalaje?', NULL, NOW() - INTERVAL '190 hours', NOW() - INTERVAL '160 hours', NULL::timestamptz),
    (3, 5, 'Producto incompatible', 'La webcam no funciona con mi laptop. La conecto por USB y el equipo no la reconoce, ni siquiera en la configuración de dispositivos.', 'RESUELTO', 'javier.ccori@pixelandino.example', 'Hola Óscar. Probamos el modelo con el mismo sistema operativo de tu laptop: se activa al instalar el controlador del fabricante, que no viene incluido. Te enviamos el enlace por correo y confirmaste que ya funciona. Damos por resuelto el reclamo.', NULL, NOW() - INTERVAL '150 hours', NOW() - INTERVAL '120 hours', NULL::timestamptz),
    (4, 7, 'Cobro incorrecto', 'Me cobraron dos veces el mismo pedido: en mi banco aparecen dos cargos por el mismo monto el día de la compra.', 'ESCALADO', 'andrea.flores@pixelandino.example', 'Hola Carmen, revisamos el pedido y vemos un solo cobro aprobado. Verificaremos con el proveedor de pago si el segundo cargo es una retención temporal.', 'El cliente reporta un doble cargo en su banco; solo hay un pago aprobado en el sistema. Requiere confirmar con el proveedor de pago.', NOW() - INTERVAL '110 hours', NOW() - INTERVAL '100 hours', NOW() - INTERVAL '70 hours'),
    (5, 6, 'Retraso en la entrega', 'El pedido llegó tres días después de la fecha indicada. Lo necesitaba para una entrega de trabajo y tuve que comprar otro cargador por mi cuenta.', 'ABIERTO', NULL, NULL, NULL, NOW() - INTERVAL '60 hours', NULL::timestamptz, NULL::timestamptz),
    (6, 9, 'Producto incompleto', 'Falta el cable USB-C que figura en la descripción. Revisé toda la caja del hub y del cargador y no viene ningún cable.', 'ABIERTO', NULL, NULL, NULL, NOW() - INTERVAL '6 hours', NULL::timestamptz, NULL::timestamptz);

INSERT INTO reclamo (pedido_id, cliente_id, soporte_id, motivo, descripcion, estado, respuesta,
                     motivo_escalamiento, creado_en, actualizado_en)
SELECT p.id_pedido, p.usuario_id, a.id_usuario, r.motivo, r.descripcion, r.estado, r.respuesta,
       r.motivo_escalamiento, r.creado, COALESCE(r.escalado, r.respondido, r.creado)
FROM demo_reclamo r
JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || r.pedido_n)::uuid::text
LEFT JOIN usuario a ON a.correo = r.agente
ORDER BY r.r;

INSERT INTO notificacion (usuario_id, pedido_id, estado, mensaje, leida, creada_en)
SELECT c.cliente_id, c.pedido_id, x.estado, x.mensaje, x.fecha < NOW() - INTERVAL '48 hours', x.fecha
FROM (
    SELECT c.id_reclamo AS id, 'RECLAMO_REGISTRADO' AS estado,
           'Registramos tu reclamo #' || c.id_reclamo || '; Soporte lo atenderá pronto' AS mensaje, r.creado AS fecha
    FROM demo_reclamo r JOIN reclamo c ON c.creado_en = r.creado AND c.motivo = r.motivo
    UNION ALL
    SELECT c.id_reclamo, 'RECLAMO_RESPONDIDO', 'Respondimos tu reclamo #' || c.id_reclamo, r.respondido
    FROM demo_reclamo r JOIN reclamo c ON c.creado_en = r.creado AND c.motivo = r.motivo
    WHERE r.respondido IS NOT NULL AND r.estado <> 'RESUELTO'
    UNION ALL
    SELECT c.id_reclamo, 'RECLAMO_RESUELTO', 'Resolvimos tu reclamo #' || c.id_reclamo, r.respondido
    FROM demo_reclamo r JOIN reclamo c ON c.creado_en = r.creado AND c.motivo = r.motivo
    WHERE r.respondido IS NOT NULL AND r.estado = 'RESUELTO'
    UNION ALL
    SELECT c.id_reclamo, 'RECLAMO_ESCALADO', 'Tu reclamo #' || c.id_reclamo || ' pasó a revisión de un administrador', r.escalado
    FROM demo_reclamo r JOIN reclamo c ON c.creado_en = r.creado AND c.motivo = r.motivo
    WHERE r.escalado IS NOT NULL
) x
JOIN reclamo c ON c.id_reclamo = x.id
ORDER BY x.fecha, x.id;

-- Devoluciones: el importe es la suma de sus líneas al precio histórico del pedido.
CREATE TEMP TABLE demo_devolucion (
    d INT PRIMARY KEY, pedido_n INT, motivo TEXT, estado TEXT, soporte TEXT, observacion TEXT,
    creada TIMESTAMPTZ, decidida TIMESTAMPTZ, cerrada TIMESTAMPTZ
) ON COMMIT DROP;

INSERT INTO demo_devolucion VALUES
    (1, 1, 'No era el modelo que buscaba', 'CERRADA', 'andrea.flores@pixelandino.example', 'Recibimos el mouse sin uso y en su empaque.', NOW() - INTERVAL '200 hours', NOW() - INTERVAL '190 hours', NOW() - INTERVAL '160 hours'),
    (2, 4, 'Compatibilidad: mi placa usa DDR5', 'APROBADA', 'andrea.flores@pixelandino.example', 'Envíanos el módulo en su empaque original a nuestro almacén para completar la devolución.', NOW() - INTERVAL '100 hours', NOW() - INTERVAL '80 hours', NULL::timestamptz),
    (3, 6, 'Ya no lo necesito', 'RECHAZADA', 'javier.ccori@pixelandino.example', 'El producto presenta señales de uso y el motivo no corresponde a un defecto ni a un error de envío.', NOW() - INTERVAL '90 hours', NOW() - INTERVAL '70 hours', NULL::timestamptz),
    (4, 8, 'Las almohadillas me incomodan', 'SOLICITADA', NULL, NULL, NOW() - INTERVAL '30 hours', NULL::timestamptz, NULL::timestamptz);

CREATE TEMP TABLE demo_devolucion_linea (d INT, sku TEXT, cantidad INT, apta BOOLEAN) ON COMMIT DROP;

INSERT INTO demo_devolucion_linea VALUES
    (1, 'PA-0006', 1, TRUE),
    (2, 'PA-0025', 1, NULL::boolean),
    (3, 'PA-0015', 1, NULL::boolean),
    (4, 'PA-0009', 1, NULL::boolean);

INSERT INTO devolucion (pedido_id, cliente_id, soporte_id, motivo, estado, observacion, importe_reembolso,
                        creado_en, actualizado_en, fecha_cierre)
SELECT p.id_pedido, p.usuario_id, a.id_usuario, d.motivo, d.estado, d.observacion,
       (SELECT SUM(pd.precio_unitario * l.cantidad)
        FROM demo_devolucion_linea l
        JOIN producto pr ON pr.sku = l.sku
        JOIN pedido_detalle pd ON pd.pedido_id = p.id_pedido AND pd.producto_id = pr.id
        WHERE l.d = d.d),
       d.creada, COALESCE(d.cerrada, d.decidida, d.creada), d.cerrada
FROM demo_devolucion d
JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.pedido_n)::uuid::text
LEFT JOIN usuario a ON a.correo = d.soporte
ORDER BY d.d;

INSERT INTO detalle_devolucion (devolucion_id, pedido_detalle_id, producto_id, cantidad, reintegrar_stock, precio_unitario_historico)
SELECT v.id_devolucion, pd.id_detalle, pr.id, l.cantidad, COALESCE(l.apta, FALSE), pd.precio_unitario
FROM demo_devolucion_linea l
JOIN demo_devolucion d ON d.d = l.d
JOIN pedido p ON p.clave_confirmacion = md5('demo-pedido-' || d.pedido_n)::uuid::text
JOIN devolucion v ON v.pedido_id = p.id_pedido AND v.creado_en = d.creada
JOIN producto pr ON pr.sku = l.sku
JOIN pedido_detalle pd ON pd.pedido_id = p.id_pedido AND pd.producto_id = pr.id
ORDER BY d.d;

INSERT INTO notificacion (usuario_id, pedido_id, estado, mensaje, leida, creada_en)
SELECT v.cliente_id, v.pedido_id, x.estado, x.mensaje, x.fecha < NOW() - INTERVAL '48 hours', x.fecha
FROM (
    SELECT v.id_devolucion AS id, 'DEVOLUCION_SOLICITADA' AS estado,
           'Registramos tu solicitud de devolución #' || v.id_devolucion AS mensaje, d.creada AS fecha
    FROM demo_devolucion d JOIN devolucion v ON v.creado_en = d.creada AND v.motivo = d.motivo
    UNION ALL
    SELECT v.id_devolucion, 'DEVOLUCION_APROBADA', 'Aprobamos tu devolución #' || v.id_devolucion || '; envíanos los productos', d.decidida
    FROM demo_devolucion d JOIN devolucion v ON v.creado_en = d.creada AND v.motivo = d.motivo
    WHERE d.estado IN ('APROBADA', 'CERRADA')
    UNION ALL
    SELECT v.id_devolucion, 'DEVOLUCION_RECHAZADA', 'Tu devolución #' || v.id_devolucion || ' fue rechazada', d.decidida
    FROM demo_devolucion d JOIN devolucion v ON v.creado_en = d.creada AND v.motivo = d.motivo
    WHERE d.estado = 'RECHAZADA'
    UNION ALL
    SELECT v.id_devolucion, 'DEVOLUCION_CERRADA', 'Cerramos tu devolución #' || v.id_devolucion || '; reembolsamos S/ ' || v.importe_reembolso::text, d.cerrada
    FROM demo_devolucion d JOIN devolucion v ON v.creado_en = d.creada AND v.motivo = d.motivo
    WHERE d.estado = 'CERRADA'
) x
JOIN devolucion v ON v.id_devolucion = x.id
ORDER BY x.fecha, x.id;

-- Devolución cerrada: reembolso acumulado en el pago y reingreso al kardex de las líneas aptas.
UPDATE pago pg
SET monto_reembolsado = v.importe_reembolso
FROM devolucion v
WHERE v.estado = 'CERRADA' AND pg.pedido_id = v.pedido_id AND pg.estado = 'APROBADO';

WITH reingresos AS (
    INSERT INTO movimiento_inventario (producto_id, tipo, cantidad_firmada, motivo, fecha, usuario_responsable_id, pedido_id, devolucion_id)
    SELECT dd.producto_id, 'DEVOLUCION', dd.cantidad,
           'Devolución #' || v.id_devolucion || ' del pedido #' || v.pedido_id, v.fecha_cierre, v.soporte_id, v.pedido_id, v.id_devolucion
    FROM detalle_devolucion dd
    JOIN devolucion v ON v.id_devolucion = dd.devolucion_id
    WHERE v.estado = 'CERRADA' AND dd.reintegrar_stock
    ORDER BY v.fecha_cierre, dd.producto_id
    RETURNING producto_id, cantidad_firmada
), delta AS (
    SELECT producto_id, SUM(cantidad_firmada) AS cambio FROM reingresos GROUP BY producto_id
)
UPDATE producto p
SET stock = p.stock + delta.cambio
FROM delta
WHERE p.id = delta.producto_id;

-- Consultas de clientes sobre productos: 3 pendientes y 2 respondidas por el vendedor.
INSERT INTO consulta_producto (producto_id, cliente_id, pregunta, respuesta, vendedor_id, creada_en, respondida_en)
SELECT pr.id, c.id_usuario, v.pregunta, v.respuesta, vd.id_usuario, v.creada, v.respondida
FROM (VALUES
    ('PA-0022', 'valeria.rojas@correo.example', '¿El Ryzen 5 5600 incluye disipador? Mi placa es una B450, ¿es compatible?', 'Hola Valeria, sí incluye el disipador Wraith Stealth. Es compatible con placas B450 siempre que la BIOS esté actualizada; revisa la lista de compatibilidad de tu fabricante.', 'diego.salazar@pixelandino.example', NOW() - INTERVAL '130 hours', NOW() - INTERVAL '118 hours'),
    ('PA-0020', 'sofia.medina@correo.example', '¿Sirve para laptops de 17 pulgadas? ¿Cuál es el tamaño máximo que soporta?', 'Hola Sofía, el soporte se ajusta para laptops de 11 a 17 pulgadas. Para equipos muy pesados te recomendamos usarlo en una superficie plana.', 'diego.salazar@pixelandino.example', NOW() - INTERVAL '75 hours', NOW() - INTERVAL '60 hours'),
    ('PA-0031', 'renzo.gutierrez@correo.example', '¿Con una fuente de 500 W alcanza para la RTX 4060 o necesito una más potente?', NULL, NULL, NOW() - INTERVAL '26 hours', NULL::timestamptz),
    ('PA-0010', 'luis.chavez@correo.example', '¿Cuántos meses de garantía tienen los auriculares Tune 520BT y quién la atiende?', NULL, NULL, NOW() - INTERVAL '9 hours', NULL::timestamptz),
    ('PA-0028', 'oscar.ticona@correo.example', '¿Qué trae la caja del SSD NV2? ¿Incluye el tornillo para montarlo en la placa?', NULL, NULL, NOW() - INTERVAL '3 hours', NULL::timestamptz)
) AS v(sku, cliente, pregunta, respuesta, vendedor, creada, respondida)
JOIN producto pr ON pr.sku = v.sku
JOIN usuario c ON c.correo = v.cliente
LEFT JOIN usuario vd ON vd.correo = v.vendedor
ORDER BY v.creada;
