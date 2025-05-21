"""
Serviço para manipulação de métricas e KPIs do sistema.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union, Any, Tuple
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text

from app.models.metric import (
    Metric, 
    MetricHistory, 
    MetricType, 
    AggregationType, 
    TimeGranularity,
    Dashboard,
    DashboardWidget
)
from app.services.cache import cached, get_cache_service
from app.services.alerts import AlertService

logger = logging.getLogger(__name__)


class MetricsService:
    """Serviço para gerenciamento de métricas e estatísticas do sistema."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def get_metrics(
        self, 
        category: Optional[str] = None,
        metric_type: Optional[MetricType] = None,
        user_id: Optional[int] = None,
        limit: int = 100,
    ) -> List[Metric]:
        """Recupera métricas com base nos filtros fornecidos."""
        query = select(Metric)
        
        if category:
            query = query.where(Metric.category == category)
        if metric_type:
            query = query.where(Metric.type == metric_type)
        if user_id:
            query = query.where(Metric.user_id == user_id)
            
        query = query.limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_metric_by_id(self, metric_id: int) -> Optional[Metric]:
        """Recupera uma métrica pelo ID."""
        query = select(Metric).where(Metric.id == metric_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_metric_by_name(self, name: str) -> Optional[Metric]:
        """Recupera uma métrica pelo nome."""
        query = select(Metric).where(Metric.name == name)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    @cached(key_prefix="metric_history", ttl_seconds=600)
    async def get_metric_history(
        self,
        metric_id: int,
        start_date: datetime,
        end_date: datetime,
        granularity: TimeGranularity = TimeGranularity.DAY,
    ) -> List[Dict[str, Any]]:
        """
        Recupera o histórico de uma métrica com agregação temporal.
        
        Args:
            metric_id: ID da métrica
            start_date: Data inicial
            end_date: Data final
            granularity: Granularidade temporal (hora, dia, semana, etc.)
            
        Returns:
            Lista de valores históricos da métrica com agregação temporal
        """
        # Definir formato de data baseado na granularidade
        date_formats = {
            TimeGranularity.HOUR: "%Y-%m-%d %H:00:00",
            TimeGranularity.DAY: "%Y-%m-%d",
            TimeGranularity.WEEK: "%Y-%U",  # Semana do ano
            TimeGranularity.MONTH: "%Y-%m",
            TimeGranularity.QUARTER: "TO_CHAR(DATE_TRUNC('quarter', timestamp), 'YYYY-Q')",
            TimeGranularity.YEAR: "%Y",
        }
        
        format_str = date_formats.get(granularity, date_formats[TimeGranularity.DAY])
        
        if granularity == TimeGranularity.QUARTER:
            # Para trimestres, precisamos de uma abordagem diferente
            query_str = """
            SELECT 
                TO_CHAR(DATE_TRUNC('quarter', timestamp), 'YYYY-Q') as period,
                AVG(value) as avg_value,
                MIN(value) as min_value,
                MAX(value) as max_value,
                COUNT(*) as count
            FROM metric_history
            WHERE metric_id = :metric_id
            AND timestamp BETWEEN :start_date AND :end_date
            GROUP BY period
            ORDER BY period
            """
        else:
            query_str = f"""
            SELECT 
                TO_CHAR(timestamp, '{format_str}') as period,
                AVG(value) as avg_value,
                MIN(value) as min_value,
                MAX(value) as max_value,
                COUNT(*) as count
            FROM metric_history
            WHERE metric_id = :metric_id
            AND timestamp BETWEEN :start_date AND :end_date
            GROUP BY period
            ORDER BY period
            """
        
        result = await self.db.execute(
            text(query_str),
            {
                "metric_id": metric_id,
                "start_date": start_date,
                "end_date": end_date,
            },
        )
        
        return [
            {
                "period": row[0],
                "avg_value": float(row[1]) if row[1] is not None else None,
                "min_value": float(row[2]) if row[2] is not None else None,
                "max_value": float(row[3]) if row[3] is not None else None,
                "count": row[4],
            }
            for row in result.fetchall()
        ]
    
    async def update_metric_value(
        self,
        metric_id: int,
        value: Optional[float] = None,
        value_text: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        check_alerts: bool = True,
    ) -> Tuple[Metric, Optional[MetricHistory]]:
        """
        Atualiza o valor de uma métrica e registra no histórico.
        
        Args:
            metric_id: ID da métrica
            value: Novo valor numérico (opcional)
            value_text: Novo valor textual (opcional)
            metadata: Metadados adicionais
            check_alerts: Se deve verificar condições de alerta
            
        Returns:
            Tupla (métrica atualizada, registro histórico)
        """
        # Recupera a métrica
        metric = await self.get_metric_by_id(metric_id)
        if not metric:
            raise ValueError(f"Métrica com ID {metric_id} não encontrada")
        
        # Atualiza os valores
        if value is not None:
            metric.value = value
        if value_text is not None:
            metric.value_text = value_text
        
        metric.updated_at = datetime.utcnow()
        
        # Cria registro histórico
        history_entry = MetricHistory(
            metric_id=metric_id,
            value=value,
            value_text=value_text,
            timestamp=datetime.utcnow(),
            metadata=metadata
        )
        
        # Persiste as alterações
        self.db.add(metric)
        self.db.add(history_entry)
        await self.db.flush()
        
        # Verifica alertas se solicitado
        if check_alerts and value is not None:
            alert_service = AlertService(self.db)
            await alert_service.check_metric_alert_conditions(metric, value)
        
        # Invalida cache relacionado
        cache_service = await get_cache_service()
        await cache_service.invalidate_pattern(f"metric:{metric_id}:*")
        
        return metric, history_entry
    
    async def calculate_aggregated_metric(
        self, 
        metric_ids: List[int],
        aggregation_type: AggregationType,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Calcula uma métrica agregada a partir de outras métricas.
        
        Args:
            metric_ids: Lista de IDs das métricas a serem agregadas
            aggregation_type: Tipo de agregação (soma, média, etc.)
            start_date: Data inicial para filtrar dados
            end_date: Data final para filtrar dados
            
        Returns:
            Dicionário com o resultado da agregação
        """
        if not metric_ids:
            raise ValueError("É necessário fornecer pelo menos uma métrica para agregação")
        
        # Define intervalo de datas caso não informado
        end_date = end_date or datetime.utcnow()
        start_date = start_date or (end_date - timedelta(days=30))
        
        # Constrói a query baseada no tipo de agregação
        agg_func = None
        if aggregation_type == AggregationType.SUM:
            agg_func = func.sum(MetricHistory.value)
        elif aggregation_type == AggregationType.AVG:
            agg_func = func.avg(MetricHistory.value)
        elif aggregation_type == AggregationType.MIN:
            agg_func = func.min(MetricHistory.value)
        elif aggregation_type == AggregationType.MAX:
            agg_func = func.max(MetricHistory.value)
        elif aggregation_type == AggregationType.COUNT:
            agg_func = func.count(MetricHistory.id)
        elif aggregation_type == AggregationType.MEDIAN:
            # SQLAlchemy não tem função direta para mediana, usamos uma abordagem personalizada
            query_str = """
            SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value)
            FROM metric_history
            WHERE metric_id = ANY(:metric_ids)
            AND timestamp BETWEEN :start_date AND :end_date
            """
            result = await self.db.execute(
                text(query_str),
                {
                    "metric_ids": metric_ids,
                    "start_date": start_date,
                    "end_date": end_date,
                },
            )
            return {"value": float(result.scalar()) if result.scalar() is not None else None}
        elif aggregation_type in (AggregationType.PERCENTILE_95, AggregationType.PERCENTILE_99):
            # Para percentis
            percentile = 0.95 if aggregation_type == AggregationType.PERCENTILE_95 else 0.99
            query_str = f"""
            SELECT PERCENTILE_CONT({percentile}) WITHIN GROUP (ORDER BY value)
            FROM metric_history
            WHERE metric_id = ANY(:metric_ids)
            AND timestamp BETWEEN :start_date AND :end_date
            """
            result = await self.db.execute(
                text(query_str),
                {
                    "metric_ids": metric_ids,
                    "start_date": start_date,
                    "end_date": end_date,
                },
            )
            return {"value": float(result.scalar()) if result.scalar() is not None else None}
        
        if not agg_func:
            raise ValueError(f"Tipo de agregação não suportado: {aggregation_type}")
        
        # Executa consulta para os tipos de agregação padrão
        query = select(agg_func).where(
            and_(
                MetricHistory.metric_id.in_(metric_ids),
                MetricHistory.timestamp.between(start_date, end_date)
            )
        )
        
        result = await self.db.execute(query)
        value = result.scalar()
        
        return {"value": float(value) if value is not None else None}
    
    @cached(key_prefix="dashboard", ttl_seconds=300)
    async def get_dashboard(self, dashboard_id: int) -> Optional[Dict[str, Any]]:
        """
        Recupera um dashboard com seus widgets e métricas associadas.
        
        Args:
            dashboard_id: ID do dashboard
            
        Returns:
            Dados do dashboard ou None se não encontrado
        """
        query = select(Dashboard).where(Dashboard.id == dashboard_id)
        result = await self.db.execute(query)
        dashboard = result.scalar_one_or_none()
        
        if not dashboard:
            return None
        
        # Recupera widgets do dashboard
        widget_query = (
            select(DashboardWidget)
            .where(DashboardWidget.dashboard_id == dashboard_id)
            .order_by(DashboardWidget.position_y, DashboardWidget.position_x)
        )
        widget_result = await self.db.execute(widget_query)
        widgets = widget_result.scalars().all()
        
        # Recupera métricas associadas aos widgets
        metrics_data = {}
        for widget in widgets:
            if widget.metric_id:
                metric = await self.get_metric_by_id(widget.metric_id)
                if metric:
                    metrics_data[widget.metric_id] = {
                        "id": metric.id,
                        "name": metric.name,
                        "description": metric.description,
                        "type": metric.type,
                        "value": metric.value,
                        "value_text": metric.value_text,
                        "unit": metric.unit,
                        "category": metric.category,
                        "is_realtime": metric.is_realtime,
                    }
        
        return {
            "id": dashboard.id,
            "name": dashboard.name,
            "description": dashboard.description,
            "layout": dashboard.layout,
            "is_default": dashboard.is_default,
            "widgets": [
                {
                    "id": w.id,
                    "metric_id": w.metric_id,
                    "widget_type": w.widget_type,
                    "title": w.title,
                    "config": w.config,
                    "position_x": w.position_x,
                    "position_y": w.position_y,
                    "width": w.width,
                    "height": w.height,
                    "metric": metrics_data.get(w.metric_id) if w.metric_id else None,
                }
                for w in widgets
            ],
        }
    
    @cached(key_prefix="kpi_summary", ttl_seconds=600)
    async def get_kpi_summary(
        self, 
        category: Optional[str] = None,
        user_id: Optional[int] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Recupera um resumo dos principais KPIs do sistema.
        
        Args:
            category: Categoria para filtrar métricas (opcional)
            user_id: ID do usuário para filtrar métricas (opcional)
            days: Número de dias para análise comparativa
            
        Returns:
            Resumo com KPIs principais e suas tendências
        """
        # Recupera métricas relevantes
        query = select(Metric)
        
        if category:
            query = query.where(Metric.category == category)
        if user_id:
            query = query.where(Metric.user_id == user_id)
            
        result = await self.db.execute(query)
        metrics = result.scalars().all()
        
        # Data final (hoje) e inicial para comparação
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        mid_date = start_date + (end_date - start_date) / 2
        
        kpi_summary = {
            "metrics": [],
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days,
            }
        }
        
        for metric in metrics:
            # Recupera dados históricos
            history_data = await self.get_metric_history(
                metric.id, start_date, end_date, TimeGranularity.DAY
            )
            
            # Calcula tendência (primeira metade vs. segunda metade do período)
            first_half = [item for item in history_data if datetime.strptime(item["period"], "%Y-%m-%d") < mid_date]
            second_half = [item for item in history_data if datetime.strptime(item["period"], "%Y-%m-%d") >= mid_date]
            
            first_half_avg = (
                sum(item["avg_value"] for item in first_half if item["avg_value"] is not None) / len(first_half)
                if first_half and any(item["avg_value"] is not None for item in first_half)
                else None
            )
            
            second_half_avg = (
                sum(item["avg_value"] for item in second_half if item["avg_value"] is not None) / len(second_half)
                if second_half and any(item["avg_value"] is not None for item in second_half)
                else None
            )
            
            # Calcula variação percentual
            percent_change = None
            if first_half_avg is not None and second_half_avg is not None and first_half_avg != 0:
                percent_change = ((second_half_avg - first_half_avg) / first_half_avg) * 100
            
            kpi_summary["metrics"].append({
                "id": metric.id,
                "name": metric.name,
                "description": metric.description,
                "current_value": metric.value,
                "current_value_text": metric.value_text,
                "unit": metric.unit,
                "type": metric.type,
                "category": metric.category,
                "percent_change": percent_change,
                "trend": "up" if percent_change and percent_change > 0 else "down" if percent_change and percent_change < 0 else "stable",
                "history": history_data
            })
        
        return kpi_summary


async def get_metrics_service(db: AsyncSession) -> MetricsService:
    """Retorna uma instância do serviço de métricas."""
    return MetricsService(db)