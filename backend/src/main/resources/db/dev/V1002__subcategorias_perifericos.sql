-- Migración 1002: Jerarquía Composite para Periféricos
-- Píxel Andino Tech Store
-- Establece 'Periféricos' como categoría compuesta padre de Teclados, Mouse, Audio y Cámaras.

-- 1. Asegurar que la categoría 'Periféricos' existe, está activa y es raíz (padre = NULL)
INSERT INTO categoria (nombre, activa, categoria_padre_id)
VALUES ('Periféricos', TRUE, NULL)
ON CONFLICT (nombre) DO UPDATE
SET activa = TRUE,
    categoria_padre_id = NULL;

-- 2. Asignar 'Periféricos' como categoria_padre_id para Teclados, Mouse, Audio y Cámaras
UPDATE categoria
SET categoria_padre_id = (SELECT id_categoria FROM categoria WHERE nombre = 'Periféricos'),
    activa = TRUE
WHERE nombre IN ('Teclados', 'Mouse', 'Audio', 'Cámaras');
