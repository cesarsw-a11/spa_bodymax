-- No-op: este archivo existía con SQL que debía ejecutarse *después* de crear `ServiceVariant`.
-- El orden por timestamp hacía que corriera antes que `20260329120000_service_variants` y fallaba en producción (P3009).
-- Los cambios reales están en `20260329120001_booking_variant_fk_enums`.
SELECT 1;
