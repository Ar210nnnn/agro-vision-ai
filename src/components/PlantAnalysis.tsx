import { CheckCircle2, AlertTriangle, Bug, Thermometer, Share2, Leaf, CloudRain, Eye, EyeOff, Target, FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import DetectionOverlay from './DetectionOverlay';
import { generatePlantReport } from '@/lib/generateReport';

interface Detection { label: string; severity: string; box: { x: number; y: number; w: number; h: number } }
interface ClimateRisk { condition: string; trigger: string; level: string }

interface PlantAnalysisProps {
  analysis: {
    plant_type: string;
    health_status: string;
    confidence: number;
    pigmentation?: { leaf_color: string; indicators: string[] };
    diagnosis: string;
    recommendations: string;
    issues?: string[];
    detections?: Detection[];
    climate_risks?: ClimateRisk[];
    environment_ideal?: { temp_c: string; humidity_pct: string; light: string };
  };
  capturedImage?: string;
}

const PlantAnalysis = ({ analysis, capturedImage }: PlantAnalysisProps) => {
  const [showOverlay, setShowOverlay] = useState(true);
  const [generating, setGenerating] = useState(false);
  const handleShare = async () => {
    try {
      const shareText = `🌱 ${analysis.plant_type}\n\nEstado: ${analysis.health_status}\nConfianza: ${analysis.confidence}%\n\nDiagnóstico: ${analysis.diagnosis}\n\nRecomendaciones: ${analysis.recommendations}`;
      if (navigator.share) {
        await navigator.share({ title: `Diagnóstico: ${analysis.plant_type}`, text: shareText, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Copiado al portapapeles');
      }
    } catch { /* user cancelled */ }
  };

  const handleDownloadPDF = async () => {
    try {
      setGenerating(true);
      await generatePlantReport(analysis, capturedImage);
      toast.success('Reporte PDF descargado');
    } catch (e) {
      console.error(e);
      toast.error('No se pudo generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('saludable')) return { color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: <CheckCircle2 className="w-5 h-5" />, barColor: 'bg-emerald-500' };
    if (s.includes('atención')) return { color: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: <AlertTriangle className="w-5 h-5" />, barColor: 'bg-amber-500' };
    if (s.includes('enferma') || s.includes('crítica')) return { color: 'bg-red-500/15 text-red-700 border-red-500/30', icon: <Bug className="w-5 h-5" />, barColor: 'bg-red-500' };
    return { color: 'bg-muted text-muted-foreground border-border', icon: <Leaf className="w-5 h-5" />, barColor: 'bg-muted-foreground' };
  };

  const statusConfig = getStatusConfig(analysis.health_status);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with image + detection overlay */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-black">
        {capturedImage && (
          showOverlay ? (
            <DetectionOverlay imageSrc={capturedImage} detections={analysis.detections} />
          ) : (
            <img src={capturedImage} alt="Planta" className="w-full h-auto block" />
          )
        )}
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          {analysis.detections && analysis.detections.length > 0 && (
            <Button
              onClick={() => setShowOverlay(v => !v)}
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border-0"
            >
              {showOverlay ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showOverlay ? 'Ocultar' : 'Ver'} IA
            </Button>
          )}
          <Button onClick={handleDownloadPDF} disabled={generating} variant="secondary" size="sm" className="h-8 gap-1.5 bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border-0">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            PDF
          </Button>
          <Button onClick={handleShare} variant="secondary" size="icon" className="h-8 w-8 bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border-0">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          <h3 className="text-white font-bold text-lg drop-shadow">{analysis.plant_type}</h3>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mt-1 ${statusConfig.color}`}>
            {statusConfig.icon}
            {analysis.health_status}
          </div>
          {analysis.detections && analysis.detections.length > 0 && (
            <div className="inline-flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-accent/90 text-accent-foreground">
              <Target className="w-3 h-3" />
              {analysis.detections.length} zona{analysis.detections.length > 1 ? 's' : ''} detectada{analysis.detections.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Confidence */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Confianza del análisis</span>
          <span className="text-sm font-bold">{analysis.confidence}%</span>
        </div>
        <Progress value={analysis.confidence} className="h-2" />
      </div>

      {/* Pigmentation */}
      {analysis.pigmentation && analysis.pigmentation.leaf_color !== 'N/A' && (
        <div className="bg-card rounded-xl p-4 border border-border">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Thermometer className="w-4 h-4 text-primary" />
            Pigmentación
          </h4>
          <p className="text-sm text-muted-foreground mb-2">{analysis.pigmentation.leaf_color}</p>
          {analysis.pigmentation.indicators.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {analysis.pigmentation.indicators.map((ind, i) => (
                <Badge key={i} variant="outline" className="text-xs">{ind}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Diagnosis */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h4 className="font-semibold text-sm mb-2">Diagnóstico</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{analysis.diagnosis}</p>
      </div>

      {/* Issues */}
      {analysis.issues && analysis.issues.length > 0 && (
        <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/20">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            Problemas ({analysis.issues.length})
          </h4>
          <ul className="space-y-1">
            {analysis.issues.map((issue, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-primary">
          <CheckCircle2 className="w-4 h-4" />
          Recomendaciones
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{analysis.recommendations}</p>
      </div>

      {/* Climate Risks (AI predictive) */}
      {analysis.climate_risks && analysis.climate_risks.length > 0 && (
        <div className="bg-card rounded-xl p-4 border border-border">
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <CloudRain className="w-4 h-4 text-blue-500" />
            Riesgos climáticos predictivos
          </h4>
          <div className="space-y-2">
            {analysis.climate_risks.map((r, i) => {
              const lvl = r.level?.toLowerCase();
              const lc = lvl === 'high' ? 'border-red-500/40 bg-red-500/5 text-red-600'
                : lvl === 'medium' ? 'border-amber-500/40 bg-amber-500/5 text-amber-700'
                : 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700';
              return (
                <div key={i} className={`rounded-lg border p-2.5 ${lc}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-xs">{r.condition}</span>
                    <Badge variant="outline" className="text-[9px] uppercase">{r.level}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{r.trigger}</p>
                </div>
              );
            })}
          </div>
          {analysis.environment_ideal && (
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-[10px]">
              <div><span className="text-muted-foreground">Temp ideal:</span> <strong>{analysis.environment_ideal.temp_c}°C</strong></div>
              <div><span className="text-muted-foreground">Humedad:</span> <strong>{analysis.environment_ideal.humidity_pct}%</strong></div>
              <div><span className="text-muted-foreground">Luz:</span> <strong>{analysis.environment_ideal.light}</strong></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlantAnalysis;
