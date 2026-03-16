import { create } from 'zustand'
import type { Plan, PlanDia, Comida, Alimento } from '../types'

interface DayData {
  dia: PlanDia
  comidas: (Comida & { alimentos: Alimento[] })[]
}

export interface PendingGeneration {
  planId: string
  dias: Array<{ id: string; dia_numero: number; fecha: string }>
  current: number
}

interface PlanState {
  planes: Plan[]
  planActivo: Plan | null
  diaActivo: DayData | null
  loadingPlan: boolean
  loadingDay: boolean
  pendingGeneration: PendingGeneration | null
  setPlanes: (planes: Plan[]) => void
  setPlanActivo: (plan: Plan | null) => void
  setDiaActivo: (day: DayData | null) => void
  setLoadingPlan: (v: boolean) => void
  setLoadingDay: (v: boolean) => void
  addAlimento: (comidaId: string, alimento: Alimento) => void
  removeAlimento: (comidaId: string, alimentoId: string) => void
  updateAlimento: (comidaId: string, alimento: Alimento) => void
  removePlan: (planId: string) => void
  setPendingGeneration: (g: PendingGeneration | null) => void
}

export const usePlanStore = create<PlanState>((set) => ({
  planes: [],
  planActivo: null,
  diaActivo: null,
  loadingPlan: false,
  loadingDay: false,
  pendingGeneration: null,

  setPlanes: (planes) => set({ planes }),
  setPlanActivo: (plan) => set({ planActivo: plan }),
  setDiaActivo: (day) => set({ diaActivo: day }),
  setLoadingPlan: (v) => set({ loadingPlan: v }),
  setLoadingDay: (v) => set({ loadingDay: v }),
  setPendingGeneration: (g) => set({ pendingGeneration: g }),

  addAlimento: (comidaId, alimento) =>
    set((state) => {
      if (!state.diaActivo) return state
      return {
        diaActivo: {
          ...state.diaActivo,
          comidas: state.diaActivo.comidas.map((c) =>
            c.id === comidaId
              ? { ...c, alimentos: [...c.alimentos, alimento] }
              : c
          ),
        },
      }
    }),

  removeAlimento: (comidaId, alimentoId) =>
    set((state) => {
      if (!state.diaActivo) return state
      return {
        diaActivo: {
          ...state.diaActivo,
          comidas: state.diaActivo.comidas.map((c) =>
            c.id === comidaId
              ? { ...c, alimentos: c.alimentos.filter((a) => a.id !== alimentoId) }
              : c
          ),
        },
      }
    }),

  updateAlimento: (comidaId, alimento) =>
    set((state) => {
      if (!state.diaActivo) return state
      return {
        diaActivo: {
          ...state.diaActivo,
          comidas: state.diaActivo.comidas.map((c) =>
            c.id === comidaId
              ? { ...c, alimentos: c.alimentos.map((a) => a.id === alimento.id ? alimento : a) }
              : c
          ),
        },
      }
    }),

  removePlan: (planId) =>
    set((state) => ({ planes: state.planes.filter((p) => p.id !== planId) })),
}))
