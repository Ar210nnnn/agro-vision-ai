import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, Loader2, Scan, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  isAnalyzing: boolean;
}

const WebcamCapture = ({ onCapture, isAnalyzing }: WebcamCaptureProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMobile = useIsMobile();
  const [scanCount, setScanCount] = useState(0);

  const handleUserMedia = useCallback(() => {
    setHasPermission(true);
    toast.success('Cámara conectada — escaneo automático iniciado');
  }, []);

  const handleUserMediaError = useCallback(() => {
    setHasPermission(false);
    toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setScanCount(prev => prev + 1);
      onCapture(imageSrc);
    }
  }, [onCapture]);

  // Auto-scan: starts automatically when camera is ready, pauses during analysis
  useEffect(() => {
    if (hasPermission && !isAnalyzing) {
      // Wait 2 seconds then capture
      const timeout = setTimeout(() => {
        capture();
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [hasPermission, isAnalyzing, capture, scanCount]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black shadow-card group">
      {/* Live indicator */}
      {hasPermission && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            EN VIVO
          </div>
          {isAnalyzing ? (
            <div className="flex items-center gap-1.5 bg-accent/90 backdrop-blur-md text-accent-foreground px-3 py-1.5 rounded-full text-xs font-bold">
              <Loader2 className="w-3 h-3 animate-spin" />
              ANALIZANDO...
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-primary/80 backdrop-blur-md text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium">
              <Scan className="w-3 h-3" />
              AUTO-SCAN
            </div>
          )}
        </div>
      )}

      {/* Scan count */}
      {hasPermission && scanCount > 0 && (
        <div className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium">
          {scanCount} escaneos
        </div>
      )}

      {/* Scanning overlay animation */}
      {hasPermission && !isAnalyzing && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-6 border-2 border-accent/40 rounded-xl" />
          {/* Scanning line */}
          <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent animate-scan-line" />
          {/* Corner markers */}
          <div className="absolute top-6 left-6 w-6 h-6 border-t-3 border-l-3 border-accent rounded-tl-lg" />
          <div className="absolute top-6 right-6 w-6 h-6 border-t-3 border-r-3 border-accent rounded-tr-lg" />
          <div className="absolute bottom-6 left-6 w-6 h-6 border-b-3 border-l-3 border-accent rounded-bl-lg" />
          <div className="absolute bottom-6 right-6 w-6 h-6 border-b-3 border-r-3 border-accent rounded-br-lg" />
        </div>
      )}

      {/* Analyzing overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-accent/30 border-t-accent animate-spin" />
              <Scan className="w-6 h-6 text-white absolute inset-0 m-auto" />
            </div>
            <span className="text-white text-sm font-semibold bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full">
              Procesando con IA...
            </span>
          </div>
        </div>
      )}

      <div className="relative aspect-video">
        {hasPermission === false ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-muted">
            <WifiOff className="w-16 h-16 mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">No se pudo acceder a la cámara</p>
            <p className="text-sm text-muted-foreground">
              Permite el acceso a la cámara en la configuración de tu navegador
            </p>
          </div>
        ) : hasPermission === null ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-muted">
            <Camera className="w-16 h-16 mb-4 text-muted-foreground animate-pulse" />
            <p className="text-lg font-semibold mb-2">Conectando cámara...</p>
            <p className="text-sm text-muted-foreground">
              Acepta los permisos de la cámara para comenzar
            </p>
          </div>
        ) : null}
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.8}
          className={`w-full h-full object-cover ${hasPermission === null || hasPermission === false ? 'invisible' : ''}`}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          videoConstraints={{
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: isMobile ? { exact: "environment" } : "user"
          }}
        />
      </div>

      {/* Bottom status bar */}
      {hasPermission && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center justify-center gap-2 text-white/80 text-xs">
            <Wifi className="w-3 h-3" />
            <span>Escaneo automático activo — enfoca una planta para diagnosticarla</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
