import { useRef, useState } from 'react';
import { Upload, Camera, Loader2, AlertTriangle, Sparkles, Shield, Droplets, Calendar, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LabelResult {
  product_name: string;
  product_type: string;
  active_ingredients: string[];
  target_uses: string[];
  dosage: string;
  application_method: string;
  frequency: string;
  safety_warnings: string[];
  protective_equipment: string[];
  withdrawal_period: string;
  compatible_crops: string[];
  expert_tips: string;
  confidence: number;
}

const ProductLabelScan = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<LabelResult | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagen demasiado grande (máx 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      // compress via canvas to stay below edge limit
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const max = 1024;
        let { width, height } = img;
        if (width > max || height > max) {
          const ratio = Math.min(max / width, max / height);
          width *= ratio; height *= ratio;
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        setPreview(compressed);
        setLoading(true);
        setResult(null);
        try {
          const { data, error } = await supabase.functions.invoke('analyze-label', {
            body: { imageBase64: compressed }
          });
          if (error || data?.error) {
            toast.error(data?.error || 'Error al analizar la etiqueta');
            return;
          }
          setResult(data);
          if (data.confidence > 0) toast.success(`✅ ${data.product_name}`);
        } catch (err) {
          toast.error('Error al analizar');
        } finally {
          setLoading(false);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {!preview && (
        <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-dashed border-amber-500/30 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-sm font-semibold mb-1">Escanea una etiqueta agrícola</p>
          <p className="text-xs text-muted-foreground mb-4">
            Fertilizantes, pesticidas, fungicidas… la IA extrae dosis, uso, seguridad y consejos.
          </p>
          <Button onClick={() => inputRef.current?.click()} className="gap-2">
            <Camera className="w-4 h-4" /> Tomar foto / subir
          </Button>
        </div>
      )}

      {preview && (
        <div className="relative rounded-2xl overflow-hidden border border-border">
          <img src={preview} alt="Etiqueta" className="w-full max-h-48 object-cover" />
          {loading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Analizando etiqueta…</p>
            </div>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setPreview(null); setResult(null); }}
            className="absolute top-2 right-2"
          >
            <Upload className="w-3 h-3 mr-1" /> Otra
          </Button>
        </div>
      )}

      {result && (
        <ScrollArea className="h-[380px]">
          <div className="space-y-3 pr-2">
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{result.product_name}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">{result.product_type}</Badge>
                </div>
                {result.confidence > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 text-[10px]">
                    {result.confidence}%
                  </Badge>
                )}
              </div>
            </div>

            {result.active_ingredients?.length > 0 && (
              <Section icon={<Droplets className="w-3.5 h-3.5 text-blue-500" />} title="Ingredientes activos">
                <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                  {result.active_ingredients.map((i, idx) => <li key={idx}>{i}</li>)}
                </ul>
              </Section>
            )}

            <Section icon={<Droplets className="w-3.5 h-3.5 text-cyan-500" />} title="Dosis y aplicación">
              <p className="text-xs"><strong>Dosis:</strong> {result.dosage}</p>
              <p className="text-xs"><strong>Método:</strong> {result.application_method}</p>
              <p className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> <strong>Frecuencia:</strong> {result.frequency}</p>
              {result.withdrawal_period && result.withdrawal_period !== 'N/A' && (
                <p className="text-xs"><strong>Periodo de carencia:</strong> {result.withdrawal_period}</p>
              )}
            </Section>

            {result.target_uses?.length > 0 && (
              <Section icon={<Leaf className="w-3.5 h-3.5 text-emerald-500" />} title="Usos recomendados">
                <div className="flex flex-wrap gap-1">
                  {result.target_uses.map((u, i) => <Badge key={i} variant="secondary" className="text-[10px]">{u}</Badge>)}
                </div>
              </Section>
            )}

            {result.compatible_crops?.length > 0 && (
              <Section icon={<Leaf className="w-3.5 h-3.5 text-green-600" />} title="Cultivos compatibles">
                <div className="flex flex-wrap gap-1">
                  {result.compatible_crops.map((c, i) => <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>)}
                </div>
              </Section>
            )}

            {result.safety_warnings?.length > 0 && (
              <Section icon={<AlertTriangle className="w-3.5 h-3.5 text-red-500" />} title="Advertencias">
                <ul className="text-xs space-y-1 list-disc list-inside text-red-700/80">
                  {result.safety_warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </Section>
            )}

            {result.protective_equipment?.length > 0 && (
              <Section icon={<Shield className="w-3.5 h-3.5 text-amber-600" />} title="Equipo de protección">
                <div className="flex flex-wrap gap-1">
                  {result.protective_equipment.map((p, i) => <Badge key={i} className="bg-amber-500/15 text-amber-700 text-[10px]">{p}</Badge>)}
                </div>
              </Section>
            )}

            {result.expert_tips && (
              <Section icon={<Sparkles className="w-3.5 h-3.5 text-primary" />} title="Consejos del experto IA">
                <p className="text-xs text-muted-foreground italic">{result.expert_tips}</p>
              </Section>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-3">
    <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">{icon}{title}</p>
    {children}
  </div>
);

export default ProductLabelScan;
