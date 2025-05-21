"""
Endpoints da API para métricas e KPIs do dashboard.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_async_session
from app.models.user import User
from app.models.metric import MetricType, AggregationType, TimeGranularity
from app.services.metrics import MetricsService
from app.services.alerts import AlertService
from app.services.cache import cached, get_cache_service
from app.api.schemas.dashboard import (
    MetricResponse,
    MetricHistoryResponse,
    KPISummaryResponse,
    TimeRangeFilter,
    TimeGranularityEnum,
    MetricAggregationRequest,
    MetricAggregationResponse,
    AlertSummaryResponse,
    KPIItem
)

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("", response_model=List[MetricResponse])
@cached(key_prefix="metrics_list", ttl_seconds=300)
async def list_metrics(
    category: Optional[str] = None,
    metric_type: Optional[MetricType] = None,
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todas as métricas disponíveis com filtros opcionais.
    """
    metrics_service = MetricsService(db)
    metrics = await metrics_service.get_metrics(
        category=category,
        metric_type=metric_type,
        user_id=current_user.id,
        limit=limit
    )
    return metrics


@router.get("/kpi-summary", response_model=KPISummaryResponse)
@cached(key_prefix="kpi_summary", ttl_seconds=300)
async def get_kpi_summary(
    time_range: TimeRangeFilter = Depends(),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém um resumo dos KPIs principais do sistema em um intervalo de tempo.
    """
    # Usar a data atual se end_date não for fornecido
    end_date = time_range.end_date or datetime.utcnow()
    
    # Usar 30 dias atrás se start_date não for fornecido
    start_date = time_range.start_date or (end_date - timedelta(days=30))
    
    # Se last_n_days for fornecido, usar para calcular start_date
    if time_range.last_n_days:
        start_date = end_date - timedelta(days=time_range.last_n_days)
    
    metrics_service = MetricsService(db)
    alert_service = AlertService(db)
    
    # Obtém métricas da categoria KPI
    kpi_metrics = await metrics_service.get_metrics(category="kpi", limit=10)
    
    # Processa cada KPI para incluir tendência e histórico
    result_metrics = []
    for metric in kpi_metrics:
        # Obtém histórico da métrica
        history_data = await metrics_service.get_metric_history(
            metric_id=metric.id,
            start_date=start_date,
            end_date=end_date,
            granularity=TimeGranularity(time_range.granularity)
        )
        
        # Calcula a variação percentual
        previous_period = {
            "start_date": start_date - (end_date - start_date),
            "end_date": start_date
        }
        
        previous_data = await metrics_service.get_metric_history(
            metric_id=metric.id,
            start_date=previous_period["start_date"],
            end_date=previous_period["end_date"],
            granularity=TimeGranularity(time_range.granularity)
        )
        
        # Calcula valores médios dos períodos
        current_values = [item.get("avg_value") for item in history_data if item.get("avg_value") is not None]
        previous_values = [item.get("avg_value") for item in previous_data if item.get("avg_value") is not None]
        
        current_avg = sum(current_values) / len(current_values) if current_values else metric.value or 0
        previous_avg = sum(previous_values) / len(previous_values) if previous_values else 0
        
        # Calcula variação percentual
        percent_change = 0
        if previous_avg:
            percent_change = ((current_avg - previous_avg) / previous_avg) * 100
        
        # Determina tendência
        trend = "stable"
        if percent_change > 5:
            trend = "up"
        elif percent_change < -5:
            trend = "down"
        
        # Formata dados para o schema KPIItem
        kpi_item = KPIItem(
            id=metric.id,
            name=metric.name,
            description=metric.description,
            current_value=metric.value,
            current_value_text=metric.value_text,
            unit=metric.unit,
            type=metric.type,
            category=metric.category,
            percent_change=percent_change,
            trend=trend,
            history=[{
                "period": item.get("period"),
                "avg_value": item.get("avg_value"),
                "min_value": item.get("min_value"),
                "max_value": item.get("max_value"),
                "count": item.get("count")
            } for item in history_data]
        )
        
        result_metrics.append(kpi_item)
    
    # Monta o objeto de resposta
    return {
        "metrics": result_metrics,
        "period": {
            "start_date": start_date,
            "end_date": end_date,
            "granularity": time_range.granularity
        }
    }


@router.get("/{metric_id}/history", response_model=MetricHistoryResponse)
@cached(key_prefix="metric_history", ttl_seconds=600)
async def get_metric_history(
    metric_id: int = Path(..., title="ID da métrica"),
    time_range: TimeRangeFilter = Depends(),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém o histórico de valores de uma métrica ao longo do tempo.
    """
    # Validar granularidade
    try:
        time_granularity = TimeGranularity(time_range.granularity)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Granularidade inválida. Valores permitidos: {', '.join([g.value for g in TimeGranularity])}"
        )
    
    # Usar a data atual se end_date não for fornecido
    end_date = time_range.end_date or datetime.utcnow()
    
    # Usar 30 dias atrás se start_date não for fornecido
    start_date = time_range.start_date or (end_date - timedelta(days=30))
    
    # Se last_n_days for fornecido, usar para calcular start_date
    if time_range.last_n_days:
        start_date = end_date - timedelta(days=time_range.last_n_days)
    
    metrics_service = MetricsService(db)
    
    # Verificar se a métrica existe
    metric = await metrics_service.get_metric_by_id(metric_id)
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Métrica com ID {metric_id} não encontrada"
        )
    
    # Obter histórico
    history_data = await metrics_service.get_metric_history(
        metric_id=metric_id,
        start_date=start_date,
        end_date=end_date,
        granularity=time_granularity
    )
    
    return {
        "metric_id": metric_id,
        "metric_name": metric.name,
        "unit": metric.unit,
        "period": {
            "start_date": start_date,
            "end_date": end_date,
            "granularity": time_range.granularity
        },
        "data": history_data
    }


@router.post("/aggregate", response_model=MetricAggregationResponse)
async def aggregate_metrics(
    aggregation_request: MetricAggregationRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Agrega múltiplas métricas usando o método de agregação especificado.
    Útil para criar visualizações personalizadas combinando diferentes métricas.
    """
    # Validar tipo de agregação
    try:
        aggregation_type = AggregationType(aggregation_request.aggregation_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de agregação inválido. Valores permitidos: {', '.join([a.value for a in AggregationType])}"
        )
    
    # Usar a data atual se end_date não for fornecido
    end_date = aggregation_request.end_date or datetime.utcnow()
    
    # Usar 30 dias atrás se start_date não for fornecido
    start_date = aggregation_request.start_date or (end_date - timedelta(days=30))
    
    metrics_service = MetricsService(db)
    
    # Verificar se todas as métricas existem
    for metric_id in aggregation_request.metric_ids:
        metric = await metrics_service.get_metric_by_id(metric_id)
        if not metric:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Métrica com ID {metric_id} não encontrada"
            )
    
    # Realizar agregação
    result = await metrics_service.calculate_aggregated_metric(
        metric_ids=aggregation_request.metric_ids,
        aggregation_type=aggregation_type,
        start_date=start_date,
        end_date=end_date
    )
    
    return {
        "value": result.get("value"),
        "aggregation_type": aggregation_request.aggregation_type,
        "metrics_count": len(aggregation_request.metric_ids),
        "start_date": start_date,
        "end_date": end_date
    }


@router.get("/time-comparison", response_model=Dict[str, Any])
@cached(key_prefix="metrics_time_comparison", ttl_seconds=300)
async def metrics_time_comparison(
    metric_ids: List[int] = Query(..., title="IDs das métricas"),
    current_period_start: datetime = Query(..., title="Início do período atual"),
    current_period_end: datetime = Query(..., title="Fim do período atual"),
    previous_period_start: Optional[datetime] = Query(None, title="Início do período anterior"),
    previous_period_end: Optional[datetime] = Query(None, title="Fim do período anterior"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Compara métricas entre dois períodos de tempo.
    Útil para análises como "este mês vs mês anterior" ou "este ano vs ano anterior".
    """
    metrics_service = MetricsService(db)
    
    # Se o período anterior não for especificado, calcular automaticamente
    if not previous_period_start or not previous_period_end:
        # Calcula a duração do período atual
        current_duration = current_period_end - current_period_start
        
        # Define o período anterior com a mesma duração que o atual
        previous_period_end = current_period_start
        previous_period_start = previous_period_end - current_duration
    
    result = {
        "metrics": [],
        "periods": {
            "current": {
                "start": current_period_start.isoformat(),
                "end": current_period_end.isoformat()
            },
            "previous": {
                "start": previous_period_start.isoformat(),
                "end": previous_period_end.isoformat()
            }
        }
    }
    
    # Processa cada métrica
    for metric_id in metric_ids:
        metric = await metrics_service.get_metric_by_id(metric_id)
        if not metric:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Métrica com ID {metric_id} não encontrada"
            )
        
        # Obtém dados para o período atual
        current_data = await metrics_service.get_metric_history(
            metric_id=metric_id,
            start_date=current_period_start,
            end_date=current_period_end,
            granularity=TimeGranularity.DAY
        )
        
        # Obtém dados para o período anterior
        previous_data = await metrics_service.get_metric_history(
            metric_id=metric_id,
            start_date=previous_period_start,
            end_date=previous_period_end,
            granularity=TimeGranularity.DAY
        )
        
        # Calcula estatísticas para ambos os períodos
        current_values = [item.get("avg_value") for item in current_data if item.get("avg_value") is not None]
        previous_values = [item.get("avg_value") for item in previous_data if item.get("avg_value") is not None]
        
        current_stats = {
            "avg": sum(current_values) / len(current_values) if current_values else None,
            "min": min(current_values) if current_values else None,
            "max": max(current_values) if current_values else None,
            "count": len(current_values)
        }
        
        previous_stats = {
            "avg": sum(previous_values) / len(previous_values) if previous_values else None,
            "min": min(previous_values) if previous_values else None,
            "max": max(previous_values) if previous_values else None,
            "count": len(previous_values)
        }
        
        # Calcula a variação percentual
        percent_change = None
        if current_stats["avg"] is not None and previous_stats["avg"] is not None and previous_stats["avg"] != 0:
            percent_change = ((current_stats["avg"] - previous_stats["avg"]) / previous_stats["avg"]) * 100
        
        # Adiciona a métrica ao resultado
        result["metrics"].append({
            "metric_id": metric_id,
            "name": metric.name,
            "description": metric.description,
            "unit": metric.unit,
            "current_period": {
                "data": current_data,
                "stats": current_stats
            },
            "previous_period": {
                "data": previous_data,
                "stats": previous_stats
            },
            "comparison": {
                "percent_change": percent_change,
                "trend": "up" if percent_change and percent_change > 0 else "down" if percent_change and percent_change < 0 else "stable"
            }
        })
    
    return result


@router.get("/alerts/summary", response_model=AlertSummaryResponse)
@cached(key_prefix="alerts_summary", ttl_seconds=300)
async def get_alerts_summary(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém um resumo dos alertas ativos, agrupados por severidade.
    """
    alert_service = AlertService(db)
    
    # Obtém todos os alertas
    all_alerts = await alert_service.get_alerts()
    
    # Filtra alertas por diferentes critérios
    active_alerts = [a for a in all_alerts if a.is_active]
    critical_alerts = [a for a in active_alerts if a.severity == "critical"]
    warning_alerts = [a for a in active_alerts if a.severity == "warning"]
    acknowledged_alerts = [a for a in active_alerts if a.is_acknowledged]
    unacknowledged_alerts = [a for a in active_alerts if not a.is_acknowledged]
    
    # Alertas nas últimas 24 horas
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    recent_alerts = [a for a in all_alerts if a.created_at >= one_day_ago]
    
    return {
        "total_active": len(active_alerts),
        "critical": len(critical_alerts),
        "warning": len(warning_alerts),
        "acknowledged": len(acknowledged_alerts),
        "unacknowledged": len(unacknowledged_alerts),
        "recent_24h": len(recent_alerts),
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/realtime", response_model=Dict[str, Any])
async def get_realtime_metrics(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém métricas que são atualizadas em tempo real para dashboard ao vivo.
    """
    metrics_service = MetricsService(db)
    alert_service = AlertService(db)
    
    # Recupera métricas marcadas como realtime
    realtime_metrics = await metrics_service.get_metrics(
        metric_type=MetricType.COUNT,
        limit=20
    )
    
    # Filtra apenas as marcadas como realtime
    realtime_metrics = [m for m in realtime_metrics if m.is_realtime]
    
    # Obtém alertas ativos
    active_alerts = await alert_service.get_alerts(is_active=True)
    
    # Formata os resultados
    result = {
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": [
            {
                "id": metric.id,
                "name": metric.name,
                "value": metric.value,
                "value_text": metric.value_text,
                "unit": metric.unit,
                "updated_at": metric.updated_at.isoformat()
            }
            for metric in realtime_metrics
        ],
        "alerts": {
            "count": len(active_alerts),
            "critical": len([a for a in active_alerts if a.severity == "critical"]),
            "warning": len([a for a in active_alerts if a.severity == "warning"])
        }
    }
    
    return result


@router.post("/cache/clear", response_model=Dict[str, Any])
async def clear_metrics_cache(
    pattern: str = Query("metrics:*", description="Padrão de chaves do cache a serem limpas"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Limpa o cache de métricas manualmente.
    Requer permissões de administrador.
    """
    # Verificar se usuário tem permissão de admin (simplificado)
    if not hasattr(current_user, 'is_admin') or not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada. Requer privilégios de administrador."
        )
    
    cache_service = await get_cache_service()
    
    # Lista chaves que correspondem ao padrão
    keys = await cache_service.get_keys(pattern)
    
    # Invalida chaves
    count = await cache_service.invalidate_pattern(pattern)
    
    return {
        "success": True,
        "pattern": pattern,
        "keys_removed": count,
        "keys": keys[:100]  # Limita a 100 chaves para não sobrecarregar a resposta
    }