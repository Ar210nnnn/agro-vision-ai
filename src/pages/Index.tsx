import { useState } from 'react';
import { Leaf, Sparkles, Scan, MessageCircle, Clock, Activity } from 'lucide-react';
import WebcamCapture from '@/components/WebcamCapture';
import PlantAnalysis from '@/components/PlantAnalysis';
import AnalysisHistory from '@/components/AnalysisHistory';
import ExpertChat from '@/components/ExpertChat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | undefined>();
  const [analysisCount, setAnalysisCount] = useState(0);

  const handleCapture = async (imageSrc: string) => {
    if (isAnalyzing) return; // prevent concurrent analyses
    setIsAnalyzing(true);
    setCapturedImage(imageSrc);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-plant', {
        body: { imageBase64: imageSrc }
      });

      if (error) {
        // Try to extract error message from response
        let errorMsg = 'Error al analizar la planta';
        try {
          const errBody = error.context;
          if (errBody) {
            const parsed = await (errBody as Response).json();
            errorMsg = parsed.error || errorMsg;
          }
        } catch { /* ignore */ }
        toast.error(errorMsg);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setCurrentAnalysis(data);
      setAnalysisCount(prev => prev + 1);

      // Save to database
      await supabase.from('plant_analyses').insert({
        plant_type: data.plant_type,
        health_status: data.health_status,
        confidence: data.confidence,
        diagnosis: data.diagnosis,
        recommendations: data.recommendations,
        image_url: imageSrc.substring(0, 500), // truncate base64 for storage
        pigmentation_data: data.pigmentation,
        metadata: { issues: data.issues || [] }
      });

      toast.success('¡Análisis completado!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al analizar la planta');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Agro Inteligente</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                IA en tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <Activity className="w-3 h-3 text-accent" />
              {analysisCount} análisis esta sesión
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Camera + Analysis (3 cols) */}
          <div className="lg:col-span-3 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Scan className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Escaneo de Planta</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Enfoca la cámara hacia la planta. Usa <strong>Auto-Scan</strong> para análisis continuo en tiempo real.
              </p>
              <WebcamCapture onCapture={handleCapture} isAnalyzing={isAnalyzing} />
            </div>

            {currentAnalysis && (
              <div>
                <h2 className="text-lg font-bold mb-3">Resultado del Análisis</h2>
                <PlantAnalysis analysis={currentAnalysis} capturedImage={capturedImage} />
              </div>
            )}
          </div>

          {/* Right: Tabs (2 cols) */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl h-11">
                <TabsTrigger value="history" className="rounded-lg text-xs sm:text-sm flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Historial
                </TabsTrigger>
                <TabsTrigger value="chat" className="rounded-lg text-xs sm:text-sm flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" />
                  Chat Experto
                </TabsTrigger>
              </TabsList>
              <TabsContent value="history" className="mt-4">
                <div className="bg-card rounded-2xl border border-border p-4">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Análisis Recientes
                  </h3>
                  <AnalysisHistory />
                </div>
              </TabsContent>
              <TabsContent value="chat" className="mt-4">
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="px-4 py-3 border-b bg-primary/5">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      Chat con Experto IA
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Consultas sobre cuidados y diagnósticos</p>
                  </div>
                  <ExpertChat />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-4 bg-card/30">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          Agro Inteligente — Sistema de diagnóstico de plantas con inteligencia artificial
        </div>
      </footer>
    </div>
  );
};

export default Index;
