import { create } from 'zustand'
import type { Toast, ModalConfig, ToastTipo } from '../types'

let toastCounter = 0

interface NotificationState {
  toasts: Toast[]
  modal: ModalConfig | null
  addToast: (mensaje: string, tipo?: ToastTipo, duracion?: number) => void
  removeToast: (id: string) => void
  openModal: (config: ModalConfig) => void
  closeModal: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  modal: null,

  addToast: (mensaje, tipo = 'info', duracion = 4000) => {
    const id = `toast-${++toastCounter}`
    set((state) => ({
      toasts: [...state.toasts, { id, tipo, mensaje, duracion }],
    }))

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, duracion)
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  openModal: (config) => set({ modal: config }),

  closeModal: () => set({ modal: null }),
}))
