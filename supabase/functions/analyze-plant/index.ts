import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No se proporcionó imagen');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no está configurada');
    }

    console.log('Analizando planta con IA...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un experto agrónomo. Analiza la imagen y responde SIEMPRE en JSON válido con esta estructura exacta, sin texto adicional:

Si hay una planta visible:
{
  "plant_type": "Nombre de la planta",
  "health_status": "Saludable|Necesita atención|Enferma|Crítica",
  "confidence": 85,
  "pigmentation": {
    "leaf_color": "descripción del color",
    "indicators": ["indicador1", "indicador2"]
  },
  "diagnosis": "Diagnóstico detallado",
  "recommendations": "Recomendaciones específicas",
  "issues": ["problema1"] 
}

Si NO hay planta visible:
{
  "plant_type": "No se detectó planta",
  "health_status": "No aplica",
  "confidence": 0,
  "pigmentation": {
    "leaf_color": "N/A",
    "indicators": []
  },
  "diagnosis": "No se detectó ninguna planta en la imagen. Por favor enfoca una planta para obtener un diagnóstico.",
  "recommendations": "Asegúrate de enfocar directamente una planta con buena iluminación.",
  "issues": []
}

IMPORTANTE: Responde SOLO con el JSON, sin markdown, sin backticks, sin texto antes o después.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analiza lo que ves en esta imagen. Si hay una planta, diagnostícala. Si no hay planta, indícalo.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Límite de solicitudes excedido. Intenta de nuevo en unos momentos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos agotados. Añade fondos en Configuración > Workspace > Uso.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`Error del gateway de IA: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No se recibió respuesta de la IA');
    }

    console.log('Respuesta de IA recibida:', aiResponse.substring(0, 200));

    // Parse JSON robustly
    let analysisData;
    try {
      analysisData = JSON.parse(aiResponse.trim());
    } catch {
      // Try extracting JSON from markdown code blocks or text
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/) || aiResponse.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          analysisData = JSON.parse(jsonMatch[1].trim());
        } catch {
          // AI didn't return JSON at all - create a fallback response
          analysisData = {
            plant_type: "No se pudo analizar",
            health_status: "Indeterminado",
            confidence: 0,
            pigmentation: { leaf_color: "N/A", indicators: [] },
            diagnosis: aiResponse.substring(0, 500),
            recommendations: "Intenta capturar la imagen nuevamente con mejor iluminación y enfocando directamente la planta.",
            issues: []
          };
        }
      } else {
        analysisData = {
          plant_type: "No se pudo analizar",
          health_status: "Indeterminado",
          confidence: 0,
          pigmentation: { leaf_color: "N/A", indicators: [] },
          diagnosis: aiResponse.substring(0, 500),
          recommendations: "Intenta capturar la imagen nuevamente con mejor iluminación y enfocando directamente la planta.",
          issues: []
        };
      }
    }

    return new Response(
      JSON.stringify(analysisData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en analyze-plant:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido al analizar la planta' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
