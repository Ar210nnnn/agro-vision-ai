import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles, Loader2, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Scan {
  id: string;
  plant_type: string | null;
  health_status: string;
  diagnosis: string;
  image_url: string | null;
  confidence: number | null;
  created_at: string;
}

const healthScore = (s: string): number => {
  const x = s.toLowerCase();
  if (x.includes('saludable')) return 100;
  if (x.includes('atención')) return 60;
  if (x.includes('enferma')) return 35;
  if (x.includes('crítica')) return 10;
  return 50;
};

const PlantEvolution = () => {
  const { user } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [comparing, setComparing] = useState(false);
  const [verdict, setVerdict] = useState<{ trend: 'better' | 'worse' | 'stable'; analysis: string } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      let q = supabase
        .from('plant_analyses')
        .select('id, plant_type, health_status, diagnosis, image_url, confidence, created_at')
        .not('plant_type', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (user) q = q.eq('user_id', user.id);
      const { data } = await q;
      setScans((data as Scan[]) ?? []);
    };
    fetch();
  }, [user]);

  const groups = useMemo(() => {
    const map = new Map<string, Scan[]>();
    scans.forEach(s => {
      const key = s.plant_type ?? 'Desconocido';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).filter(([, arr]) => arr.length >= 2);
  }, [scans]);

  useEffect(() => {
    if (groups.length > 0 && !selectedType) setSelectedType(groups[0][0]);
  }, [groups, selectedType]);

  const timeline = useMemo(() => {
    const list = groups.find(([k]) => k === selectedType)?.[1] ?? [];
    return [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [groups, selectedType]);

  const handleCompare = async () => {
    if (timeline.length < 2) return;
    setComparing(true);
    setVerdict(null);
    try {
      const { data, error } = await supabase.functions.invoke('compare-evolution', {
        body: {
          plant_type: selectedType,
          scans: timeline.slice(-3).map(s => ({
            date: s.created_at,
            health: s.health_status,
            diagnosis: s.diagnosis,
            image: s.image_url?.startsWith('data:') ? s.image_url : null,
          })),
        },
      });
      if (error) throw error;
      setVerdict(data);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo comparar la evolución');
    } finally {
      setComparing(false);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Leaf className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium">Necesitas ≥ 2 escaneos de la misma planta</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">Escanea la misma planta varias veces a lo largo del tiempo para ver su evolución.</p>
      </div>
    );
  }

  const TrendIcon = verdict?.trend === 'better' ? TrendingUp : verdict?.trend === 'worse' ? TrendingDown : Minus;
  const trendColor = verdict?.trend === 'better' ? 'text-emerald-500' : verdict?.trend === 'worse' ? 'text-red-500' : 'text-muted-foreground';
  const trendLabel = verdict?.trend === 'better' ? 'Mejora 📈' : verdict?.trend === 'worse' ? 'Empeora 📉' : 'Estable ➡️';

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Selecciona una planta" /></SelectTrigger>
          <SelectContent>
            {groups.map(([type, arr]) => (
              <SelectItem key={type} value={type}>{type} ({arr.length})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleCompare} disabled={comparing || timeline.length < 2} size="sm" className="gap-1.5">
          {comparing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Analizar IA
        </Button>
      </div>

      {verdict && (
        <div className="p-3 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-accent/5">
          <div className={`flex items-center gap-2 font-semibold text-sm ${trendColor}`}>
            <TrendIcon className="w-4 h-4" /> {trendLabel}
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{verdict.analysis}</p>
        </div>
      )}

      <ScrollArea className="h-[340px]">
        <div className="relative pl-5 pr-2">
          <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-border" />
          {timeline.map((s, i) => (
            <div key={s.id} className="relative pb-3">
              <div className="absolute -left-[18px] top-2 w-3 h-3 rounded-full ring-2 ring-card" style={{ background: healthScore(s.health_status) > 70 ? '#10b981' : healthScore(s.health_status) > 40 ? '#f59e0b' : '#ef4444' }} />
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  <Badge variant="outline" className="text-[10px]">{s.health_status}</Badge>
                </div>
                <p className="text-xs mt-1 line-clamp-2">{s.diagnosis}</p>
                {i > 0 && (() => {
                  const diff = healthScore(s.health_status) - healthScore(timeline[i - 1].health_status);
                  if (diff === 0) return null;
                  return <p className={`text-[10px] mt-1 ${diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{diff > 0 ? '↑' : '↓'} {Math.abs(diff)} pts vs anterior</p>;
                })()}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PlantEvolution;
