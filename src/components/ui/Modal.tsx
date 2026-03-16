import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { useNotificationStore } from '../../store/notificationStore'

export function Modal() {
  const { modal, closeModal } = useNotificationStore()
  const pointerDownOnBackdrop = useRef(false)

  useEffect(() => {
    if (!modal) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [modal, closeModal])

  if (!modal) return null

  const { titulo, descripcion, labelConfirmar = 'Confirmar', labelCancelar = 'Cancelar', variante = 'default', onConfirmar } = modal

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay — onPointerDown evita cierre accidental al cambiar pestaña */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onPointerDown={() => { pointerDownOnBackdrop.current = true }}
        onPointerUp={() => { if (pointerDownOnBackdrop.current) closeModal(); pointerDownOnBackdrop.current = false }}
        aria-hidden="true"
      />

      {/* Contenido */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-slide-up"
        onPointerDown={(e) => { pointerDownOnBackdrop.current = false; e.stopPropagation() }}
      >
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <h2 id="modal-title" className="text-lg font-semibold text-gray-900 pr-8">
          {titulo}
        </h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          {descripcion}
        </p>

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="secondary" onClick={closeModal}>
            {labelCancelar}
          </Button>
          <Button
            variant={variante === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirmar()
              closeModal()
            }}
          >
            {labelConfirmar}
          </Button>
        </div>
      </div>
    </div>
  )
}
