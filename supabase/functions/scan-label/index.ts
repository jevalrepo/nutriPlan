import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EtiquetaExtraida {
  nombre: string
  porcion_g: number
  porcion_unidad: 'g' | 'ml' | 'cantidad'
  porcion_cantidad?: number   // cuando la porción se describe en unidades (ej: 2 rebanadas → 2)
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

interface NutrientesPer100g {
  calorias: number
  proteina_g: number
  carbohidratos_g: number
  grasas_g: number
  grasas_saturadas_g: number
  fibra_g: number
  sodio_mg: number
  azucar_g: number
  calcio_mg: number
  hierro_mg: number
  vitamina_c_mg: number
  vitamina_d_ug: number
}

function calcPer100g(data: EtiquetaExtraida): NutrientesPer100g {
  const f = data.porcion_g > 0 ? 100 / data.porcion_g : 1
  const r = (v: number) => Math.round(v * f * 10) / 10
  return {
    calorias:           r(data.calorias),
    proteina_g:         r(data.proteina_g),
    carbohidratos_g:    r(data.carbohidratos_g),
    grasas_g:           r(data.grasas_g),
    grasas_saturadas_g: r(data.grasas_saturadas_g),
    fibra_g:            r(data.fibra_g),
    sodio_mg:           r(data.sodio_mg),
    azucar_g:           r(data.azucar_g),
    calcio_mg:          r(data.calcio_mg),
    hierro_mg:          r(data.hierro_mg),
    vitamina_c_mg:      r(data.vitamina_c_mg),
    vitamina_d_ug:      r(data.vitamina_d_ug),
  }
}

const PROMPT = `Eres un experto en nutrición. Analiza la etiqueta nutricional de esta imagen.

PASO 1 — IDENTIFICAR LA COLUMNA CORRECTA:
Muchas etiquetas tienen DOS columnas de valores, por ejemplo:
  Columna A: "Por 100g" → 239 kcal, 13g proteína, etc.
  Columna B: "Por porción (55.5g / 2 rebanadas)" → 133 kcal, 7.2g proteína, etc.
Debes identificar cuál columna es la PORCIÓN (serving size) y usar EXCLUSIVAMENTE esa columna. NUNCA uses la columna de 100g ni mezcles valores de columnas distintas.

PASO 2 — LEER porcion_g:
porcion_g es el número de gramos (o ml) escrito LITERALMENTE en la descripción de la porción.
Ejemplo: "55.5g (2 rebanadas)" → porcion_g = 55.5 (NO calcules 2×27 ni ninguna otra cosa, lee el 55.5 directamente).
porcion_g representa el peso TOTAL de la porción tal como está escrito en la etiqueta.

PASO 3 — LEER porcion_cantidad:
Si la porción describe unidades contables (ej: "2 rebanadas", "3 galletas", "1 tableta"):
  porcion_unidad = "cantidad"
  porcion_cantidad = el número entero de unidades (ej: 2 para "2 rebanadas")
  porcion_g = el peso total escrito antes (ej: 55.5 para "55.5g (2 rebanadas)")
Si la porción es en ml o litros: porcion_unidad = "ml", porcion_cantidad = null
En cualquier otro caso: porcion_unidad = "g", porcion_cantidad = null

Responde ÚNICAMENTE con este JSON (sin texto adicional, sin markdown):
{
  "nombre": "nombre del producto",
  "porcion_g": number,
  "porcion_unidad": "g" | "ml" | "cantidad",
  "porcion_cantidad": number | null,
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

Reglas adicionales:
- Verifica coherencia: si porcion_g=55.5 y la columna de porción dice "133 kcal", calorias debe ser 133. Si hay discrepancia, confía en el valor explícito de kcal de la columna de porción.
- Identifica cada nutriente por su NOMBRE o etiqueta en la tabla, nunca por su posición relativa a otro nutriente. El orden y la disposición varía entre productos y países. Por ejemplo, Fibra puede aparecer antes o después de Proteínas, en el lado izquierdo o derecho, arriba o abajo — localízala siempre por su nombre ("Fibra", "Fibra Dietética", "Dietary Fiber", etc.).
- Si un nutriente no aparece en la etiqueta, usa 0.
- sodio_mg y calcio_mg en miligramos. vitamina_d_ug en microgramos (IU ÷ 40 = µg).
- Si la imagen NO es una etiqueta nutricional: {"error": "No es una etiqueta nutricional"}`

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

    const { image_base64, media_type } = await req.json() as {
      image_base64: string
      media_type: 'image/jpeg' | 'image/png' | 'image/webp'
    }

    if (!image_base64 || !media_type) throw new Error('Missing image_base64 or media_type')

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type, data: image_base64 },
          },
          { type: 'text', text: PROMPT },
        ],
      }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude did not return valid JSON')

    let parsed: EtiquetaExtraida & { error?: string }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      throw new Error('Failed to parse Claude response')
    }

    if (parsed.error) {
      return new Response(
        JSON.stringify({ ok: false, error: parsed.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const per_porcion = {
      calorias:           parsed.calorias,
      proteina_g:         parsed.proteina_g,
      carbohidratos_g:    parsed.carbohidratos_g,
      grasas_g:           parsed.grasas_g,
      grasas_saturadas_g: parsed.grasas_saturadas_g,
      fibra_g:            parsed.fibra_g,
      sodio_mg:           parsed.sodio_mg,
      azucar_g:           parsed.azucar_g,
      colesterol_mg:      parsed.colesterol_mg,
      calcio_mg:          parsed.calcio_mg,
      hierro_mg:          parsed.hierro_mg,
      vitamina_c_mg:      parsed.vitamina_c_mg,
      vitamina_d_ug:      parsed.vitamina_d_ug,
    }

    const porcion_unidad = parsed.porcion_unidad === 'ml' ? 'ml' : parsed.porcion_unidad === 'cantidad' ? 'cantidad' : 'g'
    const porcion_cantidad = porcion_unidad === 'cantidad' && parsed.porcion_cantidad && parsed.porcion_cantidad > 0
      ? Math.round(parsed.porcion_cantidad)
      : null

    return new Response(
      JSON.stringify({
        ok: true,
        alimento: {
          nombre:          parsed.nombre || 'Alimento escaneado',
          porcion_g:       parsed.porcion_g || 100,
          porcion_unidad,
          porcion_cantidad,
          per_porcion,
          per_100g:        calcPer100g(parsed),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in scan-label:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
