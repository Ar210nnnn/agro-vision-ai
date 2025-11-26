import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Llamar a Lovable AI con Gemini Vision
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
            content: `Eres un experto agrónomo especializado en diagnóstico de plantas. Analiza la imagen de la planta proporcionada y proporciona:

1. Tipo de planta (nombre común y científico si es posible)
2. Estado de salud (Saludable, Necesita atención, Enferma, Crítica)
3. Análisis de pigmentación (color de hojas, indicadores visuales)
4. Diagnóstico detallado
5. Recomendaciones específicas

Responde SOLO en formato JSON con esta estructura:
{
  "plant_type": "Nombre de la planta",
  "health_status": "Estado de salud",
  "confidence": 95,
  "pigmentation": {
    "leaf_color": "descripción del color",
    "indicators": ["indicador1", "indicador2"]
  },
  "diagnosis": "Diagnóstico detallado",
  "recommendations": "Recomendaciones específicas",
  "issues": ["problema1", "problema2"] o []
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analiza esta planta y proporciona un diagnóstico completo.'
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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Límite de solicitudes excedido. Por favor, intenta de nuevo en unos momentos.');
      }
      if (response.status === 402) {
        throw new Error('Se requiere pago. Por favor, añade fondos a tu espacio de trabajo de Lovable AI.');
      }
      
      throw new Error(`Error del gateway de IA: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No se recibió respuesta de la IA');
    }

    console.log('Respuesta de IA recibida:', aiResponse);

    // Extraer JSON de la respuesta
    let analysisData;
    try {
      // Intentar parsear directamente
      analysisData = JSON.parse(aiResponse);
    } catch {
      // Si falla, intentar extraer JSON del texto
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo extraer el análisis de la respuesta de IA');
      }
    }

    console.log('Análisis completado:', analysisData);

    return new Response(
      JSON.stringify(analysisData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
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
