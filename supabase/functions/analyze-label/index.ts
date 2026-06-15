import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireUser } from "../_shared/auth.ts";

const MAX_IMAGE_BASE64_BYTES = 1_500_000;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  try {
    const { imageBase64, plantContext } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'No se proporcionó imagen válida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_BYTES) {
      return new Response(JSON.stringify({ error: 'Imagen demasiado grande' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY no configurada');

    const contextBlock = plantContext
      ? `\n\nCONTEXTO DE LA PLANTA DEL USUARIO (último diagnóstico):
- Planta: ${plantContext.plant_type || 'desconocida'}
- Estado de salud: ${plantContext.health_status || 'desconocido'}
- Diagnóstico: ${plantContext.diagnosis || 'sin datos'}
Debes evaluar si ESTE producto sirve para tratar/cuidar esta planta concreta, completando el bloque "cross_diagnosis".`
      : '\n\nNo hay contexto de planta. Deja "cross_diagnosis" con valores neutros.';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en agroquímicos y agronomía. Analiza la etiqueta del producto agrícola y responde SIEMPRE en JSON válido con esta estructura EXACTA:

{
  "product_name": "Nombre comercial",
  "product_type": "Fertilizante|Pesticida|Herbicida|Fungicida|Insecticida|Bioestimulante|Otro",
  "active_ingredients": ["ingrediente activo + concentración"],
  "target_uses": ["uso 1", "uso 2"],
  "dosage": "Dosis recomendada con unidades (ej. 2-3 ml/L de agua)",
  "application_method": "Cómo aplicar",
  "frequency": "Cada cuánto aplicar",
  "safety_warnings": ["advertencia 1"],
  "protective_equipment": ["EPP"],
  "withdrawal_period": "Días o N/A",
  "compatible_crops": ["cultivos"],
  "expert_tips": "Consejos prácticos",
  "dose_ml_per_liter": 2.5,
  "liters_solution_per_m2": 0.1,
  "cross_diagnosis": {
    "is_suitable": true,
    "match_score": 85,
    "reason": "Por qué sirve o no para la planta del usuario",
    "recommended_dose_for_plant": "Ajuste de dosis específico",
    "warning": "Advertencia específica o vacío"
  },
  "organic_alternatives": [
    { "name": "Alternativa orgánica 1", "description": "Cómo se usa y por qué funciona" },
    { "name": "Alternativa orgánica 2", "description": "..." },
    { "name": "Alternativa orgánica 3", "description": "..." }
  ],
  "confidence": 85
}

REGLAS:
- "dose_ml_per_liter": número en ml de producto por litro de agua (extrae el valor central del rango). Si la dosis es g/L usa el mismo número. Si no aplica, 0.
- "liters_solution_per_m2": litros de solución preparada por m² (típico foliar: 0.1, suelo: 0.3). Si no aplica, 0.
- "cross_diagnosis": evalúa el producto contra la planta del usuario si se da contexto.
- "organic_alternatives": SIEMPRE 3 alternativas orgánicas/biológicas equivalentes.
${contextBlock}

Si NO es una etiqueta agrícola legible, devuelve product_name "No detectado", confidence 0, y arrays vacíos.
Responde SOLO JSON, sin markdown.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analiza esta etiqueta de producto agrícola.' },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Límite excedido' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'Créditos agotados' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) throw new Error('Sin respuesta de IA');

    let parsed;
    try { parsed = JSON.parse(aiResponse.trim()); }
    catch {
      const m = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/) || aiResponse.match(/(\{[\s\S]*\})/);
      parsed = m ? JSON.parse(m[1].trim()) : { product_name: 'No detectado', confidence: 0, safety_warnings: ['No se pudo procesar'], expert_tips: aiResponse.substring(0, 300) };
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('analyze-label error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
