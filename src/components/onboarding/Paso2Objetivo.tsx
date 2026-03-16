import { TrendingDown, Dumbbell, Scale, Leaf } from 'lucide-react'
import type { OnboardingData, Objetivo } from '../../types'
import { cn } from '../../utils/cn'

interface Props {
  data: OnboardingData
  onChange: (data: Partial<OnboardingData>) => void
  errors: Partial<Record<string, string>>
}

const OBJETIVOS: Array<{
  value: Objetivo
  label: string
  descripcion: string
  icon: typeof TrendingDown
  color: string
}> = [
  {
    value: 'bajar_peso',
    label: 'Bajar de peso',
    descripcion: 'Déficit calórico moderado para perder grasa de forma sostenible',
    icon: TrendingDown,
    color: 'text-blue-500',
  },
  {
    value: 'ganar_musculo',
    label: 'Ganar músculo',
    descripcion: 'Superávit calórico con énfasis en proteína para construir masa muscular',
    icon: Dumbbell,
    color: 'text-orange-500',
  },
  {
    value: 'mantenimiento',
    label: 'Mantenimiento',
    descripcion: 'Calorías en equilibrio para mantener tu peso y composición actual',
    icon: Scale,
    color: 'text-green-500',
  },
  {
    value: 'digestiva',
    label: 'Mejorar digestión',
    descripcion: 'Énfasis en fibra y micronutrientes para mejorar la salud digestiva',
    icon: Leaf,
    color: 'text-emerald-500',
  },
]

export function Paso2Objetivo({ data, onChange, errors }: Props) {
  const toggle = (valor: Objetivo) => {
    const tiene = data.objetivos.includes(valor)
    onChange({
      objetivos: tiene
        ? data.objetivos.filter((o) => o !== valor)
        : [...data.objetivos, valor],
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">¿Cuáles son tus objetivos?</h2>
        <p className="text-sm text-gray-500 mt-1">
          Puedes seleccionar varios. Los cálculos de calorías y macros se combinarán.
        </p>
      </div>

      <div className="space-y-3">
        {OBJETIVOS.map((obj) => {
          const Icon = obj.icon
          const seleccionado = data.objetivos.includes(obj.value)
          return (
            <button
              key={obj.value}
              type="button"
              onClick={() => toggle(obj.value)}
              className={cn(
                'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
                seleccionado
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <div className={cn('mt-0.5 shrink-0', obj.color)}>
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <p className={cn('text-sm font-semibold', seleccionado ? 'text-primary-700' : 'text-gray-900')}>
                  {obj.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{obj.descripcion}</p>
              </div>
              <div className={cn(
                'shrink-0 w-5 h-5 rounded flex items-center justify-center border-2 transition-all mt-0.5',
                seleccionado
                  ? 'bg-primary-500 border-primary-500'
                  : 'border-gray-300 bg-white',
              )}>
                {seleccionado && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {data.objetivos.length > 1 && (
        <p className="text-xs text-primary-600 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
          Con {data.objetivos.length} objetivos, los ajustes calóricos y macros se promediarán entre ellos.
        </p>
      )}

      {errors.objetivos && <p className="text-xs text-red-500">{errors.objetivos}</p>}
    </div>
  )
}
