# SPEC-006: Portales Frontend Completos y Cierre de Interfaz

## 1. Visión General
Consolidar la interfaz web completa del sistema de acuerdo al mapa de pantallas definido en el capítulo 7 de la guía técnica, organizando portales limpios y responsivos con Bootstrap 5 y Vanilla JavaScript modular para los 5 actores: Cliente, Vendedor, Almacén, Soporte y Administrador.

- **Requerimientos Guía:** RF01 al RF28 (Capa de Presentación e Interacción).
- **Actores:** Todos los actores del sistema.

---

## 2. Portales y Pantallas

### 1. Portal del Cliente
- Visualización de tracking de envíos con estados e insignias visuales.
- Pestaña de atención al cliente: mis preguntas formuladas, mis reclamos y mis devoluciones con sus estados y respuestas.
- Campana de notificaciones interactiva en el navbar.

### 2. Portal de Almacén (`/almacen`)
- Formulario de entrada de mercadería (lotes de hasta 100 productos con motivo).
- Explorador del Kardex de inventario con filtros por fecha y producto.
- Panel de preparación de pedidos: marcar pedido "En Preparación", "Despachado" (con modal para transportista y tracking) y "Entregado".

### 3. Portal de Vendedor (`/vendedor`)
- Formulario de alta y edición de productos con carga/URL de imagen y stock de apertura.
- Ajuste rápido de stock con motivo obligatorio.
- Bandeja de preguntas de clientes pendientes de respuesta.

### 4. Portal de Soporte (`/soporte`)
- Bandeja de reclamos abiertos: asignarse atención, responder y resolver o escalar.
- Bandeja de devoluciones: evaluar solicitud, registrar recepción física (desmarcando ítems rotos) y cerrar con reembolso.

### 5. Portal de Administración (`/admin`)
- Gestión de usuarios y roles con prevención de autodesactivación y retiro del último admin.
- Gestión de categorías maestras.
- Panel de reportes con filtros de fecha y exportación de tablas en CSV.
- Bandeja de incidencias escaladas por soporte para resolución definitiva.

---

## 3. Principios de UX y Accesibilidad (WCAG)
- Etiquetas claras en todos los campos de formulario.
- Retroalimentación inmediata con loaders accesibles y toasts informativos.
- Manejo limpio de errores HTTP (400, 401, 403, 404, 409) mostrando mensajes comprensibles al usuario.
- Diseño totalmente adaptable para escritorio, tablet y vista móvil sin frameworks externos.
