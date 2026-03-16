-- Actualizar CHECK de porcion_unidad para incluir 'cantidad'
ALTER TABLE public.alimentos
  DROP CONSTRAINT IF EXISTS alimentos_porcion_unidad_check;

ALTER TABLE public.alimentos
  ADD CONSTRAINT alimentos_porcion_unidad_check
  CHECK (porcion_unidad IN ('g', 'ml', 'cantidad'));

-- Campos auxiliares para el modo "cantidad"
-- porcion_cantidad: cuántas unidades (ej: 2 huevos)
-- porcion_gramos_por_unidad: cuántos gramos pesa 1 unidad (ej: 55g por huevo)
ALTER TABLE public.alimentos
  ADD COLUMN IF NOT EXISTS porcion_cantidad numeric(6, 1),
  ADD COLUMN IF NOT EXISTS porcion_gramos_por_unidad numeric(7, 2);
