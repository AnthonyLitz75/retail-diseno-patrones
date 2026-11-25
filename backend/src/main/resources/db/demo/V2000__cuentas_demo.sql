-- Escenario de demostración (perfil «demo»): cuentas con nombres reales de equipo y clientes.
-- Misma contraseña y mismo hash BCrypt que V1000 (se copia de la cuenta de cliente de V1000).
-- Fechas relativas a NOW(): el escenario siempre se ve reciente al levantarlo.

-- 1. Cuentas nuevas: un segundo agente de soporte y cinco clientes.
INSERT INTO usuario (nombre, correo, clave_hash, rol, activo, fecha_alta)
SELECT v.nombre, v.correo, base.clave_hash, v.rol, TRUE, v.alta
FROM (VALUES
    ('Javier Ccori Ramos', 'javier.ccori@pixelandino.example', 'SOPORTE', NOW() - INTERVAL '280 hours'),
    ('Renzo Gutiérrez Pinto', 'renzo.gutierrez@correo.example', 'CLIENTE', NOW() - INTERVAL '318 hours'),
    ('Sofía Medina Arce', 'sofia.medina@correo.example', 'CLIENTE', NOW() - INTERVAL '300 hours'),
    ('Luis Alberto Chávez Ríos', 'luis.chavez@correo.example', 'CLIENTE', NOW() - INTERVAL '290 hours'),
    ('Valeria Rojas Nieto', 'valeria.rojas@correo.example', 'CLIENTE', NOW() - INTERVAL '270 hours'),
    ('Óscar Ticona Mamani', 'oscar.ticona@correo.example', 'CLIENTE', NOW() - INTERVAL '250 hours')
) AS v(nombre, correo, rol, alta)
CROSS JOIN (SELECT clave_hash FROM usuario WHERE correo = 'registro.web@example.com') AS base(clave_hash)
ON CONFLICT (correo) DO NOTHING;

-- 2. Las cinco cuentas de V1000 pasan a tener nombre y correo reales.
UPDATE usuario u
SET nombre = v.nombre, correo = v.correo_nuevo, fecha_alta = v.alta
FROM (VALUES
    ('admin.prueba@example.com', 'Lucía Paredes Quispe', 'lucia.paredes@pixelandino.example', NOW() - INTERVAL '335 hours'),
    ('vendedor.prueba@example.com', 'Diego Salazar Rojas', 'diego.salazar@pixelandino.example', NOW() - INTERVAL '334 hours'),
    ('almacen.prueba@example.com', 'Marco Huamán Torres', 'marco.huaman@pixelandino.example', NOW() - INTERVAL '334 hours'),
    ('soporte.prueba@example.com', 'Andrea Flores Mendoza', 'andrea.flores@pixelandino.example', NOW() - INTERVAL '333 hours'),
    ('registro.web@example.com', 'Carmen Vargas Lozano', 'carmen.vargas@correo.example', NOW() - INTERVAL '330 hours')
) AS v(correo_viejo, nombre, correo_nuevo, alta)
WHERE u.correo = v.correo_viejo;
