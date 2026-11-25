-- Escenario de demostración: inventario. El catálogo es el de V1001 tal cual; aquí solo se
-- fechan las cargas iniciales y se suman entradas de proveedor y ajustes del vendedor, cada uno
-- con su movimiento de kardex (tipos ENTRADA y AJUSTE, con signo, como los registra la aplicación).
-- Resultado: 2 productos activos agotados (PA-0007, PA-0014) y 3 con stock bajo de 1 a 5 unidades.

-- 1. Las cargas iniciales de V1000/V1001 se hicieron al abrir la tienda, no «ahora».
UPDATE movimiento_inventario
SET fecha = NOW() - INTERVAL '335 hours'
WHERE motivo IN ('Stock inicial de datos de prueba', 'Carga de inventario inicial demo Píxel Andino');

-- 2. Entradas de proveedor (Almacén) y ajustes por conteo físico (Vendedor).
WITH nuevos AS (
    INSERT INTO movimiento_inventario (producto_id, tipo, cantidad_firmada, motivo, fecha, usuario_responsable_id)
    SELECT p.id, v.tipo, v.cantidad, v.motivo, v.fecha, u.id_usuario
    FROM (VALUES
    ('PA-0004', 'ENTRADA', 8, 'Reposición de proveedor · guía 001-004498', 'marco.huaman@pixelandino.example', NOW() - INTERVAL '300 hours'),
    ('PA-0032', 'ENTRADA', 6, 'Reposición de proveedor · guía 001-004498', 'marco.huaman@pixelandino.example', NOW() - INTERVAL '300 hours'),
    ('PA-0027', 'ENTRADA', 10, 'Reposición de proveedor · guía 001-004512', 'marco.huaman@pixelandino.example', NOW() - INTERVAL '250 hours'),
    ('PA-0006', 'ENTRADA', 20, 'Reposición de proveedor · guía 001-004512', 'marco.huaman@pixelandino.example', NOW() - INTERVAL '250 hours'),
    ('PA-0015', 'ENTRADA', 20, 'Reposición de proveedor · guía 001-004512', 'marco.huaman@pixelandino.example', NOW() - INTERVAL '250 hours'),
    ('PA-0003', 'AJUSTE', -2, 'Conteo físico: faltante en estantería', 'diego.salazar@pixelandino.example', NOW() - INTERVAL '220 hours'),
    ('PA-0001', 'ENTRADA', 10, 'Reposición de proveedor · guía 001-004533', 'marco.huaman@pixelandino.example', NOW() - INTERVAL '120 hours'),
    ('PA-0017', 'ENTRADA', 30, 'Reposición de proveedor · guía 001-004533', 'marco.huaman@pixelandino.example', NOW() - INTERVAL '120 hours'),
    ('PA-0031', 'AJUSTE', -1, 'Conteo físico: unidad con empaque dañado, retirada de la venta', 'diego.salazar@pixelandino.example', NOW() - INTERVAL '100 hours'),
    ('PA-0021', 'AJUSTE', 2, 'Conteo físico: sobrante en almacén', 'diego.salazar@pixelandino.example', NOW() - INTERVAL '60 hours'),
    ('PA-0013', 'ENTRADA', 12, 'Reposición de proveedor · guía 001-004561', 'marco.huaman@pixelandino.example', NOW() - INTERVAL '40 hours'),
    ('PA-0028', 'ENTRADA', 10, 'Reposición de proveedor · guía 001-004561', 'marco.huaman@pixelandino.example', NOW() - INTERVAL '40 hours')
    ) AS v(sku, tipo, cantidad, motivo, responsable, fecha)
    JOIN producto p ON p.sku = v.sku
    JOIN usuario u ON u.correo = v.responsable
    ORDER BY v.fecha, p.id
    RETURNING producto_id, cantidad_firmada
), delta AS (
    SELECT producto_id, SUM(cantidad_firmada) AS cambio FROM nuevos GROUP BY producto_id
)
UPDATE producto p
SET stock = p.stock + delta.cambio
FROM delta
WHERE p.id = delta.producto_id;
