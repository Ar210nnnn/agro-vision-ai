import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, Loader2, Eye, EyeOff, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  isAnalyzing: boolean;
}

const WebcamCapture = ({ onCapture, isAnalyzing }: WebcamCaptureProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();

  const handleUserMedia = useCallback(() => {
    setHasPermission(true);
  }, []);

  const handleUserMediaError = useCallback(() => {
    setHasPermission(false);
    toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [onCapture]);

  // Auto-scan every 3 seconds
  useEffect(() => {
    if (autoScan && hasPermission && !isAnalyzing) {
      intervalRef.current = setInterval(() => {
        if (!isAnalyzing) {
          capture();
        }
      }, 3000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoScan, hasPermission, isAnalyzing, capture]);

  const toggleAutoScan = () => {
    if (!autoScan) {
      setAutoScan(true);
      capture(); // capture immediately
      toast.success('Escaneo automático activado');
    } else {
      setAutoScan(false);
      toast.info('Escaneo automático desactivado');
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-primary/20 bg-black">
      {/* Scanning overlay */}
      {autoScan && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-4 border-2 border-accent/60 rounded-xl animate-pulse" />
          <div className="absolute top-3 right-3 flex items-center gap-2 bg-accent/90 text-accent-foreground px-3 py-1.5 rounded-full text-xs font-bold">
            <Scan className="w-3 h-3 animate-spin" />
            ESCANEANDO
          </div>
        </div>
      )}

      {/* Analyzing overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span className="text-sm font-semibold">Analizando con IA...</span>
          </div>
        </div>
      )}

      <div className="relative aspect-video">
        {hasPermission === false ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-muted">
            <Camera className="w-16 h-16 mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">No se pudo acceder a la cámara</p>
            <p className="text-sm text-muted-foreground">
              Permite el acceso a la cámara en tu navegador
            </p>
          </div>
        ) : (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.8}
            className="w-full h-full object-cover"
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            videoConstraints={{
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: isMobile ? { exact: "environment" } : "user"
            }}
          />
        )}
      </div>

      {/* Controls */}
      {hasPermission && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
          <Button
            onClick={capture}
            disabled={isAnalyzing}
            size="lg"
            className="gradient-primary shadow-lg hover:scale-105 transition-smooth rounded-full px-6"
          >
            <Camera className="mr-2 h-5 w-5" />
            Capturar
          </Button>
          <Button
            onClick={toggleAutoScan}
            variant={autoScan ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full px-6 shadow-lg"
          >
            {autoScan ? (
              <>
                <EyeOff className="mr-2 h-5 w-5" />
                Detener
              </>
            ) : (
              <>
                <Eye className="mr-2 h-5 w-5" />
                Auto-Scan
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
