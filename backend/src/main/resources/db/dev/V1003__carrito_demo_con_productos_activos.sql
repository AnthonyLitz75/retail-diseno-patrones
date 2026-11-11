-- Datos demo (solo perfil dev). Hallazgo H2 de la verificación del spec 005:
-- V1000 pone en el carrito del cliente demo el producto legado "Mouse inalámbrico" y
-- V1001 desactiva los productos sin SKU, así que el carrito demo mostraba un producto
-- que no se puede comprar. No se editan migraciones ya aplicadas: se corrige aquí.
-- Idempotente: se puede reejecutar sin efectos adicionales.

-- 1. Retirar del carrito demo los productos inactivos.
DELETE FROM carrito_detalle cd
USING carrito c, usuario u, producto p
WHERE cd.carrito_id = c.id_carrito
  AND u.id_usuario = c.usuario_id
  AND p.id = cd.producto_id
  AND u.correo = 'registro.web@example.com'
  AND c.estado = 'ACTIVO'
  AND p.activo = FALSE;

-- 2. Si quedó vacío, poner el reemplazo activo del catálogo demo (Mouse inalámbrico M170).
INSERT INTO carrito_detalle (carrito_id, producto_id, cantidad)
SELECT c.id_carrito, p.id, 1
FROM carrito c
JOIN usuario u ON u.id_usuario = c.usuario_id
JOIN producto p ON p.sku = 'PA-0006' AND p.activo = TRUE AND p.stock > 0
WHERE u.correo = 'registro.web@example.com'
  AND c.estado = 'ACTIVO'
  AND NOT EXISTS (SELECT 1 FROM carrito_detalle existente WHERE existente.carrito_id = c.id_carrito)
ON CONFLICT (carrito_id, producto_id) DO NOTHING;
