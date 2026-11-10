-- Habilita la auditoría necesaria para cancelar pedidos pendientes.
-- Ejecutar después del esquema base; esta migración es segura para volver a ejecutar.
-- No aplicarla a producción sin respaldo y validación previa.
BEGIN;

DO $$
DECLARE
    restriccion RECORD;
BEGIN
    FOR restriccion IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.movimiento_inventario'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%tipo%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.movimiento_inventario DROP CONSTRAINT %I',
            restriccion.conname);
    END LOOP;

    ALTER TABLE public.movimiento_inventario
        ADD CONSTRAINT ck_movimiento_inventario_tipo
        CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'CANCELACION'));
END $$;

DO $$
DECLARE
    restriccion RECORD;
BEGIN
    FOR restriccion IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.pago'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%estado%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.pago DROP CONSTRAINT %I', restriccion.conname);
    END LOOP;

    ALTER TABLE public.pago
        ADD CONSTRAINT ck_pago_estado
        CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REVERSADO'));
END $$;

COMMIT;
