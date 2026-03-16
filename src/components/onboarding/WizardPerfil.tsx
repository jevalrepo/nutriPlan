import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { StepIndicator } from '../ui/StepIndicator'
import { Button } from '../ui/Button'
import { Paso1DatosFisicos } from './Paso1DatosFisicos'
import { Paso2Objetivo } from './Paso2Objetivo'
import { Paso3Restricciones } from './Paso3Restricciones'
import { Paso4Actividad } from './Paso4Actividad'
import { Paso5Resumen } from './Paso5Resumen'
import { useAuthStore } from '../../store/authStore'
import { useProfileStore } from '../../store/profileStore'
import { useNotificationStore } from '../../store/notificationStore'
import { supabase } from '../../lib/supabase'
import { calcularTMB, calcularTDEE, calcularCaloriasObjetivo, calcularMacros } from '../../lib/calculations'
import type { OnboardingData, NivelActividad, Objetivo } from '../../types'

const PASOS = ['Datos físicos', 'Objetivos', 'Restricciones', 'Actividad', 'Resumen']

type Errors = Partial<Record<string, string>>

function validarPaso(paso: number, data: OnboardingData): Errors {
  const errors: Errors = {}

  if (paso === 0) {
    if (!data.peso_kg || parseFloat(data.peso_kg) < 30 || parseFloat(data.peso_kg) > 300)
      errors.peso_kg = 'Ingresa un peso válido (30-300 kg)'
    if (!data.estatura_cm || parseFloat(data.estatura_cm) < 100 || parseFloat(data.estatura_cm) > 250)
      errors.estatura_cm = 'Ingresa una estatura válida (100-250 cm)'
    if (!data.edad || parseInt(data.edad) < 16 || parseInt(data.edad) > 100)
      errors.edad = 'Ingresa una edad válida (16-100 años)'
    if (!data.sexo)
      errors.sexo = 'Selecciona tu sexo biológico'
  }

  if (paso === 1) {
    if (data.objetivos.length === 0)
      errors.objetivos = 'Selecciona al menos un objetivo'
  }

  if (paso === 3) {
    if (!data.nivel_actividad)
      errors.nivel_actividad = 'Selecciona o determina tu nivel de actividad'
  }

  return errors
}

interface WizardPerfilProps {
  initialData: OnboardingData
  modoEdicion?: boolean
}

export function WizardPerfil({ initialData, modoEdicion = false }: WizardPerfilProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { profile, setProfile } = useProfileStore()
  const { addToast } = useNotificationStore()

  const [pasoActual, setPasoActual] = useState(0)
  const [data, setData] = useState<OnboardingData>(initialData)
  const [errors, setErrors] = useState<Errors>({})
  const [guardando, setGuardando] = useState(false)

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
    const clearedErrors = { ...errors }
    for (const key of Object.keys(updates)) delete clearedErrors[key]
    setErrors(clearedErrors)
  }

  const handleNext = () => {
    const validacion = validarPaso(pasoActual, data)
    if (Object.keys(validacion).length > 0) { setErrors(validacion); return }
    setErrors({})
    setPasoActual((p) => Math.min(p + 1, PASOS.length - 1))
  }

  const handleBack = () => {
    if (pasoActual === 0 && modoEdicion) { navigate('/dashboard'); return }
    setErrors({})
    setPasoActual((p) => Math.max(p - 1, 0))
  }

  const handleGuardar = async () => {
    if (!user) return
    const validacion = validarPaso(pasoActual, data)
    if (Object.keys(validacion).length > 0) { setErrors(validacion); return }

    setGuardando(true)
    try {
      const peso = parseFloat(data.peso_kg)
      const estatura = parseFloat(data.estatura_cm)
      const edad = parseInt(data.edad)
      const sexo = data.sexo as 'masculino' | 'femenino'
      const objetivos = data.objetivos as Objetivo[]
      const nivelActividad = data.nivel_actividad as NivelActividad

      const tmb = calcularTMB(peso, estatura, edad, sexo)
      const tdee = calcularTDEE(tmb, nivelActividad)
      const caloriasObjetivo = calcularCaloriasObjetivo(tdee, objetivos)
      const macros = calcularMacros(caloriasObjetivo, objetivos)

      const payload = {
        peso_kg: peso,
        estatura_cm: estatura,
        edad,
        sexo,
        objetivos,
        nivel_actividad: nivelActividad,
        restricciones: data.restricciones,
        restricciones_otras: data.restricciones_otras || null,
        tdee,
        calorias_objetivo: caloriasObjetivo,
        proteina_g: macros.proteina_g,
        carbohidratos_g: macros.carbohidratos_g,
        grasas_g: macros.grasas_g,
        updated_at: new Date().toISOString(),
      }

      if (modoEdicion && profile) {
        const { data: updated, error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', profile.id)
          .select()
          .single()
        if (error) throw error
        setProfile(updated)
        addToast('Perfil actualizado correctamente', 'success')
      } else {
        const nombre: string =
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          user.email?.split('@')[0] ??
          'Usuario'

        const { data: created, error } = await supabase
          .from('profiles')
          .insert({ ...payload, user_id: user.id, nombre, created_at: new Date().toISOString() })
          .select()
          .single()
        if (error) throw error
        setProfile(created)
        addToast('¡Perfil creado exitosamente!', 'success')
      }

      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      addToast('Error al guardar el perfil. Intenta de nuevo.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const esPasoFinal = pasoActual === PASOS.length - 1

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">nutriplan</span>
          {modoEdicion && (
            <span className="text-xs text-gray-400 ml-1">· Editar perfil</span>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <StepIndicator pasos={PASOS} pasoActual={pasoActual} />

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 animate-slide-up">
          {pasoActual === 0 && <Paso1DatosFisicos data={data} onChange={updateData} errors={errors} />}
          {pasoActual === 1 && <Paso2Objetivo data={data} onChange={updateData} errors={errors} />}
          {pasoActual === 2 && <Paso3Restricciones data={data} onChange={updateData} />}
          {pasoActual === 3 && <Paso4Actividad data={data} onChange={updateData} errors={errors} />}
          {pasoActual === 4 && <Paso5Resumen data={data} />}
        </div>

        <div className="flex items-center justify-between mt-6 gap-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={pasoActual === 0 && !modoEdicion}
          >
            <ChevronLeft size={16} />
            {pasoActual === 0 && modoEdicion ? 'Cancelar' : 'Atrás'}
          </Button>

          {esPasoFinal ? (
            <Button variant="primary" size="lg" loading={guardando} onClick={handleGuardar}>
              {modoEdicion ? 'Guardar cambios' : 'Crear mi perfil'}
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext}>
              Siguiente
              <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
