import { Check } from 'lucide-react'
import { cn } from '../../utils/cn'

interface StepIndicatorProps {
  pasos: string[]
  pasoActual: number
}

export function StepIndicator({ pasos, pasoActual }: StepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Barra de progreso en móvil */}
      <div className="flex sm:hidden items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">
          Paso {pasoActual + 1} de {pasos.length}
        </span>
        <span className="text-sm text-gray-400">{pasos[pasoActual]}</span>
      </div>
      <div className="sm:hidden w-full bg-gray-100 rounded-full h-1.5 mb-6">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-300"
          style={{ width: `${((pasoActual + 1) / pasos.length) * 100}%` }}
        />
      </div>

      {/* Indicador de pasos en desktop */}
      <div className="hidden sm:flex items-center justify-center gap-0 mb-8">
        {pasos.map((paso, index) => {
          const completado = index < pasoActual
          const activo = index === pasoActual

          return (
            <div key={paso} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200',
                    completado && 'bg-primary-500 text-white',
                    activo && 'bg-primary-500 text-white ring-4 ring-primary-100',
                    !completado && !activo && 'bg-gray-100 text-gray-400',
                  )}
                >
                  {completado ? <Check size={14} /> : index + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    activo ? 'text-primary-600' : 'text-gray-400',
                  )}
                >
                  {paso}
                </span>
              </div>

              {index < pasos.length - 1 && (
                <div
                  className={cn(
                    'h-px w-12 lg:w-20 mx-1 mb-5 transition-all duration-200',
                    completado ? 'bg-primary-400' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
