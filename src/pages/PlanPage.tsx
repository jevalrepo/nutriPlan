import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, Trash2, ArrowLeft, Sparkles } from 'lucide-react'
import { usePlan } from '../hooks/usePlan'
import { usePlanStore } from '../store/planStore'
import { useProfileStore } from '../store/profileStore'
import { useNotificationStore } from '../store/notificationStore'
import { MealSection } from '../components/plan/MealSection'
import { NutrientPanel } from '../components/indicators/NutrientPanel'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import type { Plan, PlanDia } from '../types'

const DIA_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dia = DIA_LABELS[date.getDay()]
  return `${dia} ${d}/${m}`
}

function formatFechaLarga(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function PlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchDia, eliminarPlan } = usePlan()
  const { setPlanActivo, diaActivo, loadingDay, pendingGeneration, setPendingGeneration } = usePlanStore()
  const { profile } = useProfileStore()
  const { openModal, addToast } = useNotificationStore()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [dias, setDias] = useState<PlanDia[]>([])
  const [diaIndex, setDiaIndex] = useState(0)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [usarObjetivoActual, setUsarObjetivoActual] = useState(false)
  const generatingRef = useRef(false)

  // ─── Cargar plan y sus días ─────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return
    setLoadingPlan(true)

    Promise.all([
      supabase.from('planes').select('*').eq('id', id).single(),
      supabase.from('plan_dias').select('*').eq('plan_id', id).order('dia_numero'),
    ]).then(([{ data: planData, error: planErr }, { data: diasData, error: diasErr }]) => {
      if (planErr || diasErr || !planData) {
        addToast('No se pudo cargar el plan', 'error')
        navigate('/dashboard')
        return
      }
      setPlan(planData)
      setPlanActivo(planData)
      setDias(diasData ?? [])
      setLoadingPlan(false)
    })

    return () => { setPlanActivo(null) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ─── Cargar día activo cuando cambia el índice ──────────────────────────────

  useEffect(() => {
    if (!dias.length) return
    const dia = dias[diaIndex]
    if (dia) fetchDia(dia.id, dia)
  }, [dias, diaIndex, fetchDia])

  // ─── Generación IA día a día ────────────────────────────────────────────────

  useEffect(() => {
    if (!pendingGeneration || pendingGeneration.planId !== id) return
    if (!dias.length || !profile) return

    const { current, dias: pendingDias } = pendingGeneration

    // Terminación: todos los días generados
    if (current >= pendingDias.length) {
      generatingRef.current = false
      setPendingGeneration(null)
      const diaActual = dias[diaIndex]
      if (diaActual) fetchDia(diaActual.id, diaActual)
      addToast('Plan generado exitosamente', 'success')
      return
    }

    // Evitar llamadas concurrentes
    if (generatingRef.current) return
    generatingRef.current = true

    const diaToGenerate = pendingDias[current]

    supabase.functions.invoke('generate-plan', {
      body: {
        dia_id: diaToGenerate.id,
        dia_numero: diaToGenerate.dia_numero,
        dias_total: pendingDias.length,
        perfil: {
          sexo: profile.sexo,
          edad: profile.edad,
          peso_kg: profile.peso_kg,
          estatura_cm: profile.estatura_cm,
          objetivos: plan?.objetivos ?? profile.objetivos,
          nivel_actividad: profile.nivel_actividad,
          restricciones: profile.restricciones,
          restricciones_otras: profile.restricciones_otras,
          calorias_objetivo: profile.calorias_objetivo,
          proteina_g: profile.proteina_g,
          carbohidratos_g: profile.carbohidratos_g,
          grasas_g: profile.grasas_g,
        },
      },
    }).then(({ error }) => {
      if (error) console.error('Error generating day', current + 1, error)
      const diaVisible = dias[diaIndex]
      if (diaVisible?.id === diaToGenerate.id) {
        fetchDia(diaToGenerate.id, diaVisible)
      }
      generatingRef.current = false
      setPendingGeneration({ ...pendingGeneration, current: current + 1 })
    }).catch(() => {
      generatingRef.current = false
      setPendingGeneration({ ...pendingGeneration, current: current + 1 })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGeneration, id, dias.length, profile])

  // ─── Eliminar plan ──────────────────────────────────────────────────────────

  const handleEliminarPlan = () => {
    openModal({
      titulo: 'Eliminar plan',
      descripcion: `¿Quieres eliminar el plan "${plan?.nombre}"? Esta acción no se puede deshacer.`,
      labelConfirmar: 'Eliminar',
      variante: 'danger',
      onConfirmar: async () => {
        try {
          await eliminarPlan(id!)
          addToast('Plan eliminado', 'success')
          navigate('/dashboard')
        } catch {
          addToast('Error al eliminar el plan', 'error')
        }
      },
    })
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loadingPlan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <p className="text-sm text-gray-400">Cargando plan...</p>
        </div>
      </div>
    )
  }

  if (!plan || !dias.length) return null

  const diaActual = dias[diaIndex]
  const todosAlimentos = (diaActivo?.comidas ?? []).flatMap((c) => c.alimentos)

  const isGenerating = !!(pendingGeneration && pendingGeneration.planId === id)
  const generatingCurrent = pendingGeneration?.current ?? 0
  const generatingTotal = pendingGeneration?.dias.length ?? 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">

      {/* Banner de generación IA */}
      {isGenerating && (
        <div className="bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Sparkles size={16} className="text-primary-500 shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-800">
              {generatingCurrent >= generatingTotal
                ? 'Finalizando plan...'
                : `Generando con IA — Día ${Math.min(generatingCurrent + 1, generatingTotal)} de ${generatingTotal}`}
            </p>
            <div className="w-full bg-primary-100 rounded-full h-1.5 mt-1.5">
              <div
                className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(generatingCurrent / generatingTotal, 1) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header del plan */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{plan.nombre}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Calendar size={12} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-400">
                {plan.tipo === 'semanal' ? '7 días' : '30 días'} · {plan.fecha_inicio} → {plan.fecha_fin}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleEliminarPlan}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
          title="Eliminar plan"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Selector de días — scroll horizontal en mobile */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center px-3 py-2 border-b border-gray-50 gap-1">
          <button
            onClick={() => setDiaIndex((i) => Math.max(0, i - 1))}
            disabled={diaIndex === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex-1 overflow-x-auto no-scrollbar">
            <div className="flex gap-1 min-w-max px-1">
              {dias.map((dia, i) => (
                <button
                  key={dia.id}
                  onClick={() => setDiaIndex(i)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                    i === diaIndex
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {plan.tipo === 'semanal'
                    ? formatFecha(dia.fecha)
                    : `Día ${dia.dia_numero}`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setDiaIndex((i) => Math.min(dias.length - 1, i + 1))}
            disabled={diaIndex === dias.length - 1}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="px-4 py-2.5">
          <p className="text-sm font-medium text-gray-700 capitalize">
            {formatFechaLarga(diaActual.fecha)}
          </p>
        </div>
      </div>

      {/* Contenido del día */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Comidas — ocupa 2/3 en desktop */}
        <div className="lg:col-span-2 space-y-3">
          {loadingDay ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center">
              <p className="text-sm text-gray-400 animate-pulse">Cargando comidas...</p>
            </div>
          ) : diaActivo ? (
            diaActivo.comidas.map((comida) => (
              <MealSection key={comida.id} comida={comida} />
            ))
          ) : null}
        </div>

        {/* NutrientPanel — 1/3 en desktop, full en mobile */}
        <div className="lg:col-span-1 space-y-3">
          {profile && plan?.perfil_snapshot && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700">Ajustar al objetivo actual</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                  {usarObjetivoActual ? 'Mostrando métricas del perfil actual' : 'Mostrando métricas del plan original'}
                </p>
              </div>
              <button
                onClick={() => setUsarObjetivoActual((v) => !v)}
                className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${usarObjetivoActual ? 'bg-primary-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${usarObjetivoActual ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
          {profile && (
            <NutrientPanel
              alimentos={todosAlimentos}
              profile={profile}
              snapshotOverride={!usarObjetivoActual ? (plan?.perfil_snapshot ?? null) : null}
            />
          )}
        </div>
      </div>

      {/* Navegar entre días — botones abajo en mobile */}
      <div className="flex items-center justify-between pt-2 sm:hidden">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDiaIndex((i) => Math.max(0, i - 1))}
          disabled={diaIndex === 0}
        >
          <ChevronLeft size={14} /> Anterior
        </Button>
        <span className="text-xs text-gray-400">
          Día {diaIndex + 1} de {dias.length}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDiaIndex((i) => Math.min(dias.length - 1, i + 1))}
          disabled={diaIndex === dias.length - 1}
        >
          Siguiente <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}
