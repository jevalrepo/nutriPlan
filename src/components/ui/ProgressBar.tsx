import { cn } from '../../utils/cn'

interface ProgressBarProps {
  valor: number
  maximo: number
  label?: string
  showValues?: boolean
  unidad?: string
}

function getColor(porcentaje: number): string {
  if (porcentaje > 100) return 'bg-red-500'
  if (porcentaje >= 85)  return 'bg-amber-400'
  return 'bg-green-500'
}

function getTextColor(porcentaje: number): string {
  if (porcentaje > 100) return 'text-red-600'
  if (porcentaje >= 85)  return 'text-amber-600'
  return 'text-green-600'
}

export function ProgressBar({ valor, maximo, label, showValues = true, unidad = '' }: ProgressBarProps) {
  const porcentaje = maximo > 0 ? Math.min((valor / maximo) * 100, 110) : 0
  const width = Math.min(porcentaje, 100)

  return (
    <div className="space-y-1">
      {(label || showValues) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-gray-600 font-medium">{label}</span>}
          {showValues && (
            <span className={cn('text-xs font-semibold', getTextColor(porcentaje))}>
              {Math.round(valor)}{unidad} / {Math.round(maximo)}{unidad}
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getColor(porcentaje))}
          style={{ width: `${width}%` }}
          role="progressbar"
          aria-valuenow={Math.round(valor)}
          aria-valuemin={0}
          aria-valuemax={Math.round(maximo)}
        />
      </div>
    </div>
  )
}
