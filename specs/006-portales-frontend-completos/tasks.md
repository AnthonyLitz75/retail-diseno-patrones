# TASKS: Portales Frontend Completos

## Fase 1: Consolidación de Navegación y Sesión
- [ ] **T01:** En `frontend/src/api/api.js`, verificar manejo estandarizado de respuestas 401 (redirección a login) y 403 (alerta de permisos).
- [ ] **T02:** En el navbar principal de `index.html`, renderizar dinámicamente pestañas o enlaces a los paneles según el rol del usuario autenticado.

## Fase 2: Implementación de Portales por Rol
- [ ] **T03:** Implementar portal de Cliente: vista de seguimiento con tracking y acordeón de soporte en `frontend/src/cliente/`.
- [ ] **T04:** Implementar portal de Almacén: formulario de lotes y modal de tracking al despachar en `frontend/src/almacen/`.
- [ ] **T05:** Implementar portal de Vendedor: gestión de catálogo y respuestas de preguntas en `frontend/src/vendedor/`.
- [ ] **T06:** Implementar portal de Soporte: atención de reclamos y flujo de recepción de devoluciones en `frontend/src/soporte/`.
- [ ] **T07:** Implementar portal de Administración: pestaña de incidencias escaladas y reportes CSV en `frontend/src/administracion/`.

## Fase 3: Verificación y Accesibilidad
- [ ] **T08:** Comprobar navegación por teclado (tabulación y foco visible) en todos los modales.
- [ ] **T09:** Validar compilación exitosa mediante `npm run build` en el directorio `frontend/`.
- [ ] **T10:** Comprobar visualización adaptable en viewport móvil y de escritorio.
