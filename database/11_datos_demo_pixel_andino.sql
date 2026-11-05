-- Carga de Datos de Demostración - Píxel Andino Tech Store
-- 11 Categorías (7 principales, 4 subcategorías) y 32 productos
-- Idempotente: se puede reejecutar de forma segura

BEGIN;

-- 1. Desactivar productos legados que no tienen SKU asignado
UPDATE producto
SET activo = FALSE
WHERE sku IS NULL;

-- 2. Categorías principales
INSERT INTO categoria (nombre, activa, categoria_padre_id) VALUES
    ('Periféricos', TRUE, NULL),
    ('Cargadores y cables', TRUE, NULL),
    ('Accesorios', TRUE, NULL),
    ('Componentes para PC', TRUE, NULL)
ON CONFLICT (nombre) DO UPDATE
SET activa = TRUE,
    categoria_padre_id = NULL;

-- 3. Subcategorías (Patrón Composite)
-- 3.1 Subcategorías de "Periféricos"
INSERT INTO categoria (nombre, activa, categoria_padre_id) VALUES
    ('Teclados', TRUE, (SELECT id_categoria FROM categoria WHERE nombre = 'Periféricos')),
    ('Mouse', TRUE, (SELECT id_categoria FROM categoria WHERE nombre = 'Periféricos')),
    ('Audio', TRUE, (SELECT id_categoria FROM categoria WHERE nombre = 'Periféricos')),
    ('Cámaras', TRUE, (SELECT id_categoria FROM categoria WHERE nombre = 'Periféricos'))
ON CONFLICT (nombre) DO UPDATE
SET activa = TRUE,
    categoria_padre_id = EXCLUDED.categoria_padre_id;

-- 3.2 Subcategorías de "Componentes para PC"
INSERT INTO categoria (nombre, activa, categoria_padre_id) VALUES
    ('Procesadores', TRUE, (SELECT id_categoria FROM categoria WHERE nombre = 'Componentes para PC')),
    ('Memorias RAM', TRUE, (SELECT id_categoria FROM categoria WHERE nombre = 'Componentes para PC')),
    ('Almacenamiento', TRUE, (SELECT id_categoria FROM categoria WHERE nombre = 'Componentes para PC')),
    ('Tarjetas de video', TRUE, (SELECT id_categoria FROM categoria WHERE nombre = 'Componentes para PC'))
ON CONFLICT (nombre) DO UPDATE
SET activa = TRUE,
    categoria_padre_id = EXCLUDED.categoria_padre_id;

-- 4. 32 Productos del catálogo
INSERT INTO producto (sku, nombre, marca, categoria_id, descripcion, precio, precio_anterior, stock, nuevo, imagen, activo) VALUES
    ('PA-0001', 'Teclado mecánico 60% RGB Fizz K617', 'Redragon', (SELECT id_categoria FROM categoria WHERE nombre = 'Teclados'), 'Teclado mecánico compacto de 60% con iluminación RGB.', 169.00, 199.00, 14, TRUE, '/img/productos/teclado-redragon-k617.webp', TRUE),
    ('PA-0002', 'Teclado mecánico TKL G413 TKL SE', 'Logitech', (SELECT id_categoria FROM categoria WHERE nombre = 'Teclados'), 'Teclado mecánico sin teclado numérico para escritorio y gaming.', 289.00, NULL, 8, TRUE, '/img/productos/teclado-logitech-g413.webp', TRUE),
    ('PA-0003', 'Teclado inalámbrico multidispositivo K380', 'Logitech', (SELECT id_categoria FROM categoria WHERE nombre = 'Teclados'), 'Teclado compacto Bluetooth que se conecta a varios dispositivos.', 149.00, NULL, 22, FALSE, '/img/productos/teclado-logitech-k380.webp', TRUE),
    ('PA-0004', 'Teclado mecánico Alloy Origins Core', 'HyperX', (SELECT id_categoria FROM categoria WHERE nombre = 'Teclados'), 'Teclado mecánico TKL con estructura de aluminio e iluminación RGB.', 399.00, 459.00, 3, FALSE, '/img/productos/teclado-hyperx-alloy-origins-core.webp', TRUE),
    ('PA-0005', 'Mouse gamer G203 Lightsync', 'Logitech', (SELECT id_categoria FROM categoria WHERE nombre = 'Mouse'), 'Mouse con cable e iluminación RGB, ideal para juegos y oficina.', 89.00, NULL, 30, FALSE, '/img/productos/mouse-logitech-g203.webp', TRUE),
    ('PA-0006', 'Mouse inalámbrico M170', 'Logitech', (SELECT id_categoria FROM categoria WHERE nombre = 'Mouse'), 'Mouse inalámbrico compacto para uso diario.', 49.00, NULL, 45, FALSE, '/img/productos/mouse-logitech-m170.webp', TRUE),
    ('PA-0007', 'Mouse ergonómico vertical Lift', 'Logitech', (SELECT id_categoria FROM categoria WHERE nombre = 'Mouse'), 'Mouse vertical inalámbrico pensado para reducir la fatiga de la muñeca.', 229.00, NULL, 0, FALSE, '/img/productos/mouse-logitech-lift.webp', TRUE),
    ('PA-0008', 'Mouse gamer DeathAdder Essential', 'Razer', (SELECT id_categoria FROM categoria WHERE nombre = 'Mouse'), 'Mouse gamer con cable y diseño ergonómico.', 119.00, 139.00, 11, TRUE, '/img/productos/mouse-razer-deathadder-essential.webp', TRUE),
    ('PA-0009', 'Auriculares gamer Cloud Stinger Core', 'HyperX', (SELECT id_categoria FROM categoria WHERE nombre = 'Audio'), 'Auriculares con cable y micrófono para juegos y videollamadas.', 199.00, NULL, 9, FALSE, '/img/productos/auriculares-hyperx-cloud-stinger-core.webp', TRUE),
    ('PA-0010', 'Auriculares inalámbricos Tune 520BT', 'JBL', (SELECT id_categoria FROM categoria WHERE nombre = 'Audio'), 'Auriculares Bluetooth plegables para música y llamadas.', 189.00, 229.00, 17, TRUE, '/img/productos/auriculares-jbl-tune-520bt.webp', TRUE),
    ('PA-0011', 'Parlante Bluetooth portátil Go 4', 'JBL', (SELECT id_categoria FROM categoria WHERE nombre = 'Audio'), 'Parlante Bluetooth compacto para llevar a todas partes.', 159.00, NULL, 5, TRUE, '/img/productos/parlante-jbl-go-4.webp', TRUE),
    ('PA-0012', 'Webcam Full HD C920 HD Pro', 'Logitech', (SELECT id_categoria FROM categoria WHERE nombre = 'Cámaras'), 'Webcam 1080p con micrófono para videollamadas y clases virtuales.', 289.00, NULL, 12, FALSE, '/img/productos/webcam-logitech-c920.webp', TRUE),
    ('PA-0013', 'Webcam HD C270', 'Logitech', (SELECT id_categoria FROM categoria WHERE nombre = 'Cámaras'), 'Webcam 720p sencilla para reuniones y clases en línea.', 109.00, NULL, 25, FALSE, '/img/productos/webcam-logitech-c270.webp', TRUE),
    ('PA-0014', 'Webcam Full HD C922 Pro Stream', 'Logitech', (SELECT id_categoria FROM categoria WHERE nombre = 'Cámaras'), 'Webcam 1080p pensada para streaming y creación de contenido.', 359.00, NULL, 0, FALSE, '/img/productos/webcam-logitech-c922.webp', TRUE),
    ('PA-0015', 'Cargador de pared 20 W USB-C', 'Anker', (SELECT id_categoria FROM categoria WHERE nombre = 'Cargadores y cables'), 'Cargador compacto de carga rápida con puerto USB-C.', 59.00, NULL, 40, TRUE, '/img/productos/cargador-anker-20w.webp', TRUE),
    ('PA-0016', 'Cargador GaN 65 W de 3 puertos', 'Anker', (SELECT id_categoria FROM categoria WHERE nombre = 'Cargadores y cables'), 'Cargador GaN para laptop, celular y tablet al mismo tiempo.', 179.00, 209.00, 4, TRUE, '/img/productos/cargador-anker-65w-gan.webp', TRUE),
    ('PA-0017', 'Cable USB-C a USB-C de 1,8 m', 'Baseus', (SELECT id_categoria FROM categoria WHERE nombre = 'Cargadores y cables'), 'Cable de carga y datos reforzado de 1,8 metros.', 35.00, NULL, 60, FALSE, '/img/productos/cable-baseus-usbc-18m.webp', TRUE),
    ('PA-0018', 'Mousepad gamer XL 900x400 mm', 'Redragon', (SELECT id_categoria FROM categoria WHERE nombre = 'Accesorios'), 'Mousepad extendido con base antideslizante y bordes cosidos.', 59.00, NULL, 20, FALSE, '/img/productos/mousepad-redragon-xl.webp', TRUE),
    ('PA-0019', 'Hub USB-C 7 en 1', 'Baseus', (SELECT id_categoria FROM categoria WHERE nombre = 'Accesorios'), 'Hub con HDMI, puertos USB y lector de tarjetas para laptop.', 149.00, 179.00, 7, TRUE, '/img/productos/hub-baseus-7en1.webp', TRUE),
    ('PA-0020', 'Soporte de aluminio ajustable para laptop', 'Ugreen', (SELECT id_categoria FROM categoria WHERE nombre = 'Accesorios'), 'Soporte plegable que eleva la laptop y mejora la postura.', 79.00, NULL, 15, FALSE, '/img/productos/soporte-ugreen-laptop.webp', TRUE),
    ('PA-0021', 'Kit de limpieza para pantallas y teclados', 'Genérico', NULL, 'Kit con spray, paño de microfibra y cepillo.', 25.00, NULL, 18, FALSE, '/img/productos/kit-limpieza-pantallas.webp', TRUE),
    ('PA-0022', 'Procesador AMD Ryzen 5 5600', 'AMD', (SELECT id_categoria FROM categoria WHERE nombre = 'Procesadores'), 'Procesador de 6 núcleos para equipos de escritorio con socket AM4.', 549.00, NULL, 10, TRUE, '/img/productos/procesador-amd-ryzen-5-5600.webp', TRUE),
    ('PA-0023', 'Procesador Intel Core i5-12400F', 'Intel', (SELECT id_categoria FROM categoria WHERE nombre = 'Procesadores'), 'Procesador de 6 núcleos para socket LGA1700, requiere tarjeta de video dedicada.', 519.00, 589.00, 7, FALSE, '/img/productos/procesador-intel-i5-12400f.webp', TRUE),
    ('PA-0024', 'Procesador AMD Ryzen 7 5700X', 'AMD', (SELECT id_categoria FROM categoria WHERE nombre = 'Procesadores'), 'Procesador de 8 núcleos para equipos de escritorio con socket AM4.', 779.00, NULL, 6, TRUE, '/img/productos/procesador-amd-ryzen-7-5700x.webp', TRUE),
    ('PA-0025', 'Memoria RAM Fury Beast 16 GB DDR4 3200 MHz', 'Kingston', (SELECT id_categoria FROM categoria WHERE nombre = 'Memorias RAM'), 'Módulo de memoria DDR4 para equipos de escritorio.', 175.00, NULL, 28, FALSE, '/img/productos/ram-kingston-fury-beast-16gb-ddr4.webp', TRUE),
    ('PA-0026', 'Kit de memoria RAM Vengeance LPX 16 GB (2x8) DDR4 3200 MHz', 'Corsair', (SELECT id_categoria FROM categoria WHERE nombre = 'Memorias RAM'), 'Kit de dos módulos DDR4 con disipador de bajo perfil.', 215.00, NULL, 12, FALSE, '/img/productos/ram-corsair-vengeance-lpx-16gb.webp', TRUE),
    ('PA-0027', 'Memoria RAM Fury Beast 16 GB DDR5 5200 MHz', 'Kingston', (SELECT id_categoria FROM categoria WHERE nombre = 'Memorias RAM'), 'Módulo de memoria DDR5 para plataformas de nueva generación.', 289.00, 339.00, 5, TRUE, '/img/productos/ram-kingston-fury-beast-16gb-ddr5.webp', TRUE),
    ('PA-0028', 'SSD NV2 1 TB NVMe M.2', 'Kingston', (SELECT id_categoria FROM categoria WHERE nombre = 'Almacenamiento'), 'Unidad de estado sólido NVMe para arranque rápido y carga de juegos.', 279.00, NULL, 19, TRUE, '/img/productos/ssd-kingston-nv2-1tb.webp', TRUE),
    ('PA-0029', 'SSD Blue SA510 500 GB SATA', 'Western Digital', (SELECT id_categoria FROM categoria WHERE nombre = 'Almacenamiento'), 'Unidad de estado sólido SATA de 2,5 pulgadas para renovar equipos antiguos.', 189.00, NULL, 24, FALSE, '/img/productos/ssd-wd-blue-sa510-500gb.webp', TRUE),
    ('PA-0030', 'Disco duro BarraCuda 2 TB', 'Seagate', (SELECT id_categoria FROM categoria WHERE nombre = 'Almacenamiento'), 'Disco duro interno de 3,5 pulgadas para almacenamiento masivo.', 319.00, NULL, 9, FALSE, '/img/productos/hdd-seagate-barracuda-2tb.webp', TRUE),
    ('PA-0031', 'Tarjeta de video GeForce RTX 4060 Dual 8 GB', 'ASUS', (SELECT id_categoria FROM categoria WHERE nombre = 'Tarjetas de video'), 'Tarjeta gráfica de 8 GB para juegos en 1080p.', 1449.00, NULL, 3, TRUE, '/img/productos/gpu-asus-rtx-4060-dual.webp', TRUE),
    ('PA-0032', 'Tarjeta de video Radeon RX 7600 Pulse 8 GB', 'Sapphire', (SELECT id_categoria FROM categoria WHERE nombre = 'Tarjetas de video'), 'Tarjeta gráfica de 8 GB para juegos en 1080p.', 1149.00, 1299.00, 4, FALSE, '/img/productos/gpu-sapphire-rx-7600-pulse.webp', TRUE)
ON CONFLICT (sku) DO UPDATE
SET nombre = EXCLUDED.nombre,
    marca = EXCLUDED.marca,
    categoria_id = EXCLUDED.categoria_id,
    descripcion = EXCLUDED.descripcion,
    precio = EXCLUDED.precio,
    precio_anterior = EXCLUDED.precio_anterior,
    stock = EXCLUDED.stock,
    nuevo = EXCLUDED.nuevo,
    imagen = EXCLUDED.imagen,
    activo = EXCLUDED.activo;

-- 5. Registrar movimiento de inventario inicial para los productos que aún no tengan historial
INSERT INTO movimiento_inventario (producto_id, tipo, cantidad_firmada, motivo)
SELECT p.id, 'ENTRADA', p.stock, 'Carga de inventario inicial demo Píxel Andino'
FROM producto p
WHERE p.sku LIKE 'PA-%'
  AND p.stock > 0
  AND NOT EXISTS (
      SELECT 1 FROM movimiento_inventario m WHERE m.producto_id = p.id
  );

COMMIT;
