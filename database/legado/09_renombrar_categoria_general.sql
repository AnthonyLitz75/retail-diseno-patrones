-- Migración aditiva: Renombrar categoría 'General' a 'Audio' para catálogo especializado
UPDATE categoria
SET nombre = 'Audio'
WHERE nombre = 'General';

UPDATE producto
SET categoria = 'Audio'
WHERE categoria = 'General';
