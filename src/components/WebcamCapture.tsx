import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  isAnalyzing: boolean;
}

const WebcamCapture = ({ onCapture, isAnalyzing }: WebcamCaptureProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const isMobile = useIsMobile();

  const handleUserMedia = useCallback(() => {
    setHasPermission(true);
  }, []);

  const handleUserMediaError = useCallback(() => {
    setHasPermission(false);
    toast.error('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    } else {
      toast.error('No se pudo capturar la imagen');
    }
  }, [onCapture]);

  return (
    <Card className="overflow-hidden shadow-card">
      <div className="relative aspect-video bg-muted">
        {hasPermission === false ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <Camera className="w-16 h-16 mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No se pudo acceder a la cámara</p>
            <p className="text-sm text-muted-foreground">
              Por favor, permite el acceso a la cámara para usar esta función
            </p>
          </div>
        ) : (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            videoConstraints={{
              width: 1280,
              height: 720,
              facingMode: isMobile ? "environment" : "user"
            }}
          />
        )}
        
        {hasPermission && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <Button
              onClick={capture}
              disabled={isAnalyzing}
              size="lg"
              className="gradient-primary shadow-lg hover:scale-105 transition-smooth"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Capturar y Analizar
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default WebcamCapture;
