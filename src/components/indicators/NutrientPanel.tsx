import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ProgressBar } from '../ui/ProgressBar'
import { getDRI, NUTRIENTE_LABELS } from '../../lib/dri'
import type { Alimento, UserProfile, PerfilSnapshot } from '../../types'

interface Props {
  alimentos: Alimento[]
  profile: UserProfile
  snapshotOverride?: PerfilSnapshot | null
}

function sumar(alimentos: Alimento[], key: keyof Alimento): number {
  return alimentos.reduce((sum, a) => sum + ((a[key] as number) || 0), 0)
}

export function NutrientPanel({ alimentos, profile, snapshotOverride }: Props) {
  const [expandido, setExpandido] = useState(false)

  const src = snapshotOverride ?? profile
  const dri = getDRI(
    src.sexo,
    src.edad,
    src.objetivos,
    src.calorias_objetivo,
    src.restricciones,
  )

  const actuales = {
    calorias:           sumar(alimentos, 'calorias'),
    proteina_g:         sumar(alimentos, 'proteina_g'),
    carbohidratos_g:    sumar(alimentos, 'carbohidratos_g'),
    grasas_g:           sumar(alimentos, 'grasas_g'),
    grasas_saturadas_g: sumar(alimentos, 'grasas_saturadas_g'),
    fibra_g:            sumar(alimentos, 'fibra_g'),
    sodio_mg:           sumar(alimentos, 'sodio_mg'),
    azucar_g:           sumar(alimentos, 'azucar_g'),
    colesterol_mg:      sumar(alimentos, 'colesterol_mg'),
    calcio_mg:          sumar(alimentos, 'calcio_mg'),
    hierro_mg:          sumar(alimentos, 'hierro_mg'),
    vitamina_c_mg:      sumar(alimentos, 'vitamina_c_mg'),
    vitamina_d_ug:      sumar(alimentos, 'vitamina_d_ug'),
  }

  const macros = ['calorias', 'proteina_g', 'carbohidratos_g', 'grasas_g'] as const
  const micros = ['grasas_saturadas_g', 'fibra_g', 'sodio_mg', 'azucar_g', 'colesterol_mg', 'calcio_mg', 'hierro_mg', 'vitamina_c_mg', 'vitamina_d_ug'] as const

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">Indicadores del día</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {snapshotOverride ? 'Basados en el objetivo original del plan' : 'Basados en tu perfil actual'}
        </p>
      </div>

      <div className="p-4 space-y-3">
        {/* Macros siempre visibles */}
        {macros.map((key) => {
          const { label, unidad } = NUTRIENTE_LABELS[key]
          return (
            <ProgressBar
              key={key}
              label={label}
              valor={actuales[key]}
              maximo={dri[key]}
              unidad={unidad === 'kcal' ? ' kcal' : 'g'}
              showValues
            />
          )
        })}

        {/* Micronutrientes colapsables */}
        <button
          onClick={() => setExpandido(!expandido)}
          className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium pt-1 transition-colors"
        >
          {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expandido ? 'Ocultar' : 'Ver'} micronutrientes
        </button>

        {expandido && (
          <div className="space-y-3 pt-1 animate-slide-up">
            {micros.map((key) => {
              const { label, unidad } = NUTRIENTE_LABELS[key]
              return (
                <ProgressBar
                  key={key}
                  label={label}
                  valor={actuales[key]}
                  maximo={dri[key]}
                  unidad={unidad === 'kcal' ? ' kcal' : unidad === 'g' ? 'g' : unidad === 'mg' ? 'mg' : 'µg'}
                  showValues
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
