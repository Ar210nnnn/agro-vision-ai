import { useState } from 'react';
import { Leaf, Sparkles, MessageCircle, Clock, Activity, Zap, Shield } from 'lucide-react';
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
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setCapturedImage(imageSrc);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-plant', {
        body: { imageBase64: imageSrc }
      });

      if (error) {
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

      await supabase.from('plant_analyses').insert({
        plant_type: data.plant_type,
        health_status: data.health_status,
        confidence: data.confidence,
        diagnosis: data.diagnosis,
        recommendations: data.recommendations,
        image_url: imageSrc.substring(0, 500),
        pigmentation_data: data.pigmentation,
        metadata: { issues: data.issues || [] }
      });

      if (data.confidence > 0) {
        toast.success(`✅ ${data.plant_type} — ${data.health_status}`);
      }
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
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold tracking-tight text-foreground">Agro Inteligente</h1>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-accent" />
                Diagnóstico IA en tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analysisCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border/50">
                <Activity className="w-3 h-3 text-accent" />
                <span className="font-medium">{analysisCount}</span>
                <span className="hidden sm:inline">análisis</span>
              </div>
            )}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-primary/5 px-3 py-1.5 rounded-full border border-primary/20">
              <Shield className="w-3 h-3 text-primary" />
              <span>Gemini AI</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-5">
        <div className="grid lg:grid-cols-12 gap-5">
          {/* Left Column: Camera + Analysis */}
          <div className="lg:col-span-7 space-y-4">
            {/* Camera */}
            <section>
              <WebcamCapture onCapture={handleCapture} isAnalyzing={isAnalyzing} />
            </section>

            {/* Analysis Result */}
            {currentAnalysis && (
              <section className="animate-fade-in">
                <PlantAnalysis analysis={currentAnalysis} capturedImage={capturedImage} />
              </section>
            )}
          </div>

          {/* Right Column: Tabs */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-20">
              <Tabs defaultValue="history" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-10 rounded-xl bg-muted/60 p-1">
                  <TabsTrigger value="history" className="rounded-lg text-xs font-medium flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    Historial
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="rounded-lg text-xs font-medium flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chat IA
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="mt-3">
                  <div className="bg-card rounded-2xl border border-border/50 shadow-soft overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                        <Clock className="w-4 h-4 text-primary" />
                        Análisis Recientes
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Actualización en tiempo real</p>
                    </div>
                    <div className="p-3">
                      <AnalysisHistory />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="chat" className="mt-3">
                  <div className="bg-card rounded-2xl border border-border/50 shadow-soft overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Experto Agrónomo IA
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Consultas sobre cuidados y diagnósticos</p>
                    </div>
                    <ExpertChat />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-8 py-3">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <Leaf className="w-3 h-3" />
          Agro Inteligente — Diagnóstico de plantas con inteligencia artificial
        </div>
      </footer>
    </div>
  );
};

export default Index;
