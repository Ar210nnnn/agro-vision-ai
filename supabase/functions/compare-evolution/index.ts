import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { plant_type, scans } = await req.json();
    if (!Array.isArray(scans) || scans.length < 2) {
      return new Response(JSON.stringify({ error: 'Se necesitan al menos 2 escaneos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY no está configurada');

    const timeline = scans.map((s: any, i: number) =>
      `Escaneo #${i + 1} (${s.date}): salud="${s.health}" | diagnóstico="${s.diagnosis}"`
    ).join('\n');

    const userContent: any[] = [
      { type: 'text', text: `Planta: ${plant_type}\n\nHistorial cronológico:\n${timeline}\n\nCompara y dime si la planta mejora, empeora o se mantiene estable a lo largo del tiempo. Responde SOLO con JSON: { "trend": "better"|"worse"|"stable", "analysis": "explicación breve (2-3 frases) de la tendencia, qué cambió y qué hacer ahora" }` }
    ];

    // Add images if available
    scans.forEach((s: any) => {
      if (s.image && typeof s.image === 'string' && s.image.startsWith('data:')) {
        userContent.push({ type: 'image_url', image_url: { url: s.image } });
      }
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Eres un agrónomo experto comparando evolución de plantas. Responde SOLO JSON válido sin markdown.' },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Límite de IA. Espera unos segundos.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'Créditos agotados.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI gateway: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? '';

    let parsed: { trend: string; analysis: string };
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { trend: 'stable', analysis: raw.slice(0, 400) };
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('compare-evolution error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Error desconocido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
