import { Beef, Wheat, Droplets } from 'lucide-react'
import type { OnboardingData, MetricasCalculadas } from '../../types'
import { calcularTMB, calcularTDEE, calcularCaloriasObjetivo, calcularMacros } from '../../lib/calculations'

interface Props {
  data: OnboardingData
}

const OBJETIVO_LABELS: Record<string, string> = {
  bajar_peso:    'Bajar de peso',
  ganar_musculo: 'Ganar músculo',
  mantenimiento: 'Mantenimiento',
  digestiva:     'Mejorar digestión',
}

const NIVEL_LABELS: Record<string, string> = {
  sedentario:            'Sedentario',
  ligeramente_activo:    'Ligeramente activo',
  moderadamente_activo:  'Moderadamente activo',
  muy_activo:            'Muy activo',
  extremadamente_activo: 'Extremadamente activo',
}

export function Paso5Resumen({ data }: Props) {
  const peso = parseFloat(data.peso_kg)
  const estatura = parseFloat(data.estatura_cm)
  const edad = parseInt(data.edad)

  if (!data.sexo || data.objetivos.length === 0 || !data.nivel_actividad) return null

  const tmb = calcularTMB(peso, estatura, edad, data.sexo)
  const tdee = calcularTDEE(tmb, data.nivel_actividad)
  const caloriasObjetivo = calcularCaloriasObjetivo(tdee, data.objetivos)
  const macros = calcularMacros(caloriasObjetivo, data.objetivos)

  const metricas: MetricasCalculadas = {
    tmb,
    tdee,
    calorias_objetivo: caloriasObjetivo,
    ...macros,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Tu resumen nutricional</h2>
        <p className="text-sm text-gray-500 mt-1">
          Métricas calculadas basadas en tus datos y objetivos.
        </p>
      </div>

      {/* Datos del perfil */}
      <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Peso',     value: `${data.peso_kg} kg` },
          { label: 'Estatura', value: `${data.estatura_cm} cm` },
          { label: 'Edad',     value: `${data.edad} años` },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Objetivos seleccionados */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Objetivos</p>
        <div className="flex flex-wrap gap-2">
          {data.objetivos.map((o) => (
            <span key={o} className="text-xs bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full font-medium">
              {OBJETIVO_LABELS[o]}
            </span>
          ))}
        </div>
        {data.objetivos.length > 1 && (
          <p className="text-xs text-gray-400 mt-1.5">
            Calorías y macros calculados como promedio ponderado de los objetivos seleccionados.
          </p>
        )}
      </div>

      {/* Nivel de actividad */}
      <div className="text-sm text-gray-600 bg-primary-50 rounded-xl px-4 py-3">
        <span className="font-medium text-primary-700">Nivel de actividad: </span>
        {NIVEL_LABELS[data.nivel_actividad ?? ''] ?? '-'}
      </div>

      {/* Métricas calóricas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'TMB',      value: Math.round(metricas.tmb),               hint: 'metabolismo basal',  color: 'bg-gray-50' },
          { label: 'TDEE',     value: Math.round(metricas.tdee),              hint: 'gasto diario total', color: 'bg-gray-50' },
          { label: 'Objetivo', value: Math.round(metricas.calorias_objetivo), hint: 'kcal/día meta',      color: 'bg-primary-50 border border-primary-200' },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl p-4 text-center ${item.color}`}>
            <p className="text-2xl font-bold text-gray-900">{item.value.toLocaleString()}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{item.label}</p>
            <p className="text-xs text-gray-400">{item.hint}</p>
          </div>
        ))}
      </div>

      {/* Macros */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Distribución de macronutrientes</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Proteína',      value: metricas.proteina_g,      icon: Beef,     color: 'text-orange-500', bg: 'bg-orange-50' },
            { label: 'Carbohidratos', value: metricas.carbohidratos_g, icon: Wheat,    color: 'text-yellow-500', bg: 'bg-yellow-50' },
            { label: 'Grasas',        value: metricas.grasas_g,        icon: Droplets, color: 'text-blue-500',   bg: 'bg-blue-50' },
          ].map((macro) => {
            const Icon = macro.icon
            return (
              <div key={macro.label} className={`${macro.bg} rounded-xl p-4 text-center`}>
                <Icon size={18} className={`${macro.color} mx-auto mb-1`} />
                <p className="text-xl font-bold text-gray-900">{macro.value}g</p>
                <p className="text-xs text-gray-500">{macro.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-semibold">Nota:</span> Estimaciones basadas en Mifflin-St Jeor. Tu plan con IA usará estos valores como base.
        </p>
      </div>
    </div>
  )
}
