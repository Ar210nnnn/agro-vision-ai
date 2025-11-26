import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Leaf } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('plant_analyses')
        .select('id, created_at, plant_type, health_status, confidence')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      toast.error('No se pudo cargar el historial');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('saludable')) return 'bg-accent text-accent-foreground';
    if (statusLower.includes('atención')) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Historial de Análisis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Cargando historial...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Leaf className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No hay análisis previos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-smooth"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium mb-1">{item.plant_type || 'Planta desconocida'}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formatDate(item.created_at)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(item.health_status)}>
                          {item.health_status}
                        </Badge>
                        {item.confidence && (
                          <Badge variant="outline">{item.confidence}%</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AnalysisHistory;
