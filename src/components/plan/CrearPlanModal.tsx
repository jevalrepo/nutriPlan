import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, PenLine, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { usePlan } from '../../hooks/usePlan'
import { useAuthStore } from '../../store/authStore'
import { useProfileStore } from '../../store/profileStore'
import { useNotificationStore } from '../../store/notificationStore'
import { usePlanStore } from '../../store/planStore'
import { cn } from '../../utils/cn'

interface Props {
  onClose: () => void
}

type Modo = 'elegir' | 'manual' | 'ia'
type Duracion = 'semanal' | 'mensual'

export function CrearPlanModal({ onClose }: Props) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const { addToast } = useNotificationStore()
  const { crearPlanManual } = usePlan()
  const { setPendingGeneration } = usePlanStore()

  const [modo, setModo] = useState<Modo>('elegir')
  const [nombre, setNombre] = useState('')
  const [duracion, setDuracion] = useState<Duracion>('semanal')
  const [cargando, setCargando] = useState(false)
  const pointerDownOnBackdrop = useRef(false)

  const handleCrearManual = async () => {
    if (!nombre.trim() || !user || !profile) return
    setCargando(true)
    try {
      const snap = { sexo: profile.sexo, edad: profile.edad, objetivos: profile.objetivos, calorias_objetivo: profile.calorias_objetivo, restricciones: profile.restricciones }
      const { plan } = await crearPlanManual(nombre.trim(), duracion, profile.objetivos, user.id, snap)
      addToast('Plan creado correctamente', 'success')
      onClose()
      navigate(`/planes/${plan.id}`)
    } catch {
      addToast('Error al crear el plan. Intenta de nuevo.', 'error')
    } finally {
      setCargando(false)
    }
  }

  const handleGenerarIA = async () => {
    if (!nombre.trim() || !user || !profile) return
    setCargando(true)
    try {
      // 1. Crear estructura vacía del plan (igual que manual)
      const snap = { sexo: profile.sexo, edad: profile.edad, objetivos: profile.objetivos, calorias_objetivo: profile.calorias_objetivo, restricciones: profile.restricciones }
      const { plan, dias } = await crearPlanManual(nombre.trim(), duracion, profile.objetivos, user.id, snap)

      // 2. Programar generación IA día a día (se ejecuta en PlanPage)
      setPendingGeneration({
        planId: plan.id,
        dias: dias.map((d) => ({ id: d.id, dia_numero: d.dia_numero, fecha: d.fecha })),
        current: 0,
      })

      addToast('Generando plan con IA...', 'info')
      onClose()
      navigate(`/planes/${plan.id}`)
    } catch {
      addToast('Error al crear el plan. Intenta de nuevo.', 'error')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onPointerDown={() => { pointerDownOnBackdrop.current = true }}
        onPointerUp={() => { if (pointerDownOnBackdrop.current) onClose(); pointerDownOnBackdrop.current = false }}
      />

      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl animate-slide-up overflow-hidden"
        onPointerDown={(e) => { pointerDownOnBackdrop.current = false; e.stopPropagation() }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {modo === 'elegir' ? 'Crear nuevo plan' : modo === 'manual' ? 'Plan manual' : 'Generar con IA'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Elegir modo */}
          {modo === 'elegir' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">¿Cómo quieres crear tu plan?</p>
              <button
                onClick={() => setModo('ia')}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 text-left transition-all group"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary-200 transition-colors">
                  <Sparkles size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Generar con IA</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                    Claude crea un plan completo basado en tu perfil, objetivos y restricciones.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setModo('manual')}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 text-left transition-all group"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
                  <PenLine size={18} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Crear manualmente</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                    Arma tu plan día a día, elige los alimentos y porciones a tu gusto.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Formulario manual o IA */}
          {(modo === 'manual' || modo === 'ia') && (
            <div className="space-y-4">
              <Input
                label="Nombre del plan"
                placeholder={modo === 'ia' ? 'Ej: Plan noviembre' : 'Ej: Mi plan semanal'}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus
              />

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">Duración</p>
                <div className="grid grid-cols-2 gap-2">
                  {([['semanal', '7 días'], ['mensual', '30 días']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDuracion(val)}
                      className={cn(
                        'py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                        duracion === val
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {modo === 'ia' && (
                <div className="bg-primary-50 border border-primary-100 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-primary-700 leading-relaxed">
                    La IA generará desayuno, comida, cena y snacks para cada día, adaptados a tu perfil y objetivos.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(modo === 'manual' || modo === 'ia') && (
          <div className="px-6 pb-6 flex gap-3">
            <Button variant="secondary" onClick={() => setModo('elegir')} disabled={cargando}>
              Atrás
            </Button>
            <Button
              variant="primary"
              fullWidth
              loading={cargando}
              disabled={!nombre.trim()}
              onClick={modo === 'manual' ? handleCrearManual : handleGenerarIA}
            >
              {modo === 'ia' ? (
                <><Sparkles size={15} /> Generar plan</>
              ) : (
                'Crear plan'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
