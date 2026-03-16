import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { usePlanStore } from '../store/planStore'
import { useAuthStore } from '../store/authStore'
import type { TipoComida, PerfilSnapshot } from '../types'

const TIPOS_COMIDA: TipoComida[] = ['desayuno', 'comida', 'cena', 'snack']

export function usePlan() {
  const { user } = useAuthStore()
  const {
    setPlanes, setDiaActivo,
    setLoadingPlan, setLoadingDay,
    addAlimento, removeAlimento, updateAlimento, removePlan,
  } = usePlanStore()

  // ─── Cargar lista de planes ───────────────────────────────────────────────

  const fetchPlanes = useCallback(async () => {
    if (!user) return
    setLoadingPlan(true)
    try {
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPlanes(data ?? [])
    } finally {
      setLoadingPlan(false)
    }
  }, [user, setPlanes, setLoadingPlan])

  // ─── Cargar un día específico ─────────────────────────────────────────────

  const fetchDia = useCallback(async (diaId: string, dia: Parameters<typeof setDiaActivo>[0] extends null ? never : NonNullable<Parameters<typeof setDiaActivo>[0]>['dia']) => {
    setLoadingDay(true)
    try {
      const { data: comidas, error } = await supabase
        .from('comidas')
        .select('*, alimentos(*)')
        .eq('dia_id', diaId)
        .order('orden')
      if (error) throw error

      setDiaActivo({
        dia,
        comidas: (comidas ?? []).map((c) => ({
          ...c,
          alimentos: (c.alimentos ?? []) as NonNullable<typeof comidas>[0]['alimentos'],
        })),
      })
    } finally {
      setLoadingDay(false)
    }
  }, [setDiaActivo, setLoadingDay])

  // ─── Crear plan manual ────────────────────────────────────────────────────

  const crearPlanManual = useCallback(async (
    nombre: string,
    tipo: 'semanal' | 'mensual',
    objetivos: string[],
    userId: string,
    perfilSnapshot?: PerfilSnapshot,
  ) => {
    const dias = tipo === 'semanal' ? 7 : 30
    const hoy = new Date()
    const fechaFin = new Date(hoy)
    fechaFin.setDate(hoy.getDate() + dias - 1)

    // 1. Crear plan
    const { data: plan, error: planError } = await supabase
      .from('planes')
      .insert({
        user_id: userId,
        nombre,
        tipo,
        objetivos,
        fecha_inicio: hoy.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        perfil_snapshot: perfilSnapshot ?? null,
      })
      .select()
      .single()
    if (planError) throw planError

    // 2. Crear días
    const diasPayload = Array.from({ length: dias }, (_, i) => {
      const fecha = new Date(hoy)
      fecha.setDate(hoy.getDate() + i)
      return { plan_id: plan.id, fecha: fecha.toISOString().split('T')[0], dia_numero: i + 1 }
    })
    const { data: planDias, error: diasError } = await supabase
      .from('plan_dias')
      .insert(diasPayload)
      .select()
    if (diasError) throw diasError

    // 3. Crear comidas (4 por día)
    const comidasPayload = (planDias ?? []).flatMap((d) =>
      TIPOS_COMIDA.map((tipo, orden) => ({ dia_id: d.id, tipo, orden }))
    )
    const { error: comidasError } = await supabase
      .from('comidas')
      .insert(comidasPayload)
    if (comidasError) throw comidasError

    return { plan, dias: planDias ?? [] }
  }, [])

  // ─── Agregar alimento ─────────────────────────────────────────────────────

  const agregarAlimento = useCallback(async (
    comidaId: string,
    alimento: Omit<import('../types').Alimento, 'id' | 'comida_id'>,
  ) => {
    const { data, error } = await supabase
      .from('alimentos')
      .insert({ ...alimento, comida_id: comidaId })
      .select()
      .single()
    if (error) throw error
    addAlimento(comidaId, data)
    return data
  }, [addAlimento])

  // ─── Actualizar alimento ──────────────────────────────────────────────────

  const actualizarAlimento = useCallback(async (
    comidaId: string,
    alimentoId: string,
    updates: Partial<import('../types').Alimento>,
  ) => {
    const { data, error } = await supabase
      .from('alimentos')
      .update(updates)
      .eq('id', alimentoId)
      .select()
      .single()
    if (error) throw error
    updateAlimento(comidaId, data)
    return data
  }, [updateAlimento])

  // ─── Eliminar alimento ────────────────────────────────────────────────────

  const eliminarAlimento = useCallback(async (comidaId: string, alimentoId: string) => {
    const { error } = await supabase.from('alimentos').delete().eq('id', alimentoId)
    if (error) throw error
    removeAlimento(comidaId, alimentoId)
  }, [removeAlimento])

  // ─── Eliminar plan ────────────────────────────────────────────────────────

  const eliminarPlan = useCallback(async (planId: string) => {
    const { error } = await supabase.from('planes').delete().eq('id', planId)
    if (error) throw error
    removePlan(planId)
  }, [removePlan])

  return {
    fetchPlanes,
    fetchDia,
    crearPlanManual,
    agregarAlimento,
    actualizarAlimento,
    eliminarAlimento,
    eliminarPlan,
  }
}
