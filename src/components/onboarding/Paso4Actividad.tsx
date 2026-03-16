import { useState } from 'react'
import type { OnboardingData, NivelActividad, RespuestasActividad } from '../../types'
import { deducirNivelActividad } from '../../lib/calculations'
import { cn } from '../../utils/cn'
import { CheckCircle } from 'lucide-react'

interface Props {
  data: OnboardingData
  onChange: (data: Partial<OnboardingData>) => void
  errors: Partial<Record<keyof OnboardingData, string>>
}

const NIVELES: Array<{ value: NivelActividad; label: string; descripcion: string }> = [
  { value: 'sedentario',             label: 'Sedentario',              descripcion: 'Poco o ningún ejercicio, trabajo de escritorio.' },
  { value: 'ligeramente_activo',     label: 'Ligeramente activo',      descripcion: 'Ejercicio ligero 1-3 días/semana.' },
  { value: 'moderadamente_activo',   label: 'Moderadamente activo',    descripcion: 'Ejercicio moderado 3-5 días/semana.' },
  { value: 'muy_activo',             label: 'Muy activo',              descripcion: 'Ejercicio intenso 6-7 días/semana.' },
  { value: 'extremadamente_activo',  label: 'Extremadamente activo',   descripcion: 'Ejercicio muy intenso o trabajo físico exigente.' },
]

const PREGUNTAS = [
  {
    key: 'dias_ejercicio' as const,
    texto: '¿Cuántos días a la semana haces ejercicio planeado?',
    tipo: 'number' as const,
    placeholder: 'Ej: 3',
    min: 0, max: 7,
  },
  {
    key: 'duracion_sesion' as const,
    texto: '¿Cuánto dura cada sesión? (minutos)',
    tipo: 'number' as const,
    placeholder: 'Ej: 45',
    min: 0, max: 360,
  },
]

const PREGUNTAS_OPCIONES = [
  {
    key: 'tipo_trabajo' as const,
    texto: '¿Cómo es tu trabajo o actividad principal?',
    opciones: [
      { value: 'sedentario', label: 'Sentado la mayor parte del día' },
      { value: 'de_pie',     label: 'De pie o caminando' },
      { value: 'moderado',   label: 'Trabajo físico moderado' },
      { value: 'intenso',    label: 'Trabajo físico muy intenso' },
    ],
  },
  {
    key: 'actividad_diaria' as const,
    texto: '¿Qué tan activo eres en tu día a día (fuera del ejercicio)?',
    opciones: [
      { value: 'carro',           label: 'Uso carro para todo' },
      { value: 'camino_poco',     label: 'Camino ocasionalmente' },
      { value: 'camino_bastante', label: 'Camino bastante' },
      { value: 'muy_activo',      label: 'Muy activo en general' },
    ],
  },
  {
    key: 'actividad_recreativa' as const,
    texto: '¿Con qué frecuencia haces actividades recreativas (deporte casual, salidas)?',
    opciones: [
      { value: 'nunca',        label: 'Casi nunca' },
      { value: 'a_veces',      label: 'A veces (fines de semana)' },
      { value: 'frecuente',    label: 'Frecuentemente' },
      { value: 'muy_frecuente', label: 'Muy frecuente' },
    ],
  },
]

export function Paso4Actividad({ data, onChange, errors }: Props) {
  const [respuestas, setRespuestas] = useState<Partial<RespuestasActividad>>({})
  const [nivelDeducido, setNivelDeducido] = useState<{ nivel: NivelActividad; explicacion: string } | null>(null)

  const updateRespuesta = (key: keyof RespuestasActividad, value: unknown) => {
    const nuevas = { ...respuestas, [key]: value }
    setRespuestas(nuevas)

    // Recalcular si ya hay suficientes respuestas
    const tieneBase = nuevas.dias_ejercicio !== undefined && nuevas.tipo_trabajo !== undefined
    if (tieneBase) {
      const resultado = deducirNivelActividad(nuevas)
      setNivelDeducido(resultado)
      onChange({ nivel_actividad: resultado.nivel })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Nivel de actividad física</h2>
        <p className="text-sm text-gray-500 mt-1">
          Elige el modo que prefieras para determinar tu nivel.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {[
          { value: 'manual', label: 'Manual' },
          { value: 'cuestionario', label: 'Cuestionario' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange({ modo_actividad: tab.value as OnboardingData['modo_actividad'] })}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
              data.modo_actividad === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Modo manual */}
      {data.modo_actividad === 'manual' && (
        <div className="space-y-3">
          {NIVELES.map((nivel) => {
            const seleccionado = data.nivel_actividad === nivel.value
            return (
              <button
                key={nivel.value}
                type="button"
                onClick={() => onChange({ nivel_actividad: nivel.value })}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                  seleccionado
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300',
                )}
              >
                <div className="flex-1">
                  <p className={cn('text-sm font-semibold', seleccionado ? 'text-primary-700' : 'text-gray-900')}>
                    {nivel.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{nivel.descripcion}</p>
                </div>
                {seleccionado && (
                  <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Modo cuestionario */}
      {data.modo_actividad === 'cuestionario' && (
        <div className="space-y-6">
          {/* Preguntas numéricas */}
          {PREGUNTAS.map((p) => (
            <div key={p.key} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{p.texto}</label>
              <input
                type="number"
                min={p.min}
                max={p.max}
                placeholder={p.placeholder}
                value={respuestas[p.key] !== undefined ? String(respuestas[p.key]) : ''}
                onChange={(e) => updateRespuesta(p.key, e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          ))}

          {/* Preguntas de opción */}
          {PREGUNTAS_OPCIONES.map((p) => (
            <div key={p.key} className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{p.texto}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {p.opciones.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateRespuesta(p.key, opt.value)}
                    className={cn(
                      'p-3 rounded-xl border text-sm text-left transition-all',
                      respuestas[p.key] === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Resultado deducido */}
          {nivelDeducido && (
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 animate-slide-up">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="text-primary-600" />
                <p className="text-sm font-semibold text-primary-700">
                  Nivel asignado: {NIVELES.find((n) => n.value === nivelDeducido.nivel)?.label}
                </p>
              </div>
              <p className="text-xs text-primary-600 leading-relaxed">{nivelDeducido.explicacion}</p>
            </div>
          )}
        </div>
      )}

      {errors.nivel_actividad && (
        <p className="text-xs text-red-500">{errors.nivel_actividad}</p>
      )}
    </div>
  )
}
