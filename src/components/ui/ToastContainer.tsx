import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import type { ToastTipo } from '../../types'

const toastConfig: Record<ToastTipo, { icon: typeof CheckCircle; bg: string; text: string; border: string }> = {
  success: { icon: CheckCircle, bg: 'bg-white', text: 'text-green-700', border: 'border-green-100' },
  error:   { icon: AlertCircle, bg: 'bg-white', text: 'text-red-700',   border: 'border-red-100' },
  warning: { icon: AlertTriangle, bg: 'bg-white', text: 'text-amber-700', border: 'border-amber-100' },
  info:    { icon: Info, bg: 'bg-white', text: 'text-primary-700', border: 'border-primary-100' },
}

export function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const { icon: Icon, bg, text, border } = toastConfig[toast.tipo]
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 ${bg} border ${border} rounded-xl px-4 py-3 shadow-lg animate-slide-up`}
            role="alert"
          >
            <Icon size={18} className={`${text} mt-0.5 shrink-0`} />
            <p className="text-sm text-gray-700 flex-1 leading-snug">{toast.mensaje}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
