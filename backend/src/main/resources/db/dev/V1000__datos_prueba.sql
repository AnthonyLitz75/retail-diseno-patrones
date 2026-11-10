-- Datos idempotentes de demostración; ejecutar después del esquema base.
-- Todas las cuentas de prueba usan la clave temporal: PixelAndino2026!
-- El valor persistido es un hash BCrypt; cambia estas credenciales antes de un uso real.

-- Cuentas para probar los cinco roles definidos por el dominio.
-- El mismo hash BCrypt se generó y verificó con BCryptPasswordEncoder del backend.
INSERT INTO usuario (nombre, correo, clave_hash, rol, activo)
VALUES
    ('Cliente de prueba', 'registro.web@example.com', '$2a$10$zCvNJXnkSGUM7XandTmlN..ts2saHukosevl/8K2RX8Q5r/gLcK.y', 'CLIENTE', TRUE),
    ('Administrador de prueba', 'admin.prueba@example.com', '$2a$10$zCvNJXnkSGUM7XandTmlN..ts2saHukosevl/8K2RX8Q5r/gLcK.y', 'ADMIN', TRUE),
    ('Vendedor de prueba', 'vendedor.prueba@example.com', '$2a$10$zCvNJXnkSGUM7XandTmlN..ts2saHukosevl/8K2RX8Q5r/gLcK.y', 'VENDEDOR', TRUE),
    ('Almacén de prueba', 'almacen.prueba@example.com', '$2a$10$zCvNJXnkSGUM7XandTmlN..ts2saHukosevl/8K2RX8Q5r/gLcK.y', 'ALMACEN', TRUE),
    ('Soporte de prueba', 'soporte.prueba@example.com', '$2a$10$zCvNJXnkSGUM7XandTmlN..ts2saHukosevl/8K2RX8Q5r/gLcK.y', 'SOPORTE', TRUE)
ON CONFLICT (correo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    clave_hash = EXCLUDED.clave_hash,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo;

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

-- Carrito inicial para el cliente de prueba, sin requerir registro manual.
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
