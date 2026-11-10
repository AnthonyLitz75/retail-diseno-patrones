-- Compatibilidad con el flujo de pruebas anterior.
-- Desde B1.2, las cinco cuentas se crean en 02_datos_prueba.sql.
-- Este archivo solo verifica las cuentas de empleado y no altera datos ni claves.
SELECT id_usuario, nombre, correo, rol, activo
FROM usuario
WHERE correo IN (
    'vendedor.prueba@example.com',
    'almacen.prueba@example.com'
)
ORDER BY rol;