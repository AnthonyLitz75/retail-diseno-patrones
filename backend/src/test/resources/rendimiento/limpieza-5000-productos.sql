-- Spec 007, T017: borra los productos sembrados por siembra-5000-productos.sql. Solo toca
-- SKU PERF- sin pedidos ni movimientos asociados.
DELETE FROM producto p
WHERE p.sku LIKE 'PERF-%'
  AND NOT EXISTS (SELECT 1 FROM pedido_detalle d WHERE d.producto_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM movimiento_inventario m WHERE m.producto_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM carrito_detalle cd WHERE cd.producto_id = p.id)
