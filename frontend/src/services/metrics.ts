import api from './api';

export interface Metric {
  id: number;
  name: string;
  description?: string;
  type: string;
  value?: number;
  value_text?: string;
  unit?: string;
  is_realtime: boolean;
  threshold_warning?: number;
  threshold_critical?: number;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface MetricHistory {
  metric_id: number;
  metric_name: string;
  unit?: string;
  period: {
    start_date: string;
    end_date: string;
    granularity: string;
  };
  data: {
    period: string;
    avg_value: number;
    min_value: number;
    max_value: number;
    count: number;
  }[];
}

export interface KPIItem {
  id: number;
  name: string;
  description?: string;
  current_value?: number;
  current_value_text?: string;
  unit?: string;
  type: string;
  category?: string;
  percent_change?: number;
  trend: string;
  history?: {
    period: string;
    avg_value?: number;
    min_value?: number;
    max_value?: number;
    count: number;
  }[];
}

export interface KPISummary {
  metrics: KPIItem[];
  period: {
    start_date: string;
    end_date: string;
    granularity: string;
  };
}

export interface AlertSummary {
  total_active: number;
  critical: number;
  warning: number;
  acknowledged: number;
  unacknowledged: number;
  recent_24h: number;
  timestamp: string;
}

export interface TimeComparison {
  metrics: {
    metric_id: number;
    name: string;
    description?: string;
    unit?: string;
    current_period: {
      data: any[];
      stats: {
        avg: number;
        min: number;
        max: number;
        count: number;
      };
    };
    previous_period: {
      data: any[];
      stats: {
        avg: number;
        min: number;
        max: number;
        count: number;
      };
    };
    comparison: {
      percent_change?: number;
      trend: string;
    };
  }[];
  periods: {
    current: {
      start: string;
      end: string;
    };
    previous: {
      start: string;
      end: string;
    };
  };
}

export interface MetricFilter {
  startDate?: Date;
  endDate?: Date;
  last_n_days?: number;
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  category?: string;
}

class MetricsService {
  /**
   * Obtém todas as métricas disponíveis
   */
  static async getMetrics(category?: string, metricType?: string): Promise<Metric[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (metricType) params.append('metric_type', metricType);
    
    const response = await api.get(`/metrics?${params.toString()}`);
    return response.data;
  }

  /**
   * Obtém o resumo dos KPIs principais
   */
  static async getKPISummary(filter?: MetricFilter): Promise<KPISummary> {
    const params = new URLSearchParams();
    
    if (filter?.startDate) params.append('start_date', filter.startDate.toISOString());
    if (filter?.endDate) params.append('end_date', filter.endDate.toISOString());
    if (filter?.last_n_days) params.append('last_n_days', filter.last_n_days.toString());
    if (filter?.granularity) params.append('granularity', filter.granularity);
    
    const response = await api.get(`/metrics/kpi-summary?${params.toString()}`);
    return response.data;
  }

  /**
   * Obtém o histórico de uma métrica específica
   */
  static async getMetricHistory(
    metricId: number, 
    filter?: MetricFilter
  ): Promise<MetricHistory> {
    const params = new URLSearchParams();
    
    if (filter?.startDate) params.append('start_date', filter.startDate.toISOString());
    if (filter?.endDate) params.append('end_date', filter.endDate.toISOString());
    if (filter?.last_n_days) params.append('last_n_days', filter.last_n_days.toString());
    if (filter?.granularity) params.append('granularity', filter.granularity);
    
    const response = await api.get(`/metrics/${metricId}/history?${params.toString()}`);
    return response.data;
  }

  /**
   * Obtém comparação de métricas entre dois períodos de tempo
   */
  static async getMetricsTimeComparison(
    metricIds: number[],
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    previousPeriodStart?: Date,
    previousPeriodEnd?: Date
  ): Promise<TimeComparison> {
    const params = new URLSearchParams();
    
    // Adiciona IDs das métricas (pode ser múltiplos)
    metricIds.forEach(id => params.append('metric_ids', id.toString()));
    
    // Adiciona períodos
    params.append('current_period_start', currentPeriodStart.toISOString());
    params.append('current_period_end', currentPeriodEnd.toISOString());
    
    if (previousPeriodStart) params.append('previous_period_start', previousPeriodStart.toISOString());
    if (previousPeriodEnd) params.append('previous_period_end', previousPeriodEnd.toISOString());
    
    const response = await api.get(`/metrics/time-comparison?${params.toString()}`);
    return response.data;
  }

  /**
   * Obtém métricas em tempo real
   */
  static async getRealtimeMetrics(): Promise<any> {
    const response = await api.get('/metrics/realtime');
    return response.data;
  }

  /**
   * Obtém resumo dos alertas ativos
   */
  static async getAlertsSummary(): Promise<AlertSummary> {
    const response = await api.get('/metrics/alerts/summary');
    return response.data;
  }

  /**
   * Limpa o cache de métricas (apenas para admins)
   */
  static async clearCache(pattern: string = 'metrics:*'): Promise<any> {
    const response = await api.post(`/metrics/cache/clear?pattern=${pattern}`);
    return response.data;
  }
}

export default MetricsService;
