-- Datos de prueba idempotentes; ejecutar después de 01_tablas_y_reglas.sql.
-- Para generar el carrito, primero registra registro.web@example.com desde el frontend.

BEGIN;

-- Productos de ejemplo. Los existentes conservan precio y stock actuales.
WITH productos_semilla(nombre, categoria, precio, stock) AS (
    VALUES
        ('Mouse inalámbrico', 'Periféricos', 54.90, 15),
        ('Teclado mecánico', 'Periféricos', 129.50, 7),
        ('Cargador USB', 'Accesorios', 39.90, 4),
        ('Webcam HD', 'Periféricos', 60.90, 9)
), productos_creados AS (
    INSERT INTO producto (nombre, categoria, categoria_id, precio, stock)
    SELECT semilla.nombre, categoria.nombre, categoria.id_categoria,
           semilla.precio, semilla.stock
    FROM productos_semilla semilla
    JOIN categoria ON categoria.nombre = semilla.categoria AND categoria.activa = TRUE
    WHERE NOT EXISTS (
        SELECT 1 FROM producto existente
        WHERE LOWER(existente.nombre) = LOWER(semilla.nombre)
    )
    RETURNING id, stock
)
INSERT INTO movimiento_inventario (producto_id, tipo, cantidad_firmada, motivo)
SELECT id, 'ENTRADA', stock, 'Stock inicial de datos de prueba'
FROM productos_creados
WHERE stock > 0;
INSERT INTO carrito (usuario_id)
SELECT u.id_usuario
FROM usuario u
WHERE u.correo = 'registro.web@example.com'
  AND u.activo = TRUE
ON CONFLICT (usuario_id) WHERE estado = 'ACTIVO' DO NOTHING;

INSERT INTO carrito_detalle (carrito_id, producto_id, cantidad)
SELECT c.id_carrito, p.id, 1
FROM carrito c
JOIN usuario u ON u.id_usuario = c.usuario_id
JOIN producto p ON p.nombre = 'Mouse inalámbrico'
WHERE u.correo = 'registro.web@example.com'
  AND c.estado = 'ACTIVO'
ON CONFLICT (carrito_id, producto_id) DO NOTHING;

COMMIT;

-- Verificar productos y categorías migrados.
SELECT p.id, p.nombre, c.nombre AS categoria, p.precio, p.stock, p.activo
FROM producto p
JOIN categoria c ON c.id_categoria = p.categoria_id
ORDER BY p.id;

-- Verificar el carrito de prueba, si existe el cliente indicado.
SELECT u.correo, c.id_carrito, c.estado, p.nombre AS producto, cd.cantidad
FROM carrito c
JOIN usuario u ON u.id_usuario = c.usuario_id
JOIN carrito_detalle cd ON cd.carrito_id = c.id_carrito
JOIN producto p ON p.id = cd.producto_id
WHERE u.correo = 'registro.web@example.com'
ORDER BY p.nombre;