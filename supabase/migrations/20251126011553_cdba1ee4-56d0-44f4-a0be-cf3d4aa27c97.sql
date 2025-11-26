-- Tabla para almacenar el historial de análisis de plantas
CREATE TABLE IF NOT EXISTS public.plant_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  plant_type TEXT,
  health_status TEXT NOT NULL,
  confidence DECIMAL(5,2),
  diagnosis TEXT NOT NULL,
  recommendations TEXT,
  image_url TEXT,
  pigmentation_data JSONB,
  metadata JSONB
);

-- Habilitar Row Level Security
ALTER TABLE public.plant_analyses ENABLE ROW LEVEL SECURITY;

-- Política para permitir que todos lean los análisis (público)
CREATE POLICY "Los análisis son visibles para todos"
  ON public.plant_analyses
  FOR SELECT
  USING (true);

-- Política para permitir inserciones (la app puede crear análisis)
CREATE POLICY "Permitir crear análisis"
  ON public.plant_analyses
  FOR INSERT
  WITH CHECK (true);

-- Índice para búsquedas rápidas por fecha
CREATE INDEX idx_plant_analyses_created_at ON public.plant_analyses(created_at DESC);

-- Índice para búsquedas por tipo de planta
CREATE INDEX idx_plant_analyses_plant_type ON public.plant_analyses(plant_type);

-- Índice para búsquedas por estado de salud
CREATE INDEX idx_plant_analyses_health_status ON public.plant_analyses(health_status);