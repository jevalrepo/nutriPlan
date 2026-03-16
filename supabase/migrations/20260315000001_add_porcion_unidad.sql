-- Agregar columna de unidad de porción a la tabla alimentos
ALTER TABLE public.alimentos
  ADD COLUMN IF NOT EXISTS porcion_unidad text NOT NULL DEFAULT 'g'
  CHECK (porcion_unidad IN ('g', 'ml'));
