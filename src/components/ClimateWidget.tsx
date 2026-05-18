import { useEffect, useState } from 'react';
import { Cloud, Droplets, Sun, Wind, MapPin, AlertTriangle, CheckCircle2, Loader2, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Weather {
  temperature: number;
  humidity: number;
  windspeed: number;
  weathercode: number;
  precipitation: number;
  city: string;
  forecast: Array<{ date: string; tmax: number; tmin: number; rain: number; humidity: number }>;
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna',
  55: 'Llovizna densa', 61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte',
  71: 'Nieve ligera', 73: 'Nieve', 75: 'Nieve fuerte', 80: 'Chubascos', 81: 'Chubascos fuertes',
  82: 'Chubascos violentos', 95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta severa'
};

interface Props {
  currentDiagnosis?: { plant_type?: string; health_status?: string };
}

const ClimateWidget = ({ currentDiagnosis }: Props) => {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = async () => {
    setLoading(true); setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { latitude, longitude } = pos.coords;
      const wr = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean&timezone=auto&forecast_days=5`
      ).then(r => r.json());
      let city = 'Tu ubicación';
      try {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=es`).then(r => r.json());
        if (geo?.results?.[0]) city = `${geo.results[0].name}${geo.results[0].admin1 ? ', ' + geo.results[0].admin1 : ''}`;
      } catch { /* ignore */ }

      setWeather({
        temperature: wr.current.temperature_2m,
        humidity: wr.current.relative_humidity_2m,
        windspeed: wr.current.wind_speed_10m,
        weathercode: wr.current.weather_code,
        precipitation: wr.current.precipitation,
        city,
        forecast: wr.daily.time.slice(0, 5).map((d: string, i: number) => ({
          date: d,
          tmax: wr.daily.temperature_2m_max[i],
          tmin: wr.daily.temperature_2m_min[i],
          rain: wr.daily.precipitation_sum[i],
          humidity: wr.daily.relative_humidity_2m_mean[i],
        })),
      });
    } catch (e: any) {
      setError(e?.message || 'No se pudo obtener el clima. Permite la geolocalización.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWeather(); }, []);

  // Compute risk
  const risks: Array<{ name: string; level: 'high'|'medium'|'low'; reason: string }> = [];
  if (weather) {
    if (weather.humidity > 80) risks.push({ name: 'Hongos / Mildiu', level: 'high', reason: `Humedad ${weather.humidity}% > 80%` });
    else if (weather.humidity > 70) risks.push({ name: 'Riesgo de hongos', level: 'medium', reason: `Humedad ${weather.humidity}%` });
    if (weather.temperature > 32) risks.push({ name: 'Estrés térmico', level: 'high', reason: `Temp ${weather.temperature}°C` });
    else if (weather.temperature > 28) risks.push({ name: 'Calor elevado', level: 'medium', reason: `Temp ${weather.temperature}°C` });
    if (weather.temperature < 5) risks.push({ name: 'Riesgo de helada', level: 'high', reason: `Temp ${weather.temperature}°C` });
    if (weather.precipitation > 10) risks.push({ name: 'Exceso de lluvia', level: 'medium', reason: `${weather.precipitation}mm` });
    if (weather.windspeed > 40) risks.push({ name: 'Vientos fuertes', level: 'medium', reason: `${weather.windspeed} km/h` });
  }

  return (
    <div className="space-y-3">
      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Obteniendo clima...
        </div>
      )}

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-700">
          {error}
          <Button onClick={loadWeather} size="sm" variant="outline" className="mt-2 h-7 text-xs w-full">Reintentar</Button>
        </div>
      )}

      {weather && (
        <>
          {/* Current */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-cyan-500/10 border border-blue-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin className="w-3 h-3" /> {weather.city}
              </div>
              <Button onClick={loadWeather} variant="ghost" size="sm" className="h-6 px-2 text-[10px]">Actualizar</Button>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <div className="text-4xl font-bold text-foreground">{Math.round(weather.temperature)}°</div>
              <div className="pb-1">
                <div className="text-xs font-medium">{WEATHER_CODES[weather.weathercode] || 'N/A'}</div>
                <div className="text-[10px] text-muted-foreground">Sensación agrícola</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-card/60 rounded-lg p-2 text-center">
                <Droplets className="w-3.5 h-3.5 mx-auto text-blue-500 mb-0.5" />
                <div className="text-xs font-semibold">{weather.humidity}%</div>
                <div className="text-[9px] text-muted-foreground">Humedad</div>
              </div>
              <div className="bg-card/60 rounded-lg p-2 text-center">
                <Wind className="w-3.5 h-3.5 mx-auto text-cyan-500 mb-0.5" />
                <div className="text-xs font-semibold">{Math.round(weather.windspeed)} km/h</div>
                <div className="text-[9px] text-muted-foreground">Viento</div>
              </div>
              <div className="bg-card/60 rounded-lg p-2 text-center">
                <Cloud className="w-3.5 h-3.5 mx-auto text-slate-500 mb-0.5" />
                <div className="text-xs font-semibold">{weather.precipitation}mm</div>
                <div className="text-[9px] text-muted-foreground">Lluvia</div>
              </div>
            </div>
          </div>

          {/* Risks */}
          <div className="bg-card rounded-xl border border-border p-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Riesgos para tus cultivos
            </h4>
            {risks.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-600 py-1">
                <CheckCircle2 className="w-4 h-4" /> Condiciones favorables. Sin riesgos detectados.
              </div>
            ) : (
              <div className="space-y-1.5">
                {risks.map((r, i) => {
                  const c = r.level === 'high' ? 'border-red-500/40 bg-red-500/5'
                    : r.level === 'medium' ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-emerald-500/40 bg-emerald-500/5';
                  return (
                    <div key={i} className={`rounded-lg border p-2 ${c}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{r.name}</span>
                        <span className="text-[9px] uppercase font-bold tracking-wide">{r.level}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{r.reason}</p>
                    </div>
                  );
                })}
              </div>
            )}
            {currentDiagnosis?.plant_type && (
              <p className="mt-2 text-[10px] text-muted-foreground italic">
                Análisis contextual para: <strong>{currentDiagnosis.plant_type}</strong>
              </p>
            )}
          </div>

          {/* Forecast 5 days */}
          <div className="bg-card rounded-xl border border-border p-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
              <Sun className="w-3.5 h-3.5 text-amber-500" /> Pronóstico 5 días
            </h4>
            <div className="grid grid-cols-5 gap-1.5">
              {weather.forecast.map((f, i) => {
                const date = new Date(f.date);
                const day = date.toLocaleDateString('es', { weekday: 'short' });
                return (
                  <div key={i} className="text-center bg-muted/40 rounded-lg p-1.5">
                    <div className="text-[9px] uppercase text-muted-foreground">{i === 0 ? 'Hoy' : day}</div>
                    <Thermometer className="w-3 h-3 mx-auto my-0.5 text-orange-500" />
                    <div className="text-[10px] font-bold">{Math.round(f.tmax)}°</div>
                    <div className="text-[9px] text-muted-foreground">{Math.round(f.tmin)}°</div>
                    {f.rain > 0 && <div className="text-[9px] text-blue-500">💧{f.rain}mm</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClimateWidget;
