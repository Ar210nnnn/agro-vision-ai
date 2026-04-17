import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, Leaf, Activity, Award } from 'lucide-react';

interface Analysis {
  plant_type: string | null;
  health_status: string;
  confidence: number | null;
  created_at: string;
}

const StatsDashboard = () => {
  const [data, setData] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('plant_analyses')
        .select('plant_type, health_status, confidence, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setData(data || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel('stats-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plant_analyses' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Cargando estadísticas...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Sin datos aún</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Realiza tu primer análisis</p>
      </div>
    );
  }

  // Health distribution
  const healthCounts = data.reduce<Record<string, number>>((acc, item) => {
    const key = item.health_status || 'Desconocido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const healthData = Object.entries(healthCounts).map(([name, value]) => ({ name, value }));

  // Top plants
  const plantCounts = data.reduce<Record<string, number>>((acc, item) => {
    const key = item.plant_type || 'Desconocida';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topPlants = Object.entries(plantCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, count }));

  const avgConfidence = Math.round(
    data.filter(d => d.confidence).reduce((sum, d) => sum + (d.confidence || 0), 0) /
      Math.max(data.filter(d => d.confidence).length, 1)
  );

  const healthyCount = data.filter(d => d.health_status?.toLowerCase().includes('saludable')).length;
  const healthyPct = Math.round((healthyCount / data.length) * 100);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))', 'hsl(var(--accent))'];

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 border border-primary/20">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
            <Activity className="w-3 h-3" /> Total
          </div>
          <div className="text-xl font-bold text-foreground">{data.length}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl p-3 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
            <Leaf className="w-3 h-3" /> Sanas
          </div>
          <div className="text-xl font-bold text-foreground">{healthyPct}%</div>
        </div>
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-3 border border-accent/20">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
            <Award className="w-3 h-3" /> Confianza
          </div>
          <div className="text-xl font-bold text-foreground">{avgConfidence}%</div>
        </div>
      </div>

      {/* Health pie */}
      <div className="bg-card rounded-xl p-3 border border-border">
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" /> Estado de Salud
        </h4>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={healthData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
              {healthData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-1.5 mt-1 justify-center">
          {healthData.map((item, i) => (
            <div key={item.name} className="flex items-center gap-1 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top plants bar */}
      {topPlants.length > 0 && (
        <div className="bg-card rounded-xl p-3 border border-border">
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-primary" /> Más Analizadas
          </h4>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={topPlants} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;
