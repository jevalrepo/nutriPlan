// ─── Enums ──────────────────────────────────────────────────────────────────

export type NivelActividad =
  | 'sedentario'
  | 'ligeramente_activo'
  | 'moderadamente_activo'
  | 'muy_activo'
  | 'extremadamente_activo'

export type Objetivo =
  | 'bajar_peso'
  | 'ganar_musculo'
  | 'mantenimiento'
  | 'digestiva'

export type RestriccionAlimenticia =
  | 'vegano'
  | 'vegetariano'
  | 'sin_gluten'
  | 'sin_lactosa'
  | 'sin_azucar'
  | 'keto'
  | 'otras'

export type TipoComida = 'desayuno' | 'comida' | 'cena' | 'snack'

export type FuenteAlimento = 'open_food_facts' | 'claude_estimado' | 'escaner_etiqueta'

export type TipoPlan = 'semanal' | 'mensual'

// ─── Perfil de usuario ───────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  user_id: string
  nombre: string | null
  peso_kg: number
  estatura_cm: number
  edad: number
  sexo: 'masculino' | 'femenino'
  objetivos: Objetivo[]
  nivel_actividad: NivelActividad
  restricciones: RestriccionAlimenticia[]
  restricciones_otras: string | null
  tdee: number
  calorias_objetivo: number
  proteina_g: number
  carbohidratos_g: number
  grasas_g: number
  created_at: string
  updated_at: string
}

// ─── Métricas calculadas ─────────────────────────────────────────────────────

export interface MetricasCalculadas {
  tmb: number
  tdee: number
  calorias_objetivo: number
  proteina_g: number
  carbohidratos_g: number
  grasas_g: number
}

// ─── Ingrediente de receta ────────────────────────────────────────────────────

export interface IngredienteReceta {
  nombre: string
  porcion_g: number           // siempre en gramos (base de cálculo)
  unidad?: 'g' | 'ml' | 'cantidad'
  cantidad?: number           // cuando unidad='cantidad': número de unidades (ej: 3 fresas)
  gramos_por_unidad?: number  // cuando unidad='cantidad': gramos que pesa 1 unidad (ej: 33g)
  calorias: number
  proteina_g: number
  carbohidratos_g: number
  grasas_g: number
  grasas_saturadas_g: number
  fibra_g: number
  sodio_mg: number
  azucar_g: number
  colesterol_mg: number
  calcio_mg: number
  hierro_mg: number
  vitamina_c_mg: number
  vitamina_d_ug: number
  // Guardado para recalcular proporcionalmente al cambiar porción
  _per100g?: {
    calorias: number; proteina_g: number; carbohidratos_g: number; grasas_g: number
    grasas_saturadas_g: number; fibra_g: number; sodio_mg: number; azucar_g: number
    colesterol_mg: number; calcio_mg: number; hierro_mg: number
    vitamina_c_mg: number; vitamina_d_ug: number
  }
}

// ─── Plan alimenticio ────────────────────────────────────────────────────────

export interface PerfilSnapshot {
  sexo: 'masculino' | 'femenino'
  edad: number
  objetivos: Objetivo[]
  calorias_objetivo: number
  restricciones: RestriccionAlimenticia[]
}

export interface Plan {
  id: string
  user_id: string
  nombre: string
  tipo: TipoPlan
  objetivos: Objetivo[]
  fecha_inicio: string
  fecha_fin: string
  created_at: string
  perfil_snapshot?: PerfilSnapshot | null
}

export interface PlanDia {
  id: string
  plan_id: string
  fecha: string
  dia_numero: number
}

export interface Comida {
  id: string
  dia_id: string
  tipo: TipoComida
  orden: number
  alimentos?: Alimento[]
}

export interface Alimento {
  id: string
  comida_id: string
  nombre: string
  porcion_g: number
  calorias: number
  proteina_g: number
  carbohidratos_g: number
  grasas_g: number
  grasas_saturadas_g: number
  fibra_g: number
  sodio_mg: number
  azucar_g: number
  colesterol_mg: number
  calcio_mg: number
  hierro_mg: number
  vitamina_c_mg: number
  vitamina_d_ug: number
  fuente: FuenteAlimento
  porcion_unidad?: 'g' | 'ml' | 'cantidad'
  porcion_cantidad?: number | null           // cuando porcion_unidad='cantidad'
  porcion_gramos_por_unidad?: number | null  // cuando porcion_unidad='cantidad'
  ingredientes?: IngredienteReceta[] | null
}

// ─── Nutrientes DRI ──────────────────────────────────────────────────────────

export interface DRIValues {
  calorias: number
  proteina_g: number
  carbohidratos_g: number
  grasas_g: number
  grasas_saturadas_g: number
  fibra_g: number
  sodio_mg: number
  azucar_g: number
  colesterol_mg: number
  calcio_mg: number
  hierro_mg: number
  vitamina_c_mg: number
  vitamina_d_ug: number
}

export interface NutrienteItem {
  key: keyof DRIValues
  label: string
  unidad: string
  actual: number
  recomendado: number
}

export interface NutrienteSummary {
  nutrientes: NutrienteItem[]
  total_calorias: number
}

// ─── Notificaciones ──────────────────────────────────────────────────────────

export type ToastTipo = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  tipo: ToastTipo
  mensaje: string
  duracion?: number
}

export interface ModalConfig {
  titulo: string
  descripcion: string
  labelConfirmar?: string
  labelCancelar?: string
  variante?: 'danger' | 'default'
  onConfirmar: () => void
}

// ─── Estado del onboarding ───────────────────────────────────────────────────

export interface OnboardingData {
  // Paso 1
  peso_kg: string
  estatura_cm: string
  edad: string
  sexo: 'masculino' | 'femenino' | ''
  // Paso 2
  objetivos: Objetivo[]
  // Paso 3
  restricciones: RestriccionAlimenticia[]
  restricciones_otras: string
  // Paso 4
  nivel_actividad: NivelActividad | ''
  modo_actividad: 'manual' | 'cuestionario'
}

// ─── Respuestas del cuestionario de actividad ────────────────────────────────

export interface RespuestasActividad {
  dias_ejercicio: number | null          // 0-7 días/semana
  tipo_actividad: string                 // descripción libre
  duracion_sesion: number | null         // minutos
  tipo_trabajo: 'sedentario' | 'de_pie' | 'moderado' | 'intenso' | null
  actividad_diaria: 'carro' | 'camino_poco' | 'camino_bastante' | 'muy_activo' | null
  actividad_recreativa: 'nunca' | 'a_veces' | 'frecuente' | 'muy_frecuente' | null
  condicion_limitante: string
}
