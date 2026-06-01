import { WifiOff, Wifi } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';

const OfflineIndicator = () => {
  const { online } = useOffline();
  if (online) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
      <WifiOff className="w-3.5 h-3.5" />
      Modo offline · Mostrando datos en caché
    </div>
  );
};

export default OfflineIndicator;

export const OnlineBadge = () => {
  const { online } = useOffline();
  return (
    <div className={`hidden sm:flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium ${
      online ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/15 text-amber-700'
    }`}>
      {online ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
      {online ? 'En línea' : 'Offline'}
    </div>
  );
};
