import { useEffect, useState } from 'react'
import { Flame, Beef, Wheat, Droplets, Sparkles, ChevronRight, Pencil, Plus, Calendar, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import { useAuthStore } from '../store/authStore'
import { usePlanStore } from '../store/planStore'
import { usePlan } from '../hooks/usePlan'
import { Button } from '../components/ui/Button'
import { CrearPlanModal } from '../components/plan/CrearPlanModal'
import { useNotificationStore } from '../store/notificationStore'

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

export function DashboardPage() {
  const navigate = useNavigate()
  const { profile } = useProfileStore()
  const { user } = useAuthStore()
  const { planes, loadingPlan } = usePlanStore()
  const { fetchPlanes, eliminarPlan } = usePlan()
  const { openModal, addToast } = useNotificationStore()
  const [modalCrear, setModalCrear] = useState(false)

  useEffect(() => { fetchPlanes() }, [fetchPlanes])

  if (!profile) return null

  const nombreUsuario =
    profile.nombre ??
    (user?.user_metadata?.full_name as string | undefined) ??
    'Usuario'

  const hora = new Date().getHours()
  const saludo =
    hora < 12 ? 'Buenos días' :
    hora < 19 ? 'Buenas tardes' :
    'Buenas noches'

  const handleEliminarPlan = (planId: string, nombre: string) => {
    openModal({
      titulo: 'Eliminar plan',
      descripcion: `¿Quieres eliminar el plan "${nombre}"? Esta acción no se puede deshacer.`,
      labelConfirmar: 'Eliminar',
      variante: 'danger',
      onConfirmar: async () => {
        try {
          await eliminarPlan(planId)
          addToast('Plan eliminado', 'success')
        } catch {
          addToast('Error al eliminar el plan', 'error')
        }
      },
    })
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">

        {/* Encabezado */}
        <div>
          <p className="text-sm text-gray-500">{saludo}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-0.5">
            {nombreUsuario} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {profile.objetivos.map((o) => (
              <span key={o} className="text-xs bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full font-medium">
                {OBJETIVO_LABELS[o] ?? o}
              </span>
            ))}
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500 font-medium">{NIVEL_LABELS[profile.nivel_actividad] ?? profile.nivel_actividad}</span>
          </div>
        </div>

        {/* Métricas calóricas */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Tus métricas
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'TMB',      value: Math.round(profile.tdee / 1.55), suffix: 'kcal', hint: 'metabolismo basal', color: 'bg-white' },
              { label: 'TDEE',     value: Math.round(profile.tdee),        suffix: 'kcal', hint: 'gasto diario',     color: 'bg-white' },
              { label: 'Objetivo', value: Math.round(profile.calorias_objetivo), suffix: 'kcal', hint: 'meta diaria', color: 'bg-primary-50 border border-primary-200' },
            ].map((m) => (
              <div key={m.label} className={`${m.color} rounded-2xl p-4 sm:p-5 text-center shadow-sm border border-gray-100`}>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{m.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                  {m.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{m.suffix} · {m.hint}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Macros */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Distribución diaria de macros
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Proteína',      value: profile.proteina_g,      icon: Beef,     color: 'text-orange-500', bg: 'bg-orange-50' },
              { label: 'Carbohidratos', value: profile.carbohidratos_g, icon: Wheat,    color: 'text-yellow-500', bg: 'bg-yellow-50' },
              { label: 'Grasas',        value: profile.grasas_g,        icon: Droplets, color: 'text-blue-500',   bg: 'bg-blue-50' },
            ].map((macro) => {
              const Icon = macro.icon
              return (
                <div key={macro.label} className={`${macro.bg} rounded-2xl p-4 sm:p-5 text-center shadow-sm`}>
                  <Icon size={20} className={`${macro.color} mx-auto mb-2`} />
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{macro.value}g</p>
                  <p className="text-xs text-gray-500 mt-0.5">{macro.label}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Planes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Mis planes
            </h2>
            <Button variant="primary" size="sm" onClick={() => setModalCrear(true)}>
              <Plus size={14} />
              Nuevo plan
            </Button>
          </div>

          {loadingPlan ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-sm text-gray-400 animate-pulse">Cargando planes...</p>
            </div>
          ) : planes.length === 0 ? (
            /* CTA vacío */
            <div className="bg-linear-to-br from-primary-500 to-primary-600 rounded-2xl p-6 sm:p-8 text-white">
              <div className="flex items-start gap-3 mb-4">
                <Flame size={24} className="text-primary-200 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg">Crea tu primer plan alimenticio</h3>
                  <p className="text-primary-200 text-sm mt-1 leading-relaxed">
                    Puedes generarlo con IA en segundos o armarlo manualmente día a día, con los alimentos y porciones que prefieras.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setModalCrear(true)}
                className="w-full sm:w-auto bg-white text-primary-600 hover:bg-primary-50 border-0"
              >
                <Sparkles size={16} />
                Crear mi primer plan
                <ChevronRight size={16} />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {planes.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-primary-200 hover:shadow-md transition-all group"
                >
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                    onClick={() => navigate(`/planes/${plan.id}`)}
                  >
                    <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                      <Calendar size={16} className="text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{plan.nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {plan.tipo === 'semanal' ? '7 días' : '30 días'} · {plan.fecha_inicio} → {plan.fecha_fin}
                      </p>
                    </div>
                    <ChevronRight size={15} className="text-gray-300 group-hover:text-primary-400 transition-colors shrink-0" />
                  </button>
                  <div className="flex items-center gap-1 px-4 pb-2 -mt-1">
                    {plan.objetivos.map((o) => (
                      <span key={o} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {OBJETIVO_LABELS[o] ?? o}
                      </span>
                    ))}
                    <button
                      onClick={() => handleEliminarPlan(plan.id, plan.nombre)}
                      className="ml-auto p-1 text-gray-300 hover:text-red-400 transition-colors"
                      title="Eliminar plan"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Botón para crear otro plan */}
              <button
                onClick={() => setModalCrear(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50 transition-all text-sm font-medium"
              >
                <Plus size={15} />
                Crear otro plan
              </button>
            </div>
          )}
        </section>

        {/* Perfil resumen */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Datos del perfil
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/perfil/editar')}>
              <Pencil size={14} />
              Editar perfil
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Peso',     value: `${profile.peso_kg} kg` },
                { label: 'Estatura', value: `${profile.estatura_cm} cm` },
                { label: 'Edad',     value: `${profile.edad} años` },
                { label: 'Sexo',     value: profile.sexo === 'masculino' ? 'Masculino' : 'Femenino' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {profile.restricciones && profile.restricciones.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Restricciones</p>
                <div className="flex flex-wrap gap-2">
                  {profile.restricciones.map((r) => (
                    <span key={r} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                      {r.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {modalCrear && <CrearPlanModal onClose={() => setModalCrear(false)} />}
    </>
  )
}
