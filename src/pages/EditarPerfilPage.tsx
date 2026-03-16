import { Navigate } from 'react-router-dom'
import { WizardPerfil } from '../components/onboarding/WizardPerfil'
import { useProfileStore } from '../store/profileStore'
import type { OnboardingData, UserProfile } from '../types'

function profileToOnboardingData(profile: UserProfile): OnboardingData {
  return {
    peso_kg:            String(profile.peso_kg),
    estatura_cm:        String(profile.estatura_cm),
    edad:               String(profile.edad),
    sexo:               profile.sexo,
    objetivos:          profile.objetivos,
    restricciones:      profile.restricciones,
    restricciones_otras: profile.restricciones_otras ?? '',
    nivel_actividad:    profile.nivel_actividad,
    modo_actividad:     'manual',
  }
}

export function EditarPerfilPage() {
  const { profile } = useProfileStore()

  if (!profile) return <Navigate to="/dashboard" replace />

  return <WizardPerfil initialData={profileToOnboardingData(profile)} modoEdicion />
}
