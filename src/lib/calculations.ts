import type { NivelActividad, Objetivo, RespuestasActividad } from '../types'

// ─── Factores de actividad ───────────────────────────────────────────────────

const FACTORES_ACTIVIDAD: Record<NivelActividad, number> = {
  sedentario: 1.2,
  ligeramente_activo: 1.375,
  moderadamente_activo: 1.55,
  muy_activo: 1.725,
  extremadamente_activo: 1.9,
}

// ─── Distribución de macros por objetivo ────────────────────────────────────

const MACROS_OBJETIVO: Record<Objetivo, { proteina: number; carbs: number; grasas: number }> = {
  bajar_peso:     { proteina: 0.30, carbs: 0.35, grasas: 0.35 },
  ganar_musculo:  { proteina: 0.30, carbs: 0.50, grasas: 0.20 },
  mantenimiento:  { proteina: 0.25, carbs: 0.50, grasas: 0.25 },
  digestiva:      { proteina: 0.25, carbs: 0.50, grasas: 0.25 },
}

// ─── Fórmula Mifflin-St Jeor ─────────────────────────────────────────────────

/**
 * Calcula la Tasa Metabólica Basal usando Mifflin-St Jeor.
 */
export function calcularTMB(
  peso_kg: number,
  estatura_cm: number,
  edad: number,
  sexo: 'masculino' | 'femenino',
): number {
  const base = 10 * peso_kg + 6.25 * estatura_cm - 5 * edad
  return sexo === 'masculino' ? base + 5 : base - 161
}

// ─── TDEE ────────────────────────────────────────────────────────────────────

/**
 * Calcula el Total Daily Energy Expenditure.
 */
export function calcularTDEE(tmb: number, nivelActividad: NivelActividad): number {
  return Math.round(tmb * FACTORES_ACTIVIDAD[nivelActividad])
}

// ─── Calorías objetivo ────────────────────────────────────────────────────────

const AJUSTE_CALORICO: Record<Objetivo, number> = {
  bajar_peso:    -500,
  ganar_musculo: +300,
  mantenimiento: 0,
  digestiva:     0,
}

/**
 * Ajusta el TDEE promediando los ajustes de todos los objetivos seleccionados.
 * Ej: bajar_peso (-500) + ganar_musculo (+300) → promedio -100 (recomposición leve).
 */
export function calcularCaloriasObjetivo(tdee: number, objetivos: Objetivo[]): number {
  const ajuste = objetivos.reduce((sum, o) => sum + AJUSTE_CALORICO[o], 0) / objetivos.length
  return Math.round(tdee + ajuste)
}

// ─── Macros ───────────────────────────────────────────────────────────────────

/**
 * Distribuye las calorías objetivo en gramos de macronutrientes.
 * Con múltiples objetivos promedia las proporciones de cada uno.
 * Proteína y carbohidratos: 4 kcal/g | Grasas: 9 kcal/g
 */
export function calcularMacros(
  caloriasObjetivo: number,
  objetivos: Objetivo[],
): { proteina_g: number; carbohidratos_g: number; grasas_g: number } {
  const n = objetivos.length
  const proteina = objetivos.reduce((s, o) => s + MACROS_OBJETIVO[o].proteina, 0) / n
  const carbs    = objetivos.reduce((s, o) => s + MACROS_OBJETIVO[o].carbs, 0) / n
  const grasas   = objetivos.reduce((s, o) => s + MACROS_OBJETIVO[o].grasas, 0) / n
  return {
    proteina_g:       Math.round((caloriasObjetivo * proteina) / 4),
    carbohidratos_g:  Math.round((caloriasObjetivo * carbs) / 4),
    grasas_g:         Math.round((caloriasObjetivo * grasas) / 9),
  }
}

// ─── Deducción de nivel de actividad ─────────────────────────────────────────

/**
 * Asigna un nivel de actividad basándose en las respuestas del cuestionario.
 * Usa un sistema de puntos ponderado.
 */
export function deducirNivelActividad(
  r: Partial<RespuestasActividad>,
): { nivel: NivelActividad; explicacion: string } {
  let puntos = 0

  // Días de ejercicio (0-7) → 0-3 puntos
  const dias = r.dias_ejercicio ?? 0
  if (dias === 0) puntos += 0
  else if (dias <= 2) puntos += 1
  else if (dias <= 4) puntos += 2
  else puntos += 3

  // Duración de sesión → 0-2 puntos
  const duracion = r.duracion_sesion ?? 0
  if (duracion < 30) puntos += 0
  else if (duracion < 60) puntos += 1
  else puntos += 2

  // Tipo de trabajo → 0-3 puntos
  switch (r.tipo_trabajo) {
    case 'sedentario': puntos += 0; break
    case 'de_pie':     puntos += 1; break
    case 'moderado':   puntos += 2; break
    case 'intenso':    puntos += 3; break
  }

  // Actividad diaria → 0-2 puntos
  switch (r.actividad_diaria) {
    case 'carro':           puntos += 0; break
    case 'camino_poco':     puntos += 1; break
    case 'camino_bastante': puntos += 2; break
    case 'muy_activo':      puntos += 2; break
  }

  // Actividad recreativa → 0-1 punto
  switch (r.actividad_recreativa) {
    case 'nunca':        puntos += 0; break
    case 'a_veces':      puntos += 0; break
    case 'frecuente':    puntos += 1; break
    case 'muy_frecuente': puntos += 1; break
  }

  // Mapear puntos (0-11) a niveles
  if (puntos <= 1) {
    return {
      nivel: 'sedentario',
      explicacion: 'Tu estilo de vida es mayormente sedentario, con poca o ninguna actividad física regular.',
    }
  } else if (puntos <= 3) {
    return {
      nivel: 'ligeramente_activo',
      explicacion: 'Realizas actividad física leve 1-3 días a la semana o tienes un trabajo que implica algo de movimiento.',
    }
  } else if (puntos <= 6) {
    return {
      nivel: 'moderadamente_activo',
      explicacion: 'Haces ejercicio de forma regular 3-5 días a la semana con sesiones de duración moderada.',
    }
  } else if (puntos <= 9) {
    return {
      nivel: 'muy_activo',
      explicacion: 'Tienes un nivel de actividad alto, entrenando intensamente la mayoría de los días o con un trabajo físicamente demandante.',
    }
  } else {
    return {
      nivel: 'extremadamente_activo',
      explicacion: 'Tu nivel de actividad es excepcional: entrenamiento diario intenso y/o trabajo físico muy exigente.',
    }
  }
}
