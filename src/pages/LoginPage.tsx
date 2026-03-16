import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import { Button } from '../components/ui/Button'

// Ícono de Google inline
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { signInWithGoogle } = useAuthStore()
  const { addToast } = useNotificationStore()

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      addToast('Error al iniciar sesión con Google. Intenta de nuevo.', 'error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-500 flex-col justify-between p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary-400/30 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-primary-600/30 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">N</span>
            </div>
            <span className="text-white font-semibold text-lg">nutriplan</span>
          </div>

          <div>
            <h1 className="text-4xl font-semibold text-white leading-tight mb-4">
              Tu plan alimenticio,<br />
              diseñado para ti.
            </h1>
            <p className="text-primary-100 text-lg leading-relaxed max-w-md">
              Genera planes personalizados con inteligencia artificial basados en tus objetivos, restricciones y estilo de vida.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { num: '13', label: 'Nutrientes\nrastreados' },
            { num: 'IA', label: 'Planes\ngenerados' },
            { num: '4', label: 'Objetivos\ndisponibles' },
          ].map((item) => (
            <div key={item.num} className="bg-white/10 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{item.num}</p>
              <p className="text-primary-200 text-xs mt-1 whitespace-pre-line leading-snug">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-8">
        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">N</span>
          </div>
          <span className="font-semibold text-gray-900 text-lg">nutriplan</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Bienvenido</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Inicia sesión para crear y gestionar tus planes alimenticios.
            </p>
          </div>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            loading={loading}
            onClick={handleGoogleLogin}
          >
            <GoogleIcon />
            Continuar con Google
          </Button>

          <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
            Al continuar, aceptas que tus datos se usan exclusivamente para generar
            tu plan nutricional personalizado.
          </p>
        </div>
      </div>
    </div>
  )
}
