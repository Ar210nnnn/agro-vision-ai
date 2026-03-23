import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Leaf, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HistoryItem {
  id: string;
  created_at: string;
  plant_type: string;
  health_status: string;
  confidence: number;
}

const AnalysisHistory = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('plant_analyses')
      .select('id, created_at, plant_type, health_status, confidence')
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchHistory();

    // Real-time subscription
    const channel = supabase
      .channel('history-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plant_analyses' }, (payload) => {
        setHistory(prev => [payload.new as HistoryItem, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('saludable')) return 'bg-emerald-500/15 text-emerald-700';
    if (s.includes('atención')) return 'bg-amber-500/15 text-amber-700';
    if (s.includes('no aplica') || s.includes('indeterminado')) return 'bg-muted text-muted-foreground';
    return 'bg-red-500/15 text-red-700';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground text-sm">Cargando historial...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Leaf className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground text-sm">No hay análisis previos</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Los análisis aparecerán aquí en tiempo real</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2 pr-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-xl border border-border bg-card hover:bg-accent/5 transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{item.plant_type || 'Planta desconocida'}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatDate(item.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge className={`text-xs ${getStatusColor(item.health_status)}`}>
                  {item.health_status}
                </Badge>
                {item.confidence > 0 && (
                  <Badge variant="outline" className="text-xs">{item.confidence}%</Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default AnalysisHistory;
