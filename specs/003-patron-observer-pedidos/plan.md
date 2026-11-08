# PLAN TÉCNICO: Patrón Observer en Eventos de Pedido

## 1. Arquitectura del Patrón
Paquete objetivo: `com.grupo.retail.patterns.observer`

```text
┌────────────────────────────────────────────────────────┐
│                     <<interface>>                      │
│                    ObservadorPedido                    │
├────────────────────────────────────────────────────────┤
│ + alCambiarEstadoTransaccional(EventoPedido, Con): void│
│ + alConfirmarCommit(EventoPedido): void                │
└────────────────────────────────────────────────────────┘
                           ▲
          ┌────────────────┴────────────────┐
          │                                 │
┌───────────────────────────┐   ┌───────────────────────────┐
│ NotificadorInAppObservador│   │ AuditoriaConsolaObservador│
└───────────────────────────┘   └───────────────────────────┘
```

- **Sujeto:** `PublicadorEventosPedido` administrado como componente de Spring o instanciado por `PedidoService`.
- **Integración con Factory Method:** `NotificadorInAppObservador` utiliza las fábricas del patrón Factory Method ya implementadas en el proyecto.

---

## 2. Contratos de API REST

### 1. Marcar Notificación como Leída
- **Ruta:** `PATCH /api/notificaciones/{id}/leida`
- **Permiso:** `CLIENTE` propietario
- **Respuesta (200 OK):** Notificación actualizada.

### 2. Listar Mis Notificaciones (Ya existente, integración completa)
- **Ruta:** `GET /api/notificaciones/mias`
- **Permiso:** `CLIENTE`
