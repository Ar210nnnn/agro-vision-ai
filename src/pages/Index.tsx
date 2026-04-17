import { useState } from 'react';
import { Leaf, Sparkles, MessageCircle, Clock, Activity, Zap, Shield, BarChart3, Cpu } from 'lucide-react';
import WebcamCapture from '@/components/WebcamCapture';
import PlantAnalysis from '@/components/PlantAnalysis';
import AnalysisHistory from '@/components/AnalysisHistory';
import ExpertChat from '@/components/ExpertChat';
import StatsDashboard from '@/components/StatsDashboard';
import ThemeToggle from '@/components/ThemeToggle';
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
    <div className="min-h-screen bg-background gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl gradient-hero flex items-center justify-center shadow-glow">
              <Leaf className="w-5 h-5 text-white" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-gradient">Agro</span>{' '}
                <span className="text-foreground">Inteligente</span>
              </h1>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5 text-accent" />
                IA agronómica · Tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analysisCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 text-primary font-medium">
                <Activity className="w-3 h-3" />
                {analysisCount} análisis
              </div>
            )}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-card/60 px-3 py-1.5 rounded-full border border-border/50 backdrop-blur-sm">
              <Shield className="w-3 h-3 text-accent" />
              Gemini · Pro
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero strip */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider bg-accent/15 text-accent px-2.5 py-1 rounded-full mb-2">
                <Sparkles className="w-3 h-3" /> Nueva generación
              </div>
              <h2 className="text-xl sm:text-2xl font-bold leading-tight text-foreground">
                Diagnóstico fitosanitario <span className="text-gradient">instantáneo</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                Apunta tu cámara a cualquier planta y la IA detectará especie, estado de salud, plagas y recomendaciones expertas.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl px-3 py-2 text-center min-w-[70px]">
                <div className="text-base font-bold text-primary">2.5s</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Por scan</div>
              </div>
              <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl px-3 py-2 text-center min-w-[70px]">
                <div className="text-base font-bold text-accent">100+</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Especies</div>
              </div>
              <div className="hidden sm:block bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl px-3 py-2 text-center min-w-[70px]">
                <div className="text-base font-bold text-emerald-500">24/7</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Disponible</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="container mx-auto px-4 py-5">
        <div className="grid lg:grid-cols-12 gap-5">
          {/* Left Column: Camera + Analysis */}
          <div className="lg:col-span-7 space-y-4">
            <section>
              <WebcamCapture onCapture={handleCapture} isAnalyzing={isAnalyzing} />
            </section>

            {currentAnalysis && (
              <section className="animate-fade-in">
                <PlantAnalysis analysis={currentAnalysis} capturedImage={capturedImage} />
              </section>
            )}

            {!currentAnalysis && (
              <div className="bg-card/60 backdrop-blur-sm border border-dashed border-border rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3 shadow-soft">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">Listo para escanear</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Presiona <strong className="text-primary">Iniciar escaneo</strong> y enfoca cualquier planta. El diagnóstico aparecerá aquí en segundos.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Tabs */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-20">
              <Tabs defaultValue="stats" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-11 rounded-2xl bg-muted/60 p-1 backdrop-blur-sm">
                  <TabsTrigger value="stats" className="rounded-xl text-xs font-medium flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Stats
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl text-xs font-medium flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    Historial
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="rounded-xl text-xs font-medium flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chat IA
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="stats" className="mt-3">
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-soft overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        Dashboard Inteligente
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Métricas en vivo de tus análisis</p>
                    </div>
                    <div className="p-3">
                      <StatsDashboard />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-3">
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-soft overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                        <Clock className="w-4 h-4 text-primary" />
                        Análisis Recientes
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Sincronización en tiempo real</p>
                    </div>
                    <div className="p-3">
                      <AnalysisHistory />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="chat" className="mt-3">
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-soft overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
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
      <footer className="border-t border-border/30 mt-8 py-4">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Leaf className="w-3 h-3 text-primary" />
            <span><strong className="text-foreground">Agro Inteligente</strong> — Diagnóstico fitosanitario con IA</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Datos cifrados</span>
            <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Powered by Gemini</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
