import { CheckCircle2, AlertTriangle, Droplets, Bug, Thermometer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('saludable')) return 'bg-accent text-accent-foreground';
    if (statusLower.includes('atención')) return 'bg-warning text-warning-foreground';
    if (statusLower.includes('enferma') || statusLower.includes('crítica')) 
      return 'bg-destructive text-destructive-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('saludable')) return <CheckCircle2 className="w-5 h-5" />;
    if (statusLower.includes('agua')) return <Droplets className="w-5 h-5" />;
    if (statusLower.includes('plaga')) return <Bug className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Imagen capturada */}
      {capturedImage && (
        <Card className="overflow-hidden shadow-card">
          <img 
            src={capturedImage} 
            alt="Planta capturada" 
            className="w-full h-64 object-cover"
          />
        </Card>
      )}

      {/* Información principal */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{analysis.plant_type}</CardTitle>
            <Badge variant="secondary">
              {analysis.confidence}% confianza
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estado de salud */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getStatusColor(analysis.health_status)}`}>
              {getStatusIcon(analysis.health_status)}
              <span className="font-semibold">{analysis.health_status}</span>
            </div>
          </div>

          {/* Pigmentación */}
          {analysis.pigmentation && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-primary" />
                Análisis de Pigmentación
              </h3>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm mb-2">
                  <span className="font-medium">Color de hojas:</span> {analysis.pigmentation.leaf_color}
                </p>
                {analysis.pigmentation.indicators.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {analysis.pigmentation.indicators.map((indicator, idx) => (
                      <Badge key={idx} variant="outline">{indicator}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnóstico */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Diagnóstico</h3>
            <p className="text-muted-foreground">{analysis.diagnosis}</p>
          </div>

          {/* Problemas detectados */}
          {analysis.issues && analysis.issues.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-warning flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Problemas Detectados
              </h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {analysis.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendaciones */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-accent flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Recomendaciones
            </h3>
            <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
              <p className="text-sm">{analysis.recommendations}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlantAnalysis;
