import jsPDF from 'jspdf';

interface Detection { label: string; severity: string; box: { x: number; y: number; w: number; h: number } }
interface ClimateRisk { condition: string; trigger: string; level: string }

export interface ReportData {
  plant_type: string;
  health_status: string;
  confidence: number;
  diagnosis: string;
  recommendations: string;
  issues?: string[];
  detections?: Detection[];
  climate_risks?: ClimateRisk[];
  environment_ideal?: { temp_c: string; humidity_pct: string; light: string };
  pigmentation?: { leaf_color: string; indicators: string[] };
}

const SEVERITY_COLOR: Record<string, [number, number, number]> = {
  high: [220, 38, 38],
  medium: [245, 158, 11],
  low: [16, 185, 129],
};

// Render image + bounding boxes onto a canvas and return a dataURL + thumbnails per detection.
async function composeImage(imageSrc: string, detections: Detection[] = []) {
  return new Promise<{ main: string; thumbs: { label: string; severity: string; data: string }[]; w: number; h: number }>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      detections.forEach((d) => {
        const x = d.box.x * W, y = d.box.y * H, w = d.box.w * W, h = d.box.h * H;
        const c = SEVERITY_COLOR[d.severity?.toLowerCase()] || [59, 130, 246];
        ctx.lineWidth = Math.max(3, W * 0.004);
        ctx.strokeStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.85)`;
        const label = `${d.label} · ${d.severity}`;
        ctx.font = `bold ${Math.max(14, W * 0.018)}px sans-serif`;
        const tw = ctx.measureText(label).width + 12;
        const th = Math.max(20, W * 0.025);
        ctx.fillRect(x, Math.max(0, y - th), tw, th);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, x + 6, Math.max(th - 6, y - 6));
      });

      // Thumbs per detection
      const thumbs = detections.slice(0, 8).map((d) => {
        const x = d.box.x * W, y = d.box.y * H, w = d.box.w * W, h = d.box.h * H;
        const pad = Math.min(W, H) * 0.04;
        const sx = Math.max(0, x - pad), sy = Math.max(0, y - pad);
        const sw = Math.min(W - sx, w + pad * 2), sh = Math.min(H - sy, h + pad * 2);
        const tc = document.createElement('canvas');
        const TS = 280;
        const ratio = sw / sh;
        tc.width = TS; tc.height = Math.round(TS / ratio);
        tc.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, tc.width, tc.height);
        return { label: d.label, severity: d.severity, data: tc.toDataURL('image/jpeg', 0.85) };
      });

      resolve({ main: canvas.toDataURL('image/jpeg', 0.85), thumbs, w: W, h: H });
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

export async function generatePlantReport(data: ReportData, capturedImage?: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - M) { doc.addPage(); y = M; }
  };

  // Header band
  doc.setFillColor(16, 122, 87);
  doc.rect(0, 0, PAGE_W, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text('Agro Inteligente', M, 32);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Reporte de diagnóstico fitosanitario', M, 50);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString('es'), PAGE_W - M, 50, { align: 'right' });
  y = 90;

  // Title row
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(data.plant_type || 'Planta desconocida', M, y);
  y += 18;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Estado: ${data.health_status}  ·  Confianza: ${data.confidence}%`, M, y);
  y += 16;

  // Main image with overlay
  if (capturedImage) {
    try {
      const composed = await composeImage(capturedImage, data.detections);
      const maxW = PAGE_W - M * 2;
      const maxH = 260;
      const ratio = composed.w / composed.h;
      let iw = maxW, ih = maxW / ratio;
      if (ih > maxH) { ih = maxH; iw = maxH * ratio; }
      ensureSpace(ih + 10);
      doc.addImage(composed.main, 'JPEG', M, y, iw, ih);
      y += ih + 14;

      // Detection thumbnails
      if (composed.thumbs.length) {
        ensureSpace(24);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20, 20, 20);
        doc.text(`Detecciones (${composed.thumbs.length})`, M, y); y += 14;
        const cols = 4, gap = 8;
        const tw = (PAGE_W - M * 2 - gap * (cols - 1)) / cols;
        composed.thumbs.forEach((t, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          if (col === 0 && row > 0) y += tw + 32;
          ensureSpace(tw + 32);
          const x = M + col * (tw + gap);
          doc.addImage(t.data, 'JPEG', x, y, tw, tw);
          const c = SEVERITY_COLOR[t.severity?.toLowerCase()] || [59, 130, 246];
          doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(1.5);
          doc.rect(x, y, tw, tw);
          doc.setFontSize(8); doc.setTextColor(40, 40, 40); doc.setFont('helvetica', 'bold');
          doc.text(t.label.slice(0, 28), x, y + tw + 10);
          doc.setFont('helvetica', 'normal'); doc.setTextColor(c[0], c[1], c[2]);
          doc.text(`Severidad: ${t.severity}`, x, y + tw + 22);
        });
        y += tw + 32;
      }
    } catch { /* image failed, skip */ }
  }

  const section = (title: string) => {
    ensureSpace(28);
    doc.setFillColor(240, 247, 243);
    doc.rect(M, y, PAGE_W - M * 2, 22, 'F');
    doc.setTextColor(16, 122, 87); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(title, M + 8, y + 15);
    y += 30;
    doc.setTextColor(40, 40, 40); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  };

  const paragraph = (text: string) => {
    const lines = doc.splitTextToSize(text, PAGE_W - M * 2);
    ensureSpace(lines.length * 13);
    doc.text(lines, M, y);
    y += lines.length * 13 + 6;
  };

  // Diagnosis
  section('Diagnóstico');
  paragraph(data.diagnosis || '—');

  // Issues
  if (data.issues?.length) {
    section(`Problemas detectados (${data.issues.length})`);
    data.issues.forEach((it) => {
      const lines = doc.splitTextToSize(`• ${it}`, PAGE_W - M * 2 - 8);
      ensureSpace(lines.length * 13);
      doc.text(lines, M + 4, y);
      y += lines.length * 13 + 2;
    });
    y += 4;
  }

  // Pigmentation
  if (data.pigmentation && data.pigmentation.leaf_color !== 'N/A') {
    section('Pigmentación');
    paragraph(data.pigmentation.leaf_color);
    if (data.pigmentation.indicators?.length) paragraph(`Indicadores: ${data.pigmentation.indicators.join(', ')}`);
  }

  // Recommendations
  section('Recomendaciones');
  paragraph(data.recommendations || '—');

  // Climate risks
  if (data.climate_risks?.length) {
    section('Riesgos climáticos predictivos');
    data.climate_risks.forEach((r) => {
      ensureSpace(40);
      const c = SEVERITY_COLOR[r.level?.toLowerCase()] || [100, 100, 100];
      doc.setFillColor(c[0], c[1], c[2]);
      doc.rect(M, y, 4, 32, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
      doc.text(`${r.condition}  [${r.level?.toUpperCase()}]`, M + 10, y + 12);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(r.trigger, PAGE_W - M * 2 - 14);
      doc.text(lines, M + 10, y + 24);
      y += 38;
    });
  }

  if (data.environment_ideal) {
    section('Condiciones ideales');
    paragraph(`Temperatura: ${data.environment_ideal.temp_c}°C  ·  Humedad: ${data.environment_ideal.humidity_pct}%  ·  Luz: ${data.environment_ideal.light}`);
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(140, 140, 140);
    doc.text('Generado por Agro Inteligente · IA fitosanitaria', M, PAGE_H - 18);
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - M, PAGE_H - 18, { align: 'right' });
  }

  const safe = (data.plant_type || 'planta').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  doc.save(`reporte_${safe}_${Date.now()}.pdf`);
}
