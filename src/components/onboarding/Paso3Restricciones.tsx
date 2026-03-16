import type { OnboardingData, RestriccionAlimenticia } from '../../types'
import { cn } from '../../utils/cn'

interface Props {
  data: OnboardingData
  onChange: (data: Partial<OnboardingData>) => void
}

const RESTRICCIONES: Array<{ value: RestriccionAlimenticia; label: string; emoji: string }> = [
  { value: 'vegano',       label: 'Vegano',              emoji: '🌱' },
  { value: 'vegetariano',  label: 'Vegetariano',         emoji: '🥗' },
  { value: 'sin_gluten',   label: 'Sin gluten',           emoji: '🌾' },
  { value: 'sin_lactosa',  label: 'Sin lactosa',          emoji: '🥛' },
  { value: 'sin_azucar',   label: 'Sin azúcar',           emoji: '🍬' },
  { value: 'keto',         label: 'Bajo en carbs / Keto', emoji: '🥑' },
]

export function Paso3Restricciones({ data, onChange }: Props) {
  const toggle = (valor: RestriccionAlimenticia) => {
    const tiene = data.restricciones.includes(valor)
    if (tiene) {
      onChange({ restricciones: data.restricciones.filter((r) => r !== valor) })
    } else {
      onChange({ restricciones: [...data.restricciones, valor] })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Restricciones alimenticias</h2>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona todas las que apliquen. Si ninguna aplica, puedes continuar sin seleccionar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {RESTRICCIONES.map((r) => {
          const seleccionado = data.restricciones.includes(r.value)
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => toggle(r.value)}
              className={cn(
                'flex items-center gap-3 p-3.5 rounded-xl border-2 text-sm font-medium text-left transition-all',
                seleccionado
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              )}
            >
              <span className="text-lg shrink-0">{r.emoji}</span>
              <span className="flex-1">{r.label}</span>
              {seleccionado && (
                <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="otras-restricciones" className="text-sm font-medium text-gray-700">
          Otras restricciones
        </label>
        <textarea
          id="otras-restricciones"
          placeholder="Ej: alergia al maní, intolerancia a la fructosa..."
          rows={2}
          value={data.restricciones_otras}
          onChange={(e) => onChange({ restricciones_otras: e.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  )
}
