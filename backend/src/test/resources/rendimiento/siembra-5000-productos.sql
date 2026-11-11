-- Spec 007, T017 (US9, RNF07): 5000 productos de prueba para medir la búsqueda del catálogo.
-- Lo usa RendimientoBusquedaTest y también se puede ejecutar a mano con psql sobre una base
-- de prueba. Es idempotente (ON CONFLICT por SKU) y todos los SKU empiezan con PERF- para
-- poder borrarlos con limpieza-5000-productos.sql. Nunca ejecutar sobre datos reales.
INSERT INTO producto (sku, nombre, marca, categoria, categoria_id, descripcion, precio, stock, activo)
SELECT 'PERF-' || lpad(g::text, 5, '0'),
       (ARRAY['Mouse', 'Teclado', 'Monitor', 'Audífonos', 'Webcam', 'Parlante', 'Micrófono', 'Mousepad'])[1 + g % 8]
           || ' ' || (ARRAY['inalámbrico', 'gamer', 'ergonómico', 'compacto', 'profesional'])[1 + g % 5]
           || ' modelo ' || g,
       (ARRAY['Logitech', 'Razer', 'HyperX', 'Redragon', 'Genius', 'Corsair'])[1 + g % 6],
       c.nombre,
       c.id_categoria,
       'Producto de prueba de rendimiento número ' || g,
       round((9.90 + (g % 997) * 1.37)::numeric, 2),
       g % 60,
       TRUE
FROM generate_series(1, 5000) AS g
CROSS JOIN LATERAL (
    SELECT id_categoria, nombre
    FROM categoria
    ORDER BY id_categoria
    OFFSET g % (SELECT COUNT(*) FROM categoria)
    LIMIT 1
) AS c
ON CONFLICT (sku) DO NOTHING
