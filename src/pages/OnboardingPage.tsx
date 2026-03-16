import { WizardPerfil } from '../components/onboarding/WizardPerfil'
import type { OnboardingData } from '../types'

const INITIAL_DATA: OnboardingData = {
  peso_kg: '',
  estatura_cm: '',
  edad: '',
  sexo: '',
  objetivos: [],
  restricciones: [],
  restricciones_otras: '',
  nivel_actividad: '',
  modo_actividad: 'manual',
}

export function OnboardingPage() {
  return <WizardPerfil initialData={INITIAL_DATA} />
}
