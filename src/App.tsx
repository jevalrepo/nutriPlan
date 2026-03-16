import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useAuthStore } from './store/authStore'
import { useProfileStore } from './store/profileStore'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { EditarPerfilPage } from './pages/EditarPerfilPage'
import { PlanPage } from './pages/PlanPage'

// ─── Spinner de carga ─────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    </div>
  )
}

// ─── Rutas protegidas ─────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const { profile, loading: profileLoading } = useProfileStore()

  if (loading || profileLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/" replace />

  // Si el usuario está autenticado pero no tiene perfil, redirigir al onboarding
  if (!profile) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const { profile, loading: profileLoading } = useProfileStore()

  if (loading || profileLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/" replace />

  // Si ya tiene perfil, redirigir al dashboard
  if (profile) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}

// ─── App ──────────────────────────────────────────────────────────────────────

function AppRoutes() {
  useAuth()
  const { user, loading } = useAuthStore()
  const { profile } = useProfileStore()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      {/* Login — redirige si ya hay sesión */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to={profile ? '/dashboard' : '/onboarding'} replace />
            : (
              <AppLayout showNavbar={false}>
                <LoginPage />
              </AppLayout>
            )
        }
      />

      {/* Onboarding — solo para usuarios sin perfil */}
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <AppLayout showNavbar={false}>
              <OnboardingPage />
            </AppLayout>
          </OnboardingRoute>
        }
      />

      {/* Dashboard — requiere auth + perfil */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Editar perfil — requiere auth + perfil */}
      <Route
        path="/perfil/editar"
        element={
          <ProtectedRoute>
            <EditarPerfilPage />
          </ProtectedRoute>
        }
      />

      {/* Plan — requiere auth + perfil */}
      <Route
        path="/planes/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PlanPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  )
}
