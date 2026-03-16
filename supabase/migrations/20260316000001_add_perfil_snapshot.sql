-- Snapshot del perfil al momento de crear el plan
-- Permite mostrar las métricas originales aunque el perfil cambie después
ALTER TABLE public.planes
  ADD COLUMN IF NOT EXISTS perfil_snapshot jsonb;
