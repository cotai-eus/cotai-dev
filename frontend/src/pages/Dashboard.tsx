import React, { useState, useEffect, useCallback } from 'react';
import { 
  Grid, 
  Typography, 
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import { Refresh, AnalyticsOutlined, ShowChart, PieChart } from '@mui/icons-material';
import "react-datepicker/dist/react-datepicker.css";

// Importando componentes personalizados do dashboard
import MetricCard from '../components/dashboard/MetricCard';
import TimeFilter, { FilterState, DateRange } from '../components/dashboard/TimeFilter';
import DashboardChart, { MetricDataPoint } from '../components/dashboard/DashboardChart';
import Recommendations, { RecommendationData } from '../components/dashboard/Recommendations';

// Importando serviços e utilitários
import MetricsService, { KPIItem, MetricFilter } from '../services/metrics';
import ReportExporter from '../utils/ReportExporter';
import { subDays, format as formatDate } from 'date-fns';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estados para armazenar os dados
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<KPIItem[]>([]);
  const [chartData, setChartData] = useState<MetricDataPoint[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);
  
  // Estado para controlar filtros
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      label: 'Últimos 30 dias'
    },
    category: '',
    view: ''
  });
  
  // Estado para notificações
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Carregar métricas do dashboard
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Converter filtros para o formato esperado pela API
      const metricFilter: MetricFilter = {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
        category: filters.category || undefined
      };
      
      // Carregar resumo dos KPIs
      const kpiData = await MetricsService.getKPISummary(metricFilter);
      setMetrics(kpiData.metrics);
      
      // Carregar dados para os gráficos
      // Exemplo: carregar histórico da métrica de cotações
      if (kpiData.metrics.length > 0) {
        const quotationMetric = kpiData.metrics.find(m => m.name.includes('Cotações') || m.category === 'cotacoes');
        const successRateMetric = kpiData.metrics.find(m => m.name.includes('Sucesso') || m.category === 'desempenho');
        const savingsMetric = kpiData.metrics.find(m => m.name.includes('Economia') || m.category === 'financeiro');
        
        if (quotationMetric && quotationMetric.history) {
          // Transformar o histórico em dados para o gráfico
          const chartPoints: MetricDataPoint[] = quotationMetric.history.map(h => ({
            date: h.period,
            cotacoes: h.avg_value || 0,
            // Adicionar outros dados se disponíveis
            taxaSucesso: successRateMetric?.history?.find(item => item.period === h.period)?.avg_value || 0,
            economia: savingsMetric?.history?.find(item => item.period === h.period)?.avg_value || 0
          }));
          
          setChartData(chartPoints);
        }
      }
      
      // Gerar recomendações baseadas nas métricas
      // Aqui seria ideal uma API específica, mas vamos simular por enquanto
      generateRecommendations(kpiData.metrics);
      
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError('Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Efeito para carregar dados ao montar o componente e quando os filtros mudarem
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Função para exportar relatório
  const handleExportReport = () => {
    try {
      // Configura dados para o relatório
      const reportConfig = {
        title: 'Relatório do Dashboard',
        subtitle: 'Desempenho e Métricas de Cotações',
        period: {
          startDate: filters.dateRange.startDate,
          endDate: filters.dateRange.endDate
        },
        metrics: metrics.map(m => ({
          name: m.name,
          value: m.current_value || m.current_value_text || '0',
          unit: m.unit,
          percentChange: m.percent_change
        })),
        charts: [{
          title: 'Desempenho de Cotações',
          data: chartData,
          columns: [
            { header: 'Data', dataKey: 'date' },
            { header: 'Cotações', dataKey: 'cotacoes' },
            { header: 'Taxa de Sucesso', dataKey: 'taxaSucesso' },
            { header: 'Economia', dataKey: 'economia' }
          ]
        }],
        companyName: 'CotAi - Sistema Inteligente de Gestão de Cotações'
      };
      
      // Exporta para PDF
      ReportExporter.exportToPDF(reportConfig);
      
      // Mostra notificação de sucesso
      setNotification({
        open: true,
        message: 'Relatório exportado com sucesso!',
        severity: 'success'
      });
    } catch (err) {
      console.error('Erro ao exportar relatório:', err);
      setNotification({
        open: true,
        message: 'Erro ao exportar relatório. Tente novamente.',
        severity: 'error'
      });
    }
  };

  // Função para atualizar dados
  const handleRefresh = () => {
    loadDashboardData();
    setNotification({
      open: true,
      message: 'Dados atualizados!',
      severity: 'success'
    });
  };

  // Função para gerar recomendações baseadas nas métricas
  const generateRecommendations = (kpiMetrics: KPIItem[]) => {
    const recommendations: RecommendationData[] = [];
    
    // Exemplo: se a taxa de sucesso estiver abaixo de 70%, recomenda revisar estratégia
    const successRateMetric = kpiMetrics.find(m => m.name.includes('Sucesso'));
    if (successRateMetric && successRateMetric.current_value && successRateMetric.current_value < 70) {
      recommendations.push({
        id: 'rec-1',
        title: 'Melhore sua taxa de sucesso',
        description: 'A taxa de sucesso está abaixo do esperado. Considere revisar sua estratégia de cotação.',
        impact: 'high',
        status: 'negative',
        metric: {
          name: 'Taxa de Sucesso',
          value: successRateMetric.current_value,
          change: successRateMetric.percent_change
        },
        actionText: 'Ver análise detalhada',
        actionPath: '/analytics/success-rate'
      });
    }
    
    // Exemplo: se houver muitas cotações pendentes, sugere acelerar o processamento
    const pendingQuotesMetric = kpiMetrics.find(m => m.name.includes('Pendentes'));
    if (pendingQuotesMetric && pendingQuotesMetric.current_value && pendingQuotesMetric.current_value > 10) {
      recommendations.push({
        id: 'rec-2',
        title: 'Cotações pendentes acima do normal',
        description: 'Há um volume alto de cotações pendentes. Considere acelerar o processamento.',
        impact: 'medium',
        status: 'warning',
        metric: {
          name: 'Cotações Pendentes',
          value: pendingQuotesMetric.current_value
        },
        actionText: 'Ver cotações pendentes',
        actionPath: '/quotations/pending'
      });
    }
    
    // Exemplo: se a economia estiver acima da média, parabeniza
    const savingsMetric = kpiMetrics.find(m => m.name.includes('Economia'));
    if (savingsMetric && savingsMetric.percent_change && savingsMetric.percent_change > 10) {
      recommendations.push({
        id: 'rec-3',
        title: 'Economia acima da média',
        description: 'Suas economias estão acima da média. Continue com a estratégia atual.',
        impact: 'low',
        status: 'positive',
        metric: {
          name: 'Economia Total',
          value: savingsMetric.current_value || 0,
          change: savingsMetric.percent_change
        }
      });
    }
    
    // Adiciona uma recomendação padrão
    recommendations.push({
      id: 'rec-4',
      title: 'Aprimore suas estratégias com IA',
      description: 'Utilize recursos de IA para melhorar a performance de suas cotações.',
      impact: 'medium',
      status: 'info',
      actionText: 'Explorar recursos de IA',
      actionPath: '/ai-tools'
    });
    
    setRecommendations(recommendations);
  };

  // Função para manipular a ação de uma recomendação
  const handleRecommendationAction = (id: string) => {
    console.log(`Ação da recomendação ${id} clicada`);
    // Aqui você pode implementar a navegação ou ação específica
  };

  // Função para manipular mudanças nos filtros
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  // Fecha a notificação
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Renderizar os cards de métricas
  const renderMetricCards = () => {
    const pendingQuotesMetric = metrics.find(m => m.name.includes('Pendentes'));
    const successRateMetric = metrics.find(m => m.name.includes('Sucesso'));
    const savingsMetric = metrics.find(m => m.name.includes('Economia'));
    
    return (
      <>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Cotações Pendentes"
            value={pendingQuotesMetric?.current_value || 0}
            description="Número de cotações aguardando processamento ou resposta"
            percentChange={pendingQuotesMetric?.percent_change}
            loading={loading}
            icon={<AnalyticsOutlined />}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Taxa de Sucesso"
            value={successRateMetric?.current_value || 0}
            unit="%"
            description="Percentual de cotações com pelo menos uma resposta válida"
            percentChange={successRateMetric?.percent_change}
            loading={loading}
            icon={<ShowChart />}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Economia Total"
            value={savingsMetric?.current_value_text || `R$ ${savingsMetric?.current_value || 0}`}
            description="Economia total obtida com o sistema"
            percentChange={savingsMetric?.percent_change}
            loading={loading}
            icon={<PieChart />}
          />
        </Grid>
      </>
    );
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        
        <Tooltip title="Atualizar dados">
          <IconButton 
            onClick={handleRefresh}
            disabled={loading}
          >
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Filtros de tempo */}
      <TimeFilter
        onFilterChange={handleFilterChange}
        onExport={handleExportReport}
        onRefresh={handleRefresh}
        categories={['cotacoes', 'desempenho', 'financeiro']}
        views={['Diário', 'Semanal', 'Mensal']}
        loading={loading}
      />
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="retry"
              color="inherit"
              size="small"
              onClick={handleRefresh}
            >
              <Refresh fontSize="inherit" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Cards de métricas */}
        {renderMetricCards()}
        
        {/* Gráfico principal */}
        <Grid item xs={12} lg={8}>
          <DashboardChart
            title="Desempenho de Cotações"
            description="Evolução dos principais indicadores ao longo do tempo"
            data={chartData}
            series={[
              { key: 'cotacoes', name: 'Cotações', color: '#4169E1', type: 'bar' },
              { key: 'taxaSucesso', name: 'Taxa de Sucesso (%)', color: '#32CD32', type: 'line' },
              { key: 'economia', name: 'Economia (R$)', color: '#FF8C00', type: 'area' }
            ]}
            loading={loading}
            height={isMobile ? 300 : 400}
            onExport={handleExportReport}
          />
        </Grid>
        
        {/* Recomendações */}
        <Grid item xs={12} lg={4}>
          <Recommendations
            recommendations={recommendations}
            loading={loading}
            maxItems={5}
            onActionClick={handleRecommendationAction}
          />
        </Grid>
        
        {/* Cotações por status e categoria em formato de chart */}
        <Grid item xs={12} md={6}>
          <DashboardChart
            title="Cotações por Status"
            description="Distribuição das cotações por status atual"
            data={[
              { date: 'Jan', pendentes: 10, respondidas: 32, finalizadas: 45 },
              { date: 'Fev', pendentes: 15, respondidas: 40, finalizadas: 60 },
              { date: 'Mar', pendentes: 12, respondidas: 35, finalizadas: 50 },
              { date: 'Abr', pendentes: 8, respondidas: 45, finalizadas: 55 },
              { date: 'Mai', pendentes: 14, respondidas: 50, finalizadas: 62 },
              { date: 'Jun', pendentes: 18, respondidas: 38, finalizadas: 58 }
            ]}
            series={[
              { key: 'pendentes', name: 'Pendentes', color: '#FFA500', type: 'bar' },
              { key: 'respondidas', name: 'Respondidas', color: '#4682B4', type: 'bar' },
              { key: 'finalizadas', name: 'Finalizadas', color: '#32CD32', type: 'bar' }
            ]}
            loading={loading}
            height={300}
          />
        </Grid>
        
        {/* Economia por categoria */}
        <Grid item xs={12} md={6}>
          <DashboardChart
            title="Economia por Categoria"
            description="Distribuição da economia por categoria de produtos"
            data={[
              { date: 'Jan', materiais: 5000, servicos: 8000, equipamentos: 12000 },
              { date: 'Fev', materiais: 6500, servicos: 7800, equipamentos: 10500 },
              { date: 'Mar', materiais: 7800, servicos: 9200, equipamentos: 11000 },
              { date: 'Abr', materiais: 8500, servicos: 10500, equipamentos: 13500 },
              { date: 'Mai', materiais: 9200, servicos: 11000, equipamentos: 14800 },
              { date: 'Jun', materiais: 10500, servicos: 12500, equipamentos: 16000 }
            ]}
            series={[
              { key: 'materiais', name: 'Materiais', color: '#6A5ACD', type: 'area' },
              { key: 'servicos', name: 'Serviços', color: '#20B2AA', type: 'area' },
              { key: 'equipamentos', name: 'Equipamentos', color: '#CD5C5C', type: 'area' }
            ]}
            loading={loading}
            height={300}
          />
        </Grid>
      </Grid>
      
      {/* Notificação de feedback */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={4000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;
