import { Input } from '../ui/Input'
import type { OnboardingData } from '../../types'

interface Props {
  data: OnboardingData
  onChange: (data: Partial<OnboardingData>) => void
  errors: Partial<Record<keyof OnboardingData, string>>
}

export function Paso1DatosFisicos({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Datos físicos</h2>
        <p className="text-sm text-gray-500 mt-1">
          Esta información nos permite calcular tus necesidades calóricas con precisión.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Peso"
          type="number"
          min="30"
          max="300"
          step="0.1"
          placeholder="70"
          hint="kg"
          value={data.peso_kg}
          onChange={(e) => onChange({ peso_kg: e.target.value })}
          error={errors.peso_kg}
        />
        <Input
          label="Estatura"
          type="number"
          min="100"
          max="250"
          placeholder="170"
          hint="cm"
          value={data.estatura_cm}
          onChange={(e) => onChange({ estatura_cm: e.target.value })}
          error={errors.estatura_cm}
        />
      </div>

      <Input
        label="Edad"
        type="number"
        min="16"
        max="100"
        placeholder="25"
        hint="años"
        value={data.edad}
        onChange={(e) => onChange({ edad: e.target.value })}
        error={errors.edad}
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Sexo biológico</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'masculino', label: 'Masculino', emoji: '♂' },
            { value: 'femenino',  label: 'Femenino',  emoji: '♀' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ sexo: opt.value as OnboardingData['sexo'] })}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-sm font-medium transition-all ${
                data.sexo === opt.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
        {errors.sexo && <p className="text-xs text-red-500">{errors.sexo}</p>}
      </div>
    </div>
  )
}
