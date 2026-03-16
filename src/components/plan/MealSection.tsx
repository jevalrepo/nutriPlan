import { useState } from 'react'
import { Plus, Pencil, Trash2, Coffee, Sun, Moon, Cookie } from 'lucide-react'
import { AgregarAlimentoModal } from './AgregarAlimentoModal'
import { useNotificationStore } from '../../store/notificationStore'
import { usePlan } from '../../hooks/usePlan'
import type { Comida, Alimento, TipoComida } from '../../types'
import { cn } from '../../utils/cn'

interface Props {
  comida: Comida & { alimentos: Alimento[] }
}

const COMIDA_CONFIG: Record<TipoComida, { label: string; icon: typeof Coffee; color: string; bg: string }> = {
  desayuno: { label: 'Desayuno',  icon: Coffee,  color: 'text-amber-500',   bg: 'bg-amber-50' },
  comida:   { label: 'Comida',    icon: Sun,     color: 'text-orange-500',  bg: 'bg-orange-50' },
  cena:     { label: 'Cena',      icon: Moon,    color: 'text-indigo-500',  bg: 'bg-indigo-50' },
  snack:    { label: 'Snack',     icon: Cookie,  color: 'text-green-500',   bg: 'bg-green-50' },
}

export function MealSection({ comida }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [alimentoEditar, setAlimentoEditar] = useState<Alimento | undefined>()
  const { agregarAlimento, actualizarAlimento, eliminarAlimento } = usePlan()
  const { openModal, addToast } = useNotificationStore()

  const config = COMIDA_CONFIG[comida.tipo]
  const Icon = config.icon

  const totalCalorias = comida.alimentos.reduce((sum, a) => sum + a.calorias, 0)

  const handleGuardar = async (data: Omit<Alimento, 'id' | 'comida_id'>) => {
    try {
      if (alimentoEditar) {
        await actualizarAlimento(comida.id, alimentoEditar.id, data)
        addToast('Alimento actualizado', 'success')
      } else {
        await agregarAlimento(comida.id, data)
        addToast('Alimento agregado', 'success')
      }
    } catch {
      addToast('Error al guardar el alimento', 'error')
      throw new Error('Error al guardar')
    }
  }

  const handleEliminar = (alimento: Alimento) => {
    openModal({
      titulo: 'Eliminar alimento',
      descripcion: `¿Quieres eliminar "${alimento.nombre}" de esta comida?`,
      labelConfirmar: 'Eliminar',
      variante: 'danger',
      onConfirmar: async () => {
        try {
          await eliminarAlimento(comida.id, alimento.id)
          addToast('Alimento eliminado', 'success')
        } catch {
          addToast('Error al eliminar el alimento', 'error')
        }
      },
    })
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header de comida */}
        <div className={cn('flex items-center justify-between px-4 py-3', config.bg)}>
          <div className="flex items-center gap-2">
            <Icon size={16} className={config.color} />
            <span className="text-sm font-semibold text-gray-800">{config.label}</span>
          </div>
          <div className="flex items-center gap-3">
            {comida.alimentos.length > 0 && (
              <span className="text-xs text-gray-500 font-medium">{Math.round(totalCalorias)} kcal</span>
            )}
            <button
              onClick={() => { setAlimentoEditar(undefined); setModalAbierto(true) }}
              className={cn('flex items-center gap-1 text-xs font-medium transition-colors', config.color, 'hover:opacity-70')}
            >
              <Plus size={13} />
              Agregar
            </button>
          </div>
        </div>

        {/* Lista de alimentos */}
        {comida.alimentos.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-gray-400">Sin alimentos. Pulsa "Agregar" para añadir.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {comida.alimentos.map((alimento) => {
                const u = alimento.porcion_unidad ?? 'g'
                const ings = alimento.ingredientes
                const porcionLabel = (() => {
                  if (ings?.length) {
                    if (u === 'cantidad') {
                      const t = ings.filter(i => (i.unidad ?? 'g') === 'cantidad').reduce((s, i) => s + (i.cantidad ?? 1), 0)
                      return t > 0 ? `${t} unid.` : '1 porción'
                    }
                    const t = ings.filter(i => (i.unidad ?? 'g') === u).reduce((s, i) => s + i.porcion_g, 0)
                    return t > 0 ? `${Math.round(t)}${u}` : `${Math.round(alimento.porcion_g)}${u}`
                  }
                  if (u === 'cantidad') return `${alimento.porcion_cantidad ?? alimento.porcion_g} unid.`
                  return `${alimento.porcion_g}${u}`
                })()
                const esReceta = (ings?.length ?? 0) > 0

                return (
                  <div key={alimento.id} className="flex items-center gap-2 px-4 py-3 group hover:bg-gray-50/60 transition-colors">
                    {/* Barra lateral de color por comida */}
                    <div className={cn('w-0.5 self-stretch rounded-full shrink-0', config.bg.replace('bg-', 'bg-').replace('-50', '-300'))} />

                    <div className="flex-1 min-w-0">
                      {/* Nombre + badge + porción */}
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-gray-800 font-semibold truncate">{alimento.nombre}</p>
                        {esReceta && (
                          <span className="text-[10px] font-semibold text-violet-500 bg-violet-50 border border-violet-100 rounded-md px-1.5 py-0.5 shrink-0">
                            Receta · {ings!.length} ing.
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 shrink-0 ml-auto">{porcionLabel}</span>
                      </div>

                      {/* Macros como texto coloreado */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-red-500">{Math.round(alimento.calorias)} kcal</span>
                        {alimento.proteina_g > 0 && (
                          <span className="text-xs font-medium text-green-600">P {alimento.proteina_g}g</span>
                        )}
                        {alimento.carbohidratos_g > 0 && (
                          <span className="text-xs font-medium text-amber-500">C {alimento.carbohidratos_g}g</span>
                        )}
                        {alimento.grasas_g > 0 && (
                          <span className="text-xs font-medium text-rose-400">G {alimento.grasas_g}g</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => { setAlimentoEditar(alimento); setModalAbierto(true) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors"
                        aria-label="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleEliminar(alimento)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer totales */}
            <div className={cn('flex items-center gap-4 px-5 py-2.5 border-t border-gray-100', config.bg)}>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mr-1">Total</span>
              <span className="text-xs font-bold text-red-500">
                {Math.round(comida.alimentos.reduce((s, a) => s + a.calorias, 0))} kcal
              </span>
              {comida.alimentos.some(a => a.proteina_g > 0) && (
                <span className="text-xs font-semibold text-green-600">
                  P {Math.round(comida.alimentos.reduce((s, a) => s + a.proteina_g, 0))}g
                </span>
              )}
              {comida.alimentos.some(a => a.carbohidratos_g > 0) && (
                <span className="text-xs font-semibold text-amber-500">
                  C {Math.round(comida.alimentos.reduce((s, a) => s + a.carbohidratos_g, 0))}g
                </span>
              )}
              {comida.alimentos.some(a => a.grasas_g > 0) && (
                <span className="text-xs font-semibold text-rose-400">
                  G {Math.round(comida.alimentos.reduce((s, a) => s + a.grasas_g, 0))}g
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {modalAbierto && (
        <AgregarAlimentoModal
          comidaId={comida.id}
          tipoComida={comida.tipo}
          alimentoEditar={alimentoEditar}
          onGuardar={handleGuardar}
          onClose={() => { setModalAbierto(false); setAlimentoEditar(undefined) }}
        />
      )}
    </>
  )
}
