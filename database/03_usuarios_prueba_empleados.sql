-- Cuentas internas temporales para validar permisos en desarrollo.
-- Reutilizan el hash BCrypt de la cuenta CLIENTE de prueba, por lo que
-- se inicia sesión con la misma contraseña usada para esa cuenta.
-- Ejecutar después de 01_tablas_y_reglas.sql y 02_datos_prueba.sql.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM usuario
        WHERE correo = 'registro.web@example.com'
          AND activo = TRUE
    ) THEN
        RAISE EXCEPTION
            'Primero registra y activa registro.web@example.com para crear las cuentas internas de prueba';
    END IF;
END;
$$;

BEGIN;

WITH cuenta_cliente_prueba AS (
    SELECT clave_hash
    FROM usuario
    WHERE correo = 'registro.web@example.com'
      AND activo = TRUE
), cuentas_empleado AS (
    SELECT *
    FROM (VALUES
        ('Vendedor de prueba', 'vendedor.prueba@example.com', 'VENDEDOR'),
        ('Almacén de prueba', 'almacen.prueba@example.com', 'ALMACEN')
    ) AS datos(nombre, correo, rol)
)
INSERT INTO usuario (nombre, correo, clave_hash, rol, activo)
SELECT empleado.nombre,
       empleado.correo,
       cliente.clave_hash,
       empleado.rol,
       TRUE
FROM cuentas_empleado empleado
CROSS JOIN cuenta_cliente_prueba cliente
ON CONFLICT (correo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    clave_hash = EXCLUDED.clave_hash,
    rol = EXCLUDED.rol,
    activo = TRUE;

COMMIT;

-- Verificar las cuentas y sus roles sin mostrar el hash de contraseña.
SELECT id_usuario, nombre, correo, rol, activo
FROM usuario
WHERE correo IN (
    'vendedor.prueba@example.com',
    'almacen.prueba@example.com'
)
ORDER BY rol;
