import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireUser } from "../_shared/auth.ts";

const MAX_IMAGE_BASE64_BYTES = 1_500_000;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  try {
    const { imageBase64 } = await req.json();
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en agroquímicos. Analiza la etiqueta del producto agrícola (fertilizante, pesticida, herbicida, fungicida, bioestimulante) y responde SIEMPRE en JSON válido con esta estructura exacta:

{
  "product_name": "Nombre comercial",
  "product_type": "Fertilizante|Pesticida|Herbicida|Fungicida|Insecticida|Bioestimulante|Otro",
  "active_ingredients": ["ingrediente activo + concentración"],
  "target_uses": ["uso recomendado 1", "uso 2"],
  "dosage": "Dosis recomendada con unidades (ej. 2-3 ml/L de agua)",
  "application_method": "Cómo aplicar (foliar, suelo, riego, etc.)",
  "frequency": "Cada cuánto aplicar",
  "safety_warnings": ["advertencia 1", "advertencia 2"],
  "protective_equipment": ["EPP requerido"],
  "withdrawal_period": "Días previos a cosecha o N/A",
  "compatible_crops": ["cultivos compatibles"],
  "expert_tips": "Consejos prácticos del agrónomo IA basados en la etiqueta",
  "confidence": 85
}

Si NO es una etiqueta de producto agrícola legible, responde:
{ "product_name": "No detectado", "product_type": "Otro", "active_ingredients": [], "target_uses": [], "dosage": "N/A", "application_method": "N/A", "frequency": "N/A", "safety_warnings": ["Imagen no reconocida como etiqueta agrícola"], "protective_equipment": [], "withdrawal_period": "N/A", "compatible_crops": [], "expert_tips": "Enfoca claramente la etiqueta del envase con buena luz.", "confidence": 0 }

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
