import { useState } from 'react';
import { Leaf, Sparkles } from 'lucide-react';
import WebcamCapture from '@/components/WebcamCapture';
import PlantAnalysis from '@/components/PlantAnalysis';
import AnalysisHistory from '@/components/AnalysisHistory';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | undefined>();

  const handleCapture = async (imageSrc: string) => {
    setIsAnalyzing(true);
    setCapturedImage(imageSrc);
    setCurrentAnalysis(null);

    try {
      // Llamar a la función edge para analizar la planta
      const { data, error } = await supabase.functions.invoke('analyze-plant', {
        body: { imageBase64: imageSrc }
      });

      if (error) throw error;

      if (!data) {
        throw new Error('No se recibió respuesta del análisis');
      }

      setCurrentAnalysis(data);

      // Guardar en la base de datos
      const { error: dbError } = await supabase
        .from('plant_analyses')
        .insert({
          plant_type: data.plant_type,
          health_status: data.health_status,
          confidence: data.confidence,
          diagnosis: data.diagnosis,
          recommendations: data.recommendations,
          image_url: imageSrc,
          pigmentation_data: data.pigmentation,
          metadata: { issues: data.issues || [] }
        });

      if (dbError) {
        console.error('Error al guardar en BD:', dbError);
        // No mostramos error al usuario, solo lo logueamos
      }

      toast.success('¡Análisis completado!');
    } catch (error) {
      console.error('Error al analizar:', error);
      toast.error(error instanceof Error ? error.message : 'Error al analizar la planta');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Agro Inteligente</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Diagnóstico de plantas con IA
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Camera and Analysis */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Captura de Planta</h2>
              <p className="text-muted-foreground text-sm">
                Enfoca la cámara hacia la planta que deseas analizar y captura la imagen
              </p>
            </div>
            
            <WebcamCapture 
              onCapture={handleCapture}
              isAnalyzing={isAnalyzing}
            />

            {currentAnalysis && (
              <PlantAnalysis 
                analysis={currentAnalysis}
                capturedImage={capturedImage}
              />
            )}
          </div>

          {/* Right Column - History */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Análisis Recientes</h2>
              <p className="text-muted-foreground text-sm">
                Historial de análisis de plantas realizados
              </p>
            </div>
            
            <AnalysisHistory />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-6 bg-card/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Agro Inteligente - Sistema de detección de plantas con inteligencia artificial</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
