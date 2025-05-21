from datetime import datetime
from enum import Enum
from typing import Optional, List

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship

from app.models.base import Base


class MetricType(str, Enum):
    """Tipos de métricas suportadas pelo sistema."""
    COUNT = "count"  # Contagem simples
    AGGREGATION = "aggregation"  # Agregação (média, soma)
    RATE = "rate"  # Taxa (conversão, aprovação)
    FINANCIAL = "financial"  # Métricas financeiras
    OPERATIONAL = "operational"  # Métricas operacionais
    TEMPORAL = "temporal"  # Métricas com análise de tempo


class AggregationType(str, Enum):
    """Tipos de agregação de dados."""
    SUM = "sum"
    AVG = "avg"
    MIN = "min"
    MAX = "max"
    COUNT = "count"
    MEDIAN = "median"
    PERCENTILE_95 = "percentile_95"
    PERCENTILE_99 = "percentile_99"


class TimeGranularity(str, Enum):
    """Granularidade temporal para agregações."""
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class Metric(Base):
    """Modelo para métricas do dashboard."""
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    type = Column(String, nullable=False)
    value = Column(Float, nullable=True)
    value_text = Column(String, nullable=True)  # Para valores não numéricos
    unit = Column(String, nullable=True)  # ex: %, R$, unidades
    is_realtime = Column(Boolean, default=False)  # Se a métrica é atualizada em tempo real
    threshold_warning = Column(Float, nullable=True)  # Limite para alerta de aviso
    threshold_critical = Column(Float, nullable=True)  # Limite para alerta crítico
    metadata = Column(JSON, nullable=True)  # Dados adicionais específicos do tipo de métrica
    category = Column(String, nullable=True)  # Categoria da métrica
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Opcional: métricas podem ser específicas de usuários

    # Relacionamentos
    user = relationship("User", back_populates="metrics")
    historical_data = relationship("MetricHistory", back_populates="metric")
    alerts = relationship("MetricAlert", back_populates="metric")


class MetricHistory(Base):
    """Histórico de valores de uma métrica ao longo do tempo."""
    __tablename__ = "metric_history"

    id = Column(Integer, primary_key=True, index=True)
    metric_id = Column(Integer, ForeignKey("metrics.id"), nullable=False)
    value = Column(Float, nullable=True)
    value_text = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata = Column(JSON, nullable=True)  # Contexto adicional para o valor da métrica
    
    # Relacionamentos
    metric = relationship("Metric", back_populates="historical_data")


class MetricAlert(Base):
    """Alertas gerados para métricas que atingiram limiares de aviso ou críticos."""
    __tablename__ = "metric_alerts"

    id = Column(Integer, primary_key=True, index=True)
    metric_id = Column(Integer, ForeignKey("metrics.id"), nullable=False)
    severity = Column(String, nullable=False)  # warning, critical
    message = Column(String, nullable=False)
    value = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    is_acknowledged = Column(Boolean, default=False)  # Se o alerta foi reconhecido por um usuário
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)  # Quando o alerta foi resolvido
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Usuário que reconheceu o alerta
    
    # Relacionamentos
    metric = relationship("Metric", back_populates="alerts")
    acknowledged_user = relationship("User", foreign_keys=[acknowledged_by])


class Dashboard(Base):
    """Modelo para dashboards personalizados."""
    __tablename__ = "dashboards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    layout = Column(JSON, nullable=True)  # Layout dos widgets do dashboard
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relacionamentos
    user = relationship("User", back_populates="dashboards")
    widgets = relationship("DashboardWidget", back_populates="dashboard")


class DashboardWidget(Base):
    """Widgets em um dashboard, associados a métricas específicas."""
    __tablename__ = "dashboard_widgets"

    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"), nullable=False)
    metric_id = Column(Integer, ForeignKey("metrics.id"), nullable=True)  # Pode ser nulo se for um widget informativo
    widget_type = Column(String, nullable=False)  # card, chart, table, etc.
    title = Column(String, nullable=False)
    config = Column(JSON, nullable=True)  # Configurações específicas do widget
    position_x = Column(Integer, nullable=True)
    position_y = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    
    # Relacionamentos
    dashboard = relationship("Dashboard", back_populates="widgets")
    metric = relationship("Metric", backref="widgets")