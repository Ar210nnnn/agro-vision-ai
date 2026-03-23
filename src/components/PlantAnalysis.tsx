import { CheckCircle2, AlertTriangle, Droplets, Bug, Thermometer, Share2, Leaf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface PlantAnalysisProps {
  analysis: {
    plant_type: string;
    health_status: string;
    confidence: number;
    pigmentation?: {
      leaf_color: string;
      indicators: string[];
    };
    diagnosis: string;
    recommendations: string;
    issues?: string[];
  };
  capturedImage?: string;
}

const PlantAnalysis = ({ analysis, capturedImage }: PlantAnalysisProps) => {
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
      {/* Header with image */}
      <div className="relative rounded-2xl overflow-hidden border border-border">
        {capturedImage && (
          <img src={capturedImage} alt="Planta" className="w-full h-48 object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">{analysis.plant_type}</h3>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mt-1 ${statusConfig.color}`}>
                {statusConfig.icon}
                {analysis.health_status}
              </div>
            </div>
            <Button onClick={handleShare} variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
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
    </div>
  );
};

export default PlantAnalysis;
