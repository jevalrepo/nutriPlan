import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Perfil {
  sexo: 'masculino' | 'femenino'
  edad: number
  peso_kg: number
  estatura_cm: number
  objetivos: string[]
  nivel_actividad: string
  restricciones: string[]
  restricciones_otras: string | null
  calorias_objetivo: number
  proteina_g: number
  carbohidratos_g: number
  grasas_g: number
}

interface AlimentoIA {
  nombre: string
  porcion_g: number
  calorias: number
  proteina_g: number
  carbohidratos_g: number
  grasas_g: number
  grasas_saturadas_g: number
  fibra_g: number
  sodio_mg: number
  azucar_g: number
  colesterol_mg: number
  calcio_mg: number
  hierro_mg: number
  vitamina_c_mg: number
  vitamina_d_ug: number
}

interface ComidaIA {
  tipo: 'desayuno' | 'comida' | 'cena' | 'snack'
  alimentos: AlimentoIA[]
}

// Genera las comidas de UN día específico de un plan ya creado
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { dia_id, dia_numero, dias_total, perfil } = await req.json() as {
      dia_id: string
      dia_numero: number
      dias_total: number
      perfil: Perfil
    }

    // Obtener comidas existentes para este día
    const { data: comidas, error: comidasError } = await supabase
      .from('comidas')
      .select('id, tipo')
      .eq('dia_id', dia_id)
      .order('orden')

    if (comidasError || !comidas?.length) throw new Error('Could not fetch comidas for dia_id: ' + dia_id)

    const restriccionesTexto = perfil.restricciones.length > 0
      ? `Restricciones: ${perfil.restricciones.join(', ')}${perfil.restricciones_otras ? ` (otras: ${perfil.restricciones_otras})` : ''}.`
      : 'Sin restricciones alimenticias.'

    const prompt = `Eres un nutricionista experto. Genera el plan alimenticio del Día ${dia_numero} de ${dias_total} para este perfil:

PERFIL:
- Sexo: ${perfil.sexo}, Edad: ${perfil.edad} años, Peso: ${perfil.peso_kg}kg, Estatura: ${perfil.estatura_cm}cm
- Objetivos: ${perfil.objetivos.join(', ')}
- Nivel de actividad: ${perfil.nivel_actividad}
- ${restriccionesTexto}
- Calorías objetivo: ${Math.round(perfil.calorias_objetivo)} kcal/día
- Macros: Proteína ${Math.round(perfil.proteina_g)}g, Carbs ${Math.round(perfil.carbohidratos_g)}g, Grasas ${Math.round(perfil.grasas_g)}g

INSTRUCCIONES:
1. Genera exactamente 4 comidas: desayuno, comida, cena y snack.
2. Cada comida: 1 a 4 alimentos específicos y realistas (no genéricos).
3. Calorías totales: entre 90% y 110% del objetivo diario.
4. Respeta todas las restricciones.
5. Varía los alimentos respecto a días anteriores del plan.

Responde ÚNICAMENTE con este JSON (sin texto adicional, sin markdown):
{
  "comidas": [
    {
      "tipo": "desayuno",
      "alimentos": [
        {
          "nombre": "string",
          "porcion_g": number,
          "calorias": number,
          "proteina_g": number,
          "carbohidratos_g": number,
          "grasas_g": number,
          "grasas_saturadas_g": number,
          "fibra_g": number,
          "sodio_mg": number,
          "azucar_g": number,
          "colesterol_mg": number,
          "calcio_mg": number,
          "hierro_mg": number,
          "vitamina_c_mg": number,
          "vitamina_d_ug": number
        }
      ]
    },
    { "tipo": "comida", "alimentos": [] },
    { "tipo": "cena", "alimentos": [] },
    { "tipo": "snack", "alimentos": [] }
  ]
}`

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude did not return valid JSON')

    let dayData: { comidas: ComidaIA[] }
    try {
      dayData = JSON.parse(jsonMatch[0])
    } catch {
      console.error('JSON parse error, last 200 chars:', jsonMatch[0].slice(-200))
      throw new Error('Failed to parse Claude response')
    }

    // Insertar alimentos en cada comida
    for (const comidaData of dayData.comidas) {
      const comida = comidas.find((c) => c.tipo === comidaData.tipo)
      if (!comida || !comidaData.alimentos?.length) continue

      const { error } = await supabase.from('alimentos').insert(
        comidaData.alimentos.map((a) => ({
          comida_id: comida.id,
          ...a,
          fuente: 'claude_estimado',
        }))
      )
      if (error) console.error('Error inserting alimentos for', comidaData.tipo, error.message)
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-plan:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
