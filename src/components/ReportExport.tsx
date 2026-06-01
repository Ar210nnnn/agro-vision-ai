import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const ReportExport = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('plant_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (user) q = q.eq('user_id', user.id);
      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error('Aún no hay análisis para reportar');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(34, 139, 87);
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Agro Inteligente', 14, 13);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Reporte Fitosanitario Profesional', 14, 21);

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      const dateStr = new Date().toLocaleString('es-ES');
      doc.text(`Generado: ${dateStr}`, 14, 36);
      if (user?.email) doc.text(`Usuario: ${user.email}`, 14, 42);

      // Summary stats
      const total = data.length;
      const healthy = data.filter(d => /saludable/i.test(d.health_status)).length;
      const sick = data.filter(d => /enferma|crítica/i.test(d.health_status)).length;
      const avgConf = Math.round(data.reduce((s, d) => s + (Number(d.confidence) || 0), 0) / total);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen Ejecutivo', 14, 54);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Total de análisis: ${total}`, 14, 62);
      doc.text(`Plantas saludables: ${healthy}`, 14, 68);
      doc.text(`Plantas con problemas: ${sick}`, 14, 74);
      doc.text(`Confianza promedio IA: ${avgConf}%`, 14, 80);

      // Table
      autoTable(doc, {
        startY: 90,
        head: [['Fecha', 'Planta', 'Estado', 'Conf.', 'Diagnóstico']],
        body: data.map(d => [
          new Date(d.created_at).toLocaleDateString('es-ES'),
          (d.plant_type || '—').substring(0, 25),
          d.health_status || '—',
          `${d.confidence || 0}%`,
          (d.diagnosis || '').substring(0, 80),
        ]),
        headStyles: { fillColor: [34, 139, 87], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 250, 247] },
        columnStyles: { 4: { cellWidth: 70 } },
        margin: { left: 14, right: 14 },
      });

      // Detailed pages
      for (let i = 0; i < Math.min(data.length, 20); i++) {
        const d = data[i];
        doc.addPage();
        doc.setFillColor(34, 139, 87);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Análisis #${i + 1}`, 14, 8);

        doc.setTextColor(40, 40, 40);
        doc.setFontSize(14);
        doc.text(d.plant_type || 'Planta', 14, 24);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${new Date(d.created_at).toLocaleString('es-ES')}`, 14, 31);
        doc.text(`Estado: ${d.health_status}  ·  Confianza: ${d.confidence || 0}%`, 14, 37);
        if (d.plant_nickname) doc.text(`Nombre: ${d.plant_nickname}`, 14, 43);

        let y = 52;
        const block = (title: string, body: string) => {
          if (!body) return;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(title, 14, y);
          y += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const lines = doc.splitTextToSize(body, pageWidth - 28);
          doc.text(lines, 14, y);
          y += lines.length * 5 + 4;
        };

        block('Diagnóstico', d.diagnosis || '');
        block('Recomendaciones', d.recommendations || '');
      }

      // Footer page numbers
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${p} / ${pageCount} · Agro Inteligente`, pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
      }

      doc.save(`reporte-agro-${Date.now()}.pdf`);
      toast.success('Reporte PDF generado');
    } catch (e) {
      console.error(e);
      toast.error('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 to-emerald-500/5 border border-primary/20 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Reporte profesional PDF</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            Exporta tu historial fitosanitario completo con resumen, tabla y fichas detalladas.
          </p>
          <Button onClick={generate} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {loading ? 'Generando…' : 'Descargar PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportExport;
