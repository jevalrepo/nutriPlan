-- Agregar columna ingredientes (JSONB) a la tabla alimentos
ALTER TABLE public.alimentos
  ADD COLUMN IF NOT EXISTS ingredientes jsonb;

-- Corregir el CHECK constraint de fuente para incluir 'escaner_etiqueta'
ALTER TABLE public.alimentos
  DROP CONSTRAINT IF EXISTS alimentos_fuente_check;

ALTER TABLE public.alimentos
  ADD CONSTRAINT alimentos_fuente_check
  CHECK (fuente IN ('open_food_facts', 'claude_estimado', 'escaner_etiqueta'));
