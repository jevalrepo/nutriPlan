import type { DRIValues, Objetivo, RestriccionAlimenticia } from '../types'

/**
 * Dietary Reference Intakes (DRI) basados en estándares IOM/USDA.
 * Los valores se adaptan por sexo, rango de edad, objetivos y restricciones.
 */
export function getDRI(
  sexo: 'masculino' | 'femenino',
  edad: number,
  objetivos: Objetivo[],
  caloriasObjetivo: number,
  restricciones: RestriccionAlimenticia[] = [],
): DRIValues {
  const esMayor = edad >= 50

  // ─── Base por sexo y edad ────────────────────────────────────────────────

  const base: DRIValues = sexo === 'masculino'
    ? {
        calorias:           caloriasObjetivo,
        proteina_g:         esMayor ? 56  : 56,
        carbohidratos_g:    esMayor ? 130 : 130,
        grasas_g:           Math.round(caloriasObjetivo * 0.30 / 9),
        grasas_saturadas_g: Math.round(caloriasObjetivo * 0.10 / 9),
        fibra_g:            esMayor ? 30  : 38,
        sodio_mg:           2300,
        azucar_g:           50,
        colesterol_mg:      300,
        calcio_mg:          esMayor ? 1200 : 1000,
        hierro_mg:          8,
        vitamina_c_mg:      90,
        vitamina_d_ug:      esMayor ? 20  : 15,
      }
    : {
        calorias:           caloriasObjetivo,
        proteina_g:         esMayor ? 46  : 46,
        carbohidratos_g:    esMayor ? 130 : 130,
        grasas_g:           Math.round(caloriasObjetivo * 0.30 / 9),
        grasas_saturadas_g: Math.round(caloriasObjetivo * 0.10 / 9),
        fibra_g:            esMayor ? 21  : 25,
        sodio_mg:           2300,
        azucar_g:           50,
        colesterol_mg:      300,
        calcio_mg:          esMayor ? 1200 : 1000,
        hierro_mg:          esMayor ? 8   : 18,
        vitamina_c_mg:      75,
        vitamina_d_ug:      esMayor ? 20  : 15,
      }

  // ─── Macros calculados desde calorías objetivo (consistente con calcularMacros) ──

  const PROT_PCT: Record<Objetivo, number> = { bajar_peso: 0.30, ganar_musculo: 0.30, mantenimiento: 0.25, digestiva: 0.25 }
  const CARB_PCT: Record<Objetivo, number> = { bajar_peso: 0.35, ganar_musculo: 0.50, mantenimiento: 0.50, digestiva: 0.50 }
  const FAT_PCT:  Record<Objetivo, number> = { bajar_peso: 0.35, ganar_musculo: 0.20, mantenimiento: 0.25, digestiva: 0.25 }

  if (objetivos.length > 0) {
    const avgProt = objetivos.reduce((s, o) => s + PROT_PCT[o], 0) / objetivos.length
    const avgCarb = objetivos.reduce((s, o) => s + CARB_PCT[o], 0) / objetivos.length
    const avgFat  = objetivos.reduce((s, o) => s + FAT_PCT[o],  0) / objetivos.length
    base.proteina_g      = Math.round(caloriasObjetivo * avgProt / 4)
    base.carbohidratos_g = Math.round(caloriasObjetivo * avgCarb / 4)
    base.grasas_g        = Math.round(caloriasObjetivo * avgFat  / 9)
    base.grasas_saturadas_g = Math.round(caloriasObjetivo * 0.10 / 9)
  }

  // ─── Ajustes adicionales por objetivo ───────────────────────────────────────

  if (objetivos.includes('bajar_peso')) {
    base.azucar_g = Math.min(base.azucar_g, 36)
  }

  if (objetivos.includes('ganar_musculo')) {
    base.calcio_mg = Math.max(base.calcio_mg, 1200)
  }

  if (objetivos.includes('digestiva')) {
    base.fibra_g = sexo === 'masculino' ? 42 : 28
    base.sodio_mg = Math.min(base.sodio_mg, 1500)
    base.azucar_g = Math.min(base.azucar_g, 30)
  }

  // ─── Ajustes por restricciones alimenticias ──────────────────────────────

  if (restricciones.includes('sin_azucar')) {
    // Sin azúcar: meta de azúcar reducida a mínimo funcional (azúcares naturales de frutas/lácteos)
    base.azucar_g = 15
  }

  if (restricciones.includes('keto')) {
    // Keto: carbohidratos muy bajos (20-50g/día), más grasas
    base.carbohidratos_g = 30
    base.grasas_g = Math.round(caloriasObjetivo * 0.70 / 9)
    base.grasas_saturadas_g = Math.round(caloriasObjetivo * 0.25 / 9)
  }

  if (restricciones.includes('sin_lactosa') || restricciones.includes('vegano')) {
    // Sin lácteos: mayor atención al calcio (el umbral se vuelve más importante)
    base.calcio_mg = Math.max(base.calcio_mg, 1200)
    base.vitamina_d_ug = Math.max(base.vitamina_d_ug, 20)
  }

  if (restricciones.includes('vegano') || restricciones.includes('vegetariano')) {
    // Dietas plant-based: más hierro y vitamina C (la C mejora absorción del hierro no hemo)
    base.hierro_mg = sexo === 'femenino' ? 32 : 14  // 1.8x la RDA por menor biodisponibilidad
    base.vitamina_c_mg = Math.max(base.vitamina_c_mg, 120)
    base.vitamina_d_ug = Math.max(base.vitamina_d_ug, 20)
  }

  return base
}

// ─── Etiquetas de nutrientes ──────────────────────────────────────────────────

export const NUTRIENTE_LABELS: Record<keyof DRIValues, { label: string; unidad: string }> = {
  calorias:           { label: 'Calorías',          unidad: 'kcal' },
  proteina_g:         { label: 'Proteína',           unidad: 'g' },
  carbohidratos_g:    { label: 'Carbohidratos',      unidad: 'g' },
  grasas_g:           { label: 'Grasas totales',     unidad: 'g' },
  grasas_saturadas_g: { label: 'Grasas saturadas',   unidad: 'g' },
  fibra_g:            { label: 'Fibra',              unidad: 'g' },
  sodio_mg:           { label: 'Sodio',              unidad: 'mg' },
  azucar_g:           { label: 'Azúcar',             unidad: 'g' },
  colesterol_mg:      { label: 'Colesterol',         unidad: 'mg' },
  calcio_mg:          { label: 'Calcio',             unidad: 'mg' },
  hierro_mg:          { label: 'Hierro',             unidad: 'mg' },
  vitamina_c_mg:      { label: 'Vitamina C',         unidad: 'mg' },
  vitamina_d_ug:      { label: 'Vitamina D',         unidad: 'µg' },
}
