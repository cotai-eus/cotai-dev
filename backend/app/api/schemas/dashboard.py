"""
Schemas de dados para APIs de dashboard e métricas.
"""
from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field


class MetricTypeEnum(str, Enum):
    """Tipos de métricas suportadas pelo sistema."""
    COUNT = "count"
    AGGREGATION = "aggregation"
    RATE = "rate"
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    TEMPORAL = "temporal"


class AggregationTypeEnum(str, Enum):
    """Tipos de agregação de dados."""
    SUM = "sum"
    AVG = "avg"
    MIN = "min"
    MAX = "max"
    COUNT = "count"
    MEDIAN = "median"
    PERCENTILE_95 = "percentile_95"
    PERCENTILE_99 = "percentile_99"


class TimeGranularityEnum(str, Enum):
    """Granularidade temporal para agregações."""
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    

class AlertSeverityEnum(str, Enum):
    """Níveis de severidade para alertas."""
    WARNING = "warning"
    CRITICAL = "critical"


class WidgetTypeEnum(str, Enum):
    """Tipos de widgets para dashboards."""
    CARD = "card"
    LINE_CHART = "line_chart"
    BAR_CHART = "bar_chart"
    PIE_CHART = "pie_chart"
    TABLE = "table"
    GAUGE = "gauge"
    STATUS = "status"
    CUSTOM = "custom"


# Schemas para métricas


class MetricBase(BaseModel):
    """Schema base para criação/atualização de métricas."""
    name: str
    description: Optional[str] = None
    type: MetricTypeEnum
    value: Optional[float] = None
    value_text: Optional[str] = None
    unit: Optional[str] = None
    is_realtime: bool = False
    threshold_warning: Optional[float] = None
    threshold_critical: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    user_id: Optional[int] = None


class MetricCreate(MetricBase):
    """Schema para criação de uma nova métrica."""
    pass


class MetricUpdate(BaseModel):
    """Schema para atualização parcial de uma métrica."""
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[MetricTypeEnum] = None
    value: Optional[float] = None
    value_text: Optional[str] = None
    unit: Optional[str] = None
    is_realtime: Optional[bool] = None
    threshold_warning: Optional[float] = None
    threshold_critical: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    category: Optional[str] = None


class MetricValueUpdate(BaseModel):
    """Schema para atualização apenas do valor de uma métrica."""
    value: Optional[float] = None
    value_text: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    check_alerts: bool = True


class MetricResponse(MetricBase):
    """Schema para resposta com dados de uma métrica."""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class MetricHistoryItem(BaseModel):
    """Item individual do histórico de uma métrica."""
    period: str
    avg_value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    count: int


class MetricHistoryResponse(BaseModel):
    """Resposta para histórico de uma métrica."""
    metric_id: int
    metric_name: str
    unit: Optional[str] = None
    history: List[MetricHistoryItem]


class MetricAggregationRequest(BaseModel):
    """Request para cálculo de métrica agregada."""
    metric_ids: List[int]
    aggregation_type: AggregationTypeEnum
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class MetricAggregationResponse(BaseModel):
    """Resposta para agregação de métricas."""
    value: Optional[float] = None
    aggregation_type: AggregationTypeEnum
    metrics_count: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# Schemas para KPI e resumos


class KPIItem(BaseModel):
    """Item individual de KPI para o dashboard."""
    id: int
    name: str
    description: Optional[str] = None
    current_value: Optional[float] = None
    current_value_text: Optional[str] = None
    unit: Optional[str] = None
    type: str
    category: Optional[str] = None
    percent_change: Optional[float] = None
    trend: str  # "up", "down", "stable"
    history: Optional[List[MetricHistoryItem]] = None


class KPISummaryResponse(BaseModel):
    """Resposta para resumo de KPIs."""
    metrics: List[KPIItem]
    period: Dict[str, Any]


# Schemas para alertas


class AlertBase(BaseModel):
    """Schema base para alertas."""
    metric_id: int
    severity: AlertSeverityEnum
    message: str
    value: Optional[float] = None


class AlertCreate(AlertBase):
    """Schema para criação de um alerta manualmente."""
    pass


class AlertAcknowledge(BaseModel):
    """Schema para reconhecimento de um alerta."""
    user_id: int


class AlertResponse(AlertBase):
    """Schema para resposta com dados de um alerta."""
    id: int
    is_active: bool
    is_acknowledged: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[int] = None
    
    class Config:
        orm_mode = True


class AlertSummaryResponse(BaseModel):
    """Schema com resumo dos alertas do sistema."""
    total_active: int
    critical: int
    warning: int
    acknowledged: int
    unacknowledged: int
    recent_24h: int
    timestamp: str


# Schemas para dashboard e widgets


class WidgetConfig(BaseModel):
    """Configuração de um widget de dashboard."""
    data_source: Optional[str] = None
    chart_type: Optional[str] = None
    color_scheme: Optional[str] = None
    display_options: Optional[Dict[str, Any]] = None
    refresh_interval: Optional[int] = None  # em segundos


class WidgetBase(BaseModel):
    """Schema base para widgets de dashboard."""
    metric_id: Optional[int] = None
    widget_type: WidgetTypeEnum
    title: str
    config: Optional[WidgetConfig] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None


class WidgetCreate(WidgetBase):
    """Schema para criação de um widget."""
    dashboard_id: int


class WidgetUpdate(BaseModel):
    """Schema para atualização de um widget."""
    metric_id: Optional[int] = None
    widget_type: Optional[WidgetTypeEnum] = None
    title: Optional[str] = None
    config: Optional[WidgetConfig] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None


class WidgetResponse(WidgetBase):
    """Schema para resposta com dados de um widget."""
    id: int
    dashboard_id: int
    metric: Optional[Dict[str, Any]] = None
    
    class Config:
        orm_mode = True


class DashboardBase(BaseModel):
    """Schema base para dashboards."""
    name: str
    description: Optional[str] = None
    layout: Optional[Dict[str, Any]] = None
    is_default: bool = False
    user_id: Optional[int] = None


class DashboardCreate(DashboardBase):
    """Schema para criação de um dashboard."""
    widgets: Optional[List[WidgetBase]] = None


class DashboardUpdate(BaseModel):
    """Schema para atualização de um dashboard."""
    name: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None


class DashboardResponse(DashboardBase):
    """Schema para resposta com dados de um dashboard."""
    id: int
    created_at: datetime
    updated_at: datetime
    widgets: List[WidgetResponse] = []
    
    class Config:
        orm_mode = True


class TimeRangeFilter(BaseModel):
    """Filtro de intervalo de tempo para métricas e gráficos."""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    granularity: TimeGranularityEnum = TimeGranularityEnum.DAY
    last_n_days: Optional[int] = None  # Último N dias (alternativa a datas explícitas)