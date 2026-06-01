import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireUser } from "../_shared/auth.ts";

const MAX_SCANS = 5;
const MAX_FIELD_LEN = 500;
const sanitize = (v: unknown) =>
  String(v ?? '').replace(/[\r\n`]/g, ' ').slice(0, MAX_FIELD_LEN);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  try {
    const { plant_type, scans } = await req.json();
    if (!Array.isArray(scans) || scans.length < 2) {
      return new Response(JSON.stringify({ error: 'Se necesitan al menos 2 escaneos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const limitedScans = scans.slice(0, MAX_SCANS);
    const safePlantType = sanitize(plant_type) || 'Planta';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY no está configurada');

    const timeline = limitedScans.map((s: any, i: number) =>
      `Escaneo #${i + 1} (${sanitize(s.date)}): salud="${sanitize(s.health)}" | diagnóstico="${sanitize(s.diagnosis)}"`
    ).join('\n');

    const userContent: any[] = [
      { type: 'text', text: `Planta: ${safePlantType}\n\nHistorial cronológico:\n${timeline}\n\nCompara y dime si la planta mejora, empeora o se mantiene estable a lo largo del tiempo. Responde SOLO con JSON: { "trend": "better"|"worse"|"stable", "analysis": "explicación breve (2-3 frases) de la tendencia, qué cambió y qué hacer ahora" }` }
    ];

    limitedScans.forEach((s: any) => {
      if (s.image && typeof s.image === 'string' && s.image.startsWith('data:') && s.image.length < 1_500_000) {
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
