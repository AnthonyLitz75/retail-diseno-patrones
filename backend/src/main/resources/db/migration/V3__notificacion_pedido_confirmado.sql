-- Spec 005 (Observer): el observador in-app también avisa cuando se confirma un pedido.
-- La restricción de V2 no admitía el estado inicial PENDIENTE, por eso hasta ahora la
-- compra no generaba alerta en la campana del cliente.

ALTER TABLE notificacion
    DROP CONSTRAINT IF EXISTS notificacion_estado_check;

ALTER TABLE notificacion
    ADD CONSTRAINT notificacion_estado_check
    CHECK (estado IN (
        'PENDIENTE', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO',
        'RECLAMO_REGISTRADO', 'RECLAMO_RESPONDIDO', 'RECLAMO_ESCALADO', 'RECLAMO_RESUELTO',
        'DEVOLUCION_SOLICITADA', 'DEVOLUCION_APROBADA', 'DEVOLUCION_RECHAZADA', 'DEVOLUCION_CERRADA'
    ));
