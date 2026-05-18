import { useEffect, useRef, useState } from 'react';

interface Detection {
  label: string;
  severity: 'high' | 'medium' | 'low' | string;
  box: { x: number; y: number; w: number; h: number };
}

interface Props {
  imageSrc: string;
  detections?: Detection[];
  showHeatmap?: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

const DetectionOverlay = ({ imageSrc, detections = [], showHeatmap = true }: Props) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      if (imgRef.current) {
        setDims({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [imageSrc]);

  return (
    <div className="relative w-full">
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Analizado"
        className="w-full h-auto rounded-xl block"
        onLoad={() => imgRef.current && setDims({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight })}
      />

      {/* Heatmap layer (radial blobs per detection) */}
      {showHeatmap && detections.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none mix-blend-multiply"
          viewBox={`0 0 ${dims.w || 1} ${dims.h || 1}`}
          preserveAspectRatio="none"
        >
          <defs>
            {detections.map((d, i) => {
              const color = SEVERITY_COLORS[d.severity] || '#888';
              return (
                <radialGradient key={i} id={`heat-${i}`}>
                  <stop offset="0%" stopColor={color} stopOpacity="0.55" />
                  <stop offset="70%" stopColor={color} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </radialGradient>
              );
            })}
          </defs>
          {detections.map((d, i) => {
            const cx = (d.box.x + d.box.w / 2) * dims.w;
            const cy = (d.box.y + d.box.h / 2) * dims.h;
            const r = Math.max(d.box.w * dims.w, d.box.h * dims.h) * 0.75;
            return <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#heat-${i})`} />;
          })}
        </svg>
      )}

      {/* Bounding boxes */}
      <div className="absolute inset-0 pointer-events-none">
        {detections.map((d, i) => {
          const color = SEVERITY_COLORS[d.severity] || '#888';
          return (
            <div
              key={i}
              className="absolute border-2 rounded-md transition-all animate-fade-in"
              style={{
                left: `${d.box.x * 100}%`,
                top: `${d.box.y * 100}%`,
                width: `${d.box.w * 100}%`,
                height: `${d.box.h * 100}%`,
                borderColor: color,
                boxShadow: `0 0 12px ${color}80, inset 0 0 12px ${color}40`,
              }}
            >
              <span
                className="absolute -top-6 left-0 text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap text-white shadow-md"
                style={{ backgroundColor: color }}
              >
                {d.label}
              </span>
              {/* Corner ticks */}
              <span className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: color }} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: color }} />
              <span className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: color }} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: color }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DetectionOverlay;
