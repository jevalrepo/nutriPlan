import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useProfileStore } from '../../store/profileStore'
import { useNotificationStore } from '../../store/notificationStore'
import { Button } from '../ui/Button'

export function Navbar() {
  const { user, signOut } = useAuthStore()
  const { profile } = useProfileStore()
  const { openModal, addToast } = useNotificationStore()

  const handleSignOut = () => {
    openModal({
      titulo: 'Cerrar sesión',
      descripcion: '¿Estás seguro de que quieres cerrar sesión?',
      labelConfirmar: 'Cerrar sesión',
      labelCancelar: 'Cancelar',
      variante: 'default',
      onConfirmar: async () => {
        try {
          await signOut()
          addToast('Sesión cerrada correctamente', 'success')
        } catch {
          addToast('Error al cerrar sesión', 'error')
        }
      },
    })
  }

  const nombre = profile?.nombre ?? user?.email?.split('@')[0] ?? 'Usuario'
  const inicial = nombre.charAt(0).toUpperCase()
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined)

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">nutriplan</span>
        </div>

        {/* Usuario */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={nombre}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary-600 text-xs font-semibold">{inicial}</span>
                )}
              </div>
              <span className="font-medium">{nombre}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              aria-label="Cerrar sesión"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        )}

        {/* Fallback sin usuario */}
        {!user && (
          <User size={18} className="text-gray-400" />
        )}
      </div>
    </header>
  )
}
