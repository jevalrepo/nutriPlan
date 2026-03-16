import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useProfileStore } from '../store/profileStore'

/**
 * Hook que inicializa el listener de autenticación de Supabase.
 * Debe llamarse una sola vez en el componente raíz (App).
 */
export function useAuth() {
  const { setUser, setSession, setLoading } = useAuthStore()
  const { fetchProfile, setProfile } = useProfileStore()

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Suscribirse a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user && event !== 'TOKEN_REFRESHED') {
        fetchProfile(session.user.id)
      } else if (!session?.user) {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSession, setLoading, fetchProfile, setProfile])
}
