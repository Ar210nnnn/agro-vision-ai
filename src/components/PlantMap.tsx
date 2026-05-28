import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

interface Marker {
  id: string;
  plant_type: string | null;
  health_status: string;
  diagnosis: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

const healthColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('saludable')) return '#10b981';
  if (s.includes('atención')) return '#f59e0b';
  if (s.includes('crítica') || s.includes('enferma')) return '#ef4444';
  return '#6b7280';
};

const FitBounds = ({ markers }: { markers: Marker[] }) => {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = markers.map(m => [m.latitude, m.longitude] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [markers, map]);
  return null;
};

const PlantMap = () => {
  const { user } = useAuth();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      let q = supabase
        .from('plant_analyses')
        .select('id, plant_type, health_status, diagnosis, latitude, longitude, created_at')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (user) q = q.eq('user_id', user.id);
      const { data } = await q;
      setMarkers((data as Marker[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return <div className="h-[500px] flex items-center justify-center text-sm text-muted-foreground">Cargando mapa...</div>;
  }

  if (markers.length === 0) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center text-center px-6">
        <MapPin className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium">Aún no tienes plantas geolocalizadas</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Permite el acceso a la ubicación al escanear para que tus plantas aparezcan aquí en el mapa.
        </p>
      </div>
    );
  }

  const center: [number, number] = [markers[0].latitude, markers[0].longitude];

  return (
    <div className="h-[500px] rounded-xl overflow-hidden border border-border">
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds markers={markers} />
        {markers.map(m => (
          <CircleMarker
            key={m.id}
            center={[m.latitude, m.longitude]}
            radius={10}
            pathOptions={{ color: healthColor(m.health_status), fillColor: healthColor(m.health_status), fillOpacity: 0.7, weight: 2 }}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[180px]">
                <p className="font-semibold text-sm">{m.plant_type || 'Planta'}</p>
                <Badge style={{ backgroundColor: healthColor(m.health_status) + '20', color: healthColor(m.health_status) }} className="border-0">{m.health_status}</Badge>
                <p className="text-muted-foreground line-clamp-3 pt-1">{m.diagnosis}</p>
                <p className="text-[10px] opacity-60 pt-1">{new Date(m.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default PlantMap;
