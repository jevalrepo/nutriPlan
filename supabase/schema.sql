-- ============================================================
-- NutriPlan — Schema SQL
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── Extensión UUID ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tabla: profiles ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nombre              text,
  peso_kg             numeric(5, 1) NOT NULL,
  estatura_cm         numeric(5, 1) NOT NULL,
  edad                integer NOT NULL CHECK (edad BETWEEN 16 AND 120),
  sexo                text NOT NULL CHECK (sexo IN ('masculino', 'femenino')),
  objetivos           text[] NOT NULL DEFAULT '{}',
  nivel_actividad     text NOT NULL CHECK (nivel_actividad IN (
                        'sedentario', 'ligeramente_activo', 'moderadamente_activo',
                        'muy_activo', 'extremadamente_activo'
                      )),
  restricciones       text[] DEFAULT '{}',
  restricciones_otras text,
  tdee                numeric(7, 2) NOT NULL,
  calorias_objetivo   numeric(7, 2) NOT NULL,
  proteina_g          numeric(6, 1) NOT NULL,
  carbohidratos_g     numeric(6, 1) NOT NULL,
  grasas_g            numeric(6, 1) NOT NULL,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL
);

-- ─── Tabla: planes ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.planes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre        text NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('semanal', 'mensual')),
  objetivos     text[] NOT NULL DEFAULT '{}',
  fecha_inicio  date NOT NULL,
  fecha_fin     date NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- ─── Tabla: plan_dias ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.plan_dias (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id     uuid REFERENCES public.planes(id) ON DELETE CASCADE NOT NULL,
  fecha       date NOT NULL,
  dia_numero  integer NOT NULL CHECK (dia_numero >= 1)
);

-- ─── Tabla: comidas ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.comidas (
  id      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dia_id  uuid REFERENCES public.plan_dias(id) ON DELETE CASCADE NOT NULL,
  tipo    text NOT NULL CHECK (tipo IN ('desayuno', 'comida', 'cena', 'snack')),
  orden   integer NOT NULL DEFAULT 0
);

-- ─── Tabla: alimentos ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.alimentos (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comida_id           uuid REFERENCES public.comidas(id) ON DELETE CASCADE NOT NULL,
  nombre              text NOT NULL,
  porcion_g           numeric(7, 1) NOT NULL,
  calorias            numeric(7, 1) NOT NULL DEFAULT 0,
  proteina_g          numeric(6, 2) NOT NULL DEFAULT 0,
  carbohidratos_g     numeric(6, 2) NOT NULL DEFAULT 0,
  grasas_g            numeric(6, 2) NOT NULL DEFAULT 0,
  grasas_saturadas_g  numeric(6, 2) NOT NULL DEFAULT 0,
  fibra_g             numeric(6, 2) NOT NULL DEFAULT 0,
  sodio_mg            numeric(7, 1) NOT NULL DEFAULT 0,
  azucar_g            numeric(6, 2) NOT NULL DEFAULT 0,
  colesterol_mg       numeric(7, 1) NOT NULL DEFAULT 0,
  calcio_mg           numeric(7, 1) NOT NULL DEFAULT 0,
  hierro_mg           numeric(6, 2) NOT NULL DEFAULT 0,
  vitamina_c_mg       numeric(6, 2) NOT NULL DEFAULT 0,
  vitamina_d_ug       numeric(6, 2) NOT NULL DEFAULT 0,
  fuente              text NOT NULL DEFAULT 'claude_estimado' CHECK (fuente IN ('open_food_facts', 'claude_estimado', 'escaner_etiqueta')),
  porcion_unidad             text NOT NULL DEFAULT 'g' CHECK (porcion_unidad IN ('g', 'ml', 'cantidad')),
  porcion_cantidad           numeric(6, 1),
  porcion_gramos_por_unidad  numeric(7, 2),
  ingredientes               jsonb
);

-- ─── Índices ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_planes_user_id       ON public.planes(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_dias_plan_id    ON public.plan_dias(plan_id);
CREATE INDEX IF NOT EXISTS idx_comidas_dia_id       ON public.comidas(dia_id);
CREATE INDEX IF NOT EXISTS idx_alimentos_comida_id  ON public.alimentos(comida_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_dias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comidas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alimentos  ENABLE ROW LEVEL SECURITY;

-- Profiles: solo el propio usuario
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Planes: solo el dueño
CREATE POLICY "planes_select_own" ON public.planes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "planes_insert_own" ON public.planes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "planes_update_own" ON public.planes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "planes_delete_own" ON public.planes
  FOR DELETE USING (auth.uid() = user_id);

-- Plan_dias: acceso a través de planes del usuario
CREATE POLICY "plan_dias_select_own" ON public.plan_dias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.planes p
      WHERE p.id = plan_dias.plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_dias_insert_own" ON public.plan_dias
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.planes p
      WHERE p.id = plan_dias.plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_dias_update_own" ON public.plan_dias
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.planes p
      WHERE p.id = plan_dias.plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_dias_delete_own" ON public.plan_dias
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.planes p
      WHERE p.id = plan_dias.plan_id AND p.user_id = auth.uid()
    )
  );

-- Comidas: acceso a través de plan_dias → planes del usuario
CREATE POLICY "comidas_select_own" ON public.comidas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plan_dias pd
      JOIN public.planes p ON p.id = pd.plan_id
      WHERE pd.id = comidas.dia_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "comidas_insert_own" ON public.comidas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_dias pd
      JOIN public.planes p ON p.id = pd.plan_id
      WHERE pd.id = comidas.dia_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "comidas_update_own" ON public.comidas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.plan_dias pd
      JOIN public.planes p ON p.id = pd.plan_id
      WHERE pd.id = comidas.dia_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "comidas_delete_own" ON public.comidas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.plan_dias pd
      JOIN public.planes p ON p.id = pd.plan_id
      WHERE pd.id = comidas.dia_id AND p.user_id = auth.uid()
    )
  );

-- Alimentos: acceso a través de comidas → plan_dias → planes del usuario
CREATE POLICY "alimentos_select_own" ON public.alimentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.comidas c
      JOIN public.plan_dias pd ON pd.id = c.dia_id
      JOIN public.planes p ON p.id = pd.plan_id
      WHERE c.id = alimentos.comida_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "alimentos_insert_own" ON public.alimentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comidas c
      JOIN public.plan_dias pd ON pd.id = c.dia_id
      JOIN public.planes p ON p.id = pd.plan_id
      WHERE c.id = alimentos.comida_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "alimentos_update_own" ON public.alimentos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.comidas c
      JOIN public.plan_dias pd ON pd.id = c.dia_id
      JOIN public.planes p ON p.id = pd.plan_id
      WHERE c.id = alimentos.comida_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "alimentos_delete_own" ON public.alimentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.comidas c
      JOIN public.plan_dias pd ON pd.id = c.dia_id
      JOIN public.planes p ON p.id = pd.plan_id
      WHERE c.id = alimentos.comida_id AND p.user_id = auth.uid()
    )
  );

-- ─── Trigger: actualizar updated_at en profiles ──────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
