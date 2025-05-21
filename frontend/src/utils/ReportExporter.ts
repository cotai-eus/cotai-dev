import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MetricData {
  name: string;
  value: string | number;
  unit?: string;
  percentChange?: number;
}

interface ChartData {
  title: string;
  data: Record<string, any>[];
  columns: {
    header: string;
    dataKey: string;
  }[];
}

interface ReportConfig {
  title: string;
  subtitle?: string;
  period?: {
    startDate: Date;
    endDate: Date;
  };
  metrics?: MetricData[];
  charts?: ChartData[];
  logo?: string;
  companyName?: string;
}

const COLORS = {
  PRIMARY: [41, 98, 255],
  SECONDARY: [76, 76, 76],
  TEXT: [33, 33, 33],
  LIGHT_TEXT: [117, 117, 117],
  BACKGROUND: [245, 245, 245],
  SUCCESS: [76, 175, 80],
  ERROR: [244, 67, 54],
};

class ReportExporter {
  /**
   * Exporta um relatório em PDF com métricas e gráficos do dashboard
   */
  static exportToPDF(config: ReportConfig): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // Adiciona cabeçalho com logo e título
    this.addHeader(doc, config, currentY);
    currentY += 30;

    // Adiciona período do relatório
    if (config.period) {
      this.addPeriodInfo(doc, config.period, currentY);
      currentY += 20;
    }

    // Adiciona métricas principais
    if (config.metrics && config.metrics.length > 0) {
      this.addMetricsTable(doc, config.metrics, currentY);
      currentY += config.metrics.length * 12 + 20;
    }

    // Adiciona dados de gráficos como tabelas
    if (config.charts && config.charts.length > 0) {
      for (const chart of config.charts) {
        // Verifica se precisa adicionar uma nova página
        if (currentY > pageHeight - 50) {
          doc.addPage();
          currentY = margin;
        }

        this.addChartData(doc, chart, currentY);
        currentY += chart.data.length * 10 + 40; // Altura da tabela + espaço
      }
    }

    // Adiciona rodapé
    this.addFooter(doc, config);

    // Salva o PDF
    const fileName = `cotai_dashboard_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  }

  private static addHeader(doc: jsPDF, config: ReportConfig, y: number): void {
    // Logo (opcional)
    if (config.logo) {
      try {
        doc.addImage(config.logo, 'PNG', 20, y, 30, 15);
      } catch (e) {
        console.error('Erro ao adicionar logo:', e);
      }
    }

    // Título do relatório
    doc.setFontSize(20);
    doc.setTextColor(...COLORS.PRIMARY);
    doc.text(config.title, config.logo ? 60 : 20, y + 10);

    // Subtítulo (opcional)
    if (config.subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.LIGHT_TEXT);
      doc.text(config.subtitle, config.logo ? 60 : 20, y + 20);
    }

    // Linha separadora
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setDrawColor(...COLORS.LIGHT_TEXT);
    doc.line(20, y + 25, pageWidth - 20, y + 25);
  }

  private static addPeriodInfo(doc: jsPDF, period: { startDate: Date; endDate: Date }, y: number): void {
    // Formata as datas no padrão brasileiro
    const startDateFormatted = format(period.startDate, 'dd/MM/yyyy', { locale: ptBR });
    const endDateFormatted = format(period.endDate, 'dd/MM/yyyy', { locale: ptBR });

    doc.setFontSize(11);
    doc.setTextColor(...COLORS.SECONDARY);
    doc.text(`Período: ${startDateFormatted} a ${endDateFormatted}`, 20, y);
  }

  private static addMetricsTable(doc: jsPDF, metrics: MetricData[], y: number): void {
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.PRIMARY);
    doc.text('Métricas Principais', 20, y);

    const tableData = metrics.map(metric => [
      metric.name,
      `${metric.value}${metric.unit ? ' ' + metric.unit : ''}`,
      metric.percentChange !== undefined ? `${metric.percentChange > 0 ? '+' : ''}${metric.percentChange}%` : '',
    ]);

    autoTable(doc, {
      startY: y + 5,
      head: [['Métrica', 'Valor', 'Variação']],
      body: tableData,
      headStyles: {
        fillColor: COLORS.PRIMARY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 50, halign: 'right' },
        2: { cellWidth: 40, halign: 'right' },
      },
      styles: {
        cellPadding: 5,
        fontSize: 10,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
    });
  }

  private static addChartData(doc: jsPDF, chart: ChartData, y: number): void {
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.PRIMARY);
    doc.text(chart.title, 20, y);

    // Prepara dados para a tabela
    const head = chart.columns.map(col => col.header);
    const body = chart.data.map(row => {
      return chart.columns.map(col => {
        const value = row[col.dataKey];
        
        // Formata datas se necessário
        if (col.dataKey === 'date' && value instanceof Date) {
          return format(value, 'dd/MM/yyyy', { locale: ptBR });
        }
        
        // Formata números se necessário
        if (typeof value === 'number') {
          return value.toLocaleString('pt-BR');
        }
        
        return value;
      });
    });

    autoTable(doc, {
      startY: y + 5,
      head: [head],
      body: body,
      headStyles: {
        fillColor: COLORS.PRIMARY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        cellPadding: 4,
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
    });
  }

  private static addFooter(doc: jsPDF, config: ReportConfig): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Linha separadora
    doc.setDrawColor(...COLORS.LIGHT_TEXT);
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
    
    // Informação da empresa
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.LIGHT_TEXT);
    
    const companyName = config.companyName || 'CotAi - Sistema de Gestão de Cotações';
    const generatedDate = `Relatório gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
    
    doc.text(companyName, 20, pageHeight - 10);
    doc.text(generatedDate, pageWidth - 20, pageHeight - 10, { align: 'right' });
  }
}

export default ReportExporter;
