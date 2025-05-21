"""
Rotas da API para operações relacionadas a dashboards e métricas.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.api.deps import get_current_user
from app.models.user import User
from app.services.metrics import get_metrics_service, MetricsService
from app.services.alerts import get_alert_service, AlertService
from app.api.schemas.dashboard import (
    # Schemas de métricas
    MetricResponse,
    MetricCreate,
    MetricUpdate,
    MetricValueUpdate,
    MetricHistoryResponse,
    MetricAggregationRequest,
    MetricAggregationResponse,
    
    # Schemas de KPIs
    KPISummaryResponse,
    
    # Schemas de alertas
    AlertResponse,
    AlertCreate,
    AlertAcknowledge,
    AlertSummaryResponse,
    
    # Schemas de dashboards
    DashboardResponse,
    DashboardCreate,
    DashboardUpdate,
    
    # Schemas de widgets
    WidgetResponse,
    WidgetCreate,
    WidgetUpdate,
    
    # Schemas auxiliares
    TimeRangeFilter,
    TimeGranularityEnum
)
from app.models.metric import TimeGranularity, Metric, MetricAlert, Dashboard, DashboardWidget

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Endpoints para métricas

@router.get("/metrics", response_model=List[MetricResponse])
async def list_metrics(
    category: Optional[str] = None,
    metric_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Lista métricas com base nos filtros fornecidos.
    Pode filtrar por categoria e tipo de métrica.
    """
    metrics_service = await get_metrics_service(db)
    metrics = await metrics_service.get_metrics(
        category=category,
        metric_type=metric_type,
        limit=limit
    )
    return metrics


@router.post("/metrics", response_model=MetricResponse, status_code=status.HTTP_201_CREATED)
async def create_metric(
    metric: MetricCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Cria uma nova métrica no sistema.
    """
    # Cria uma instância do modelo a partir do schema
    new_metric = Metric(
        name=metric.name,
        description=metric.description,
        type=metric.type,
        value=metric.value,
        value_text=metric.value_text,
        unit=metric.unit,
        is_realtime=metric.is_realtime,
        threshold_warning=metric.threshold_warning,
        threshold_critical=metric.threshold_critical,
        metadata=metric.metadata,
        category=metric.category,
        user_id=metric.user_id or current_user.id,
    )
    
    db.add(new_metric)
    await db.commit()
    await db.refresh(new_metric)
    
    return new_metric


@router.get("/metrics/{metric_id}", response_model=MetricResponse)
async def get_metric(
    metric_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Recupera detalhes de uma métrica específica.
    """
    metrics_service = await get_metrics_service(db)
    metric = await metrics_service.get_metric_by_id(metric_id)
    
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Métrica com ID {metric_id} não encontrada"
        )
    
    return metric


@router.put("/metrics/{metric_id}", response_model=MetricResponse)
async def update_metric(
    metric_update: MetricUpdate,
    metric_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Atualiza uma métrica existente.
    """
    metrics_service = await get_metrics_service(db)
    metric = await metrics_service.get_metric_by_id(metric_id)
    
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Métrica com ID {metric_id} não encontrada"
        )
    
    # Atualiza apenas os campos fornecidos
    update_data = metric_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(metric, key, value)
    
    # Atualiza timestamp
    metric.updated_at = datetime.utcnow()
    
    db.add(metric)
    await db.commit()
    await db.refresh(metric)
    
    return metric


@router.patch("/metrics/{metric_id}/value", response_model=MetricResponse)
async def update_metric_value(
    value_update: MetricValueUpdate,
    metric_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Atualiza apenas o valor de uma métrica e registra no histórico.
    Pode opcionalmente verificar condições de alerta.
    """
    metrics_service = await get_metrics_service(db)
    
    try:
        metric, _ = await metrics_service.update_metric_value(
            metric_id=metric_id,
            value=value_update.value,
            value_text=value_update.value_text,
            metadata=value_update.metadata,
            check_alerts=value_update.check_alerts
        )
        
        await db.commit()
        return metric
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/metrics/{metric_id}/history", response_model=MetricHistoryResponse)
async def get_metric_history(
    metric_id: int = Path(..., ge=1),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    granularity: TimeGranularityEnum = TimeGranularityEnum.DAY,
    days: Optional[int] = Query(None, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Recupera o histórico de valores de uma métrica com agregação temporal.
    """
    metrics_service = await get_metrics_service(db)
    
    # Recupera a métrica para obter o nome
    metric = await metrics_service.get_metric_by_id(metric_id)
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Métrica com ID {metric_id} não encontrada"
        )
    
    # Define o intervalo de datas se não informado
    if not end_date:
        end_date = datetime.utcnow()
    
    if not start_date:
        if days:
            start_date = end_date - timedelta(days=days)
        else:
            start_date = end_date - timedelta(days=30)  # Padrão: 30 dias
    
    # Converte enums do pydantic para os enums do modelo
    granularity_value = TimeGranularity[granularity.upper()]
    
    history_data = await metrics_service.get_metric_history(
        metric_id=metric_id,
        start_date=start_date,
        end_date=end_date,
        granularity=granularity_value
    )
    
    return {
        "metric_id": metric.id,
        "metric_name": metric.name,
        "unit": metric.unit,
        "history": history_data
    }


@router.post("/metrics/aggregate", response_model=MetricAggregationResponse)
async def aggregate_metrics(
    aggregation_request: MetricAggregationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Calcula uma agregação de várias métricas (soma, média, etc.).
    """
    metrics_service = await get_metrics_service(db)
    
    # Define intervalo de datas se não informado
    end_date = aggregation_request.end_date or datetime.utcnow()
    start_date = aggregation_request.start_date or (end_date - timedelta(days=30))
    
    result = await metrics_service.calculate_aggregated_metric(
        metric_ids=aggregation_request.metric_ids,
        aggregation_type=aggregation_request.aggregation_type,
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


@router.get("/kpi", response_model=KPISummaryResponse)
async def get_kpi_summary(
    category: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Recupera um resumo dos principais KPIs do sistema com tendências.
    """
    metrics_service = await get_metrics_service(db)
    
    kpi_summary = await metrics_service.get_kpi_summary(
        category=category,
        user_id=None,  # Todos os usuários
        days=days
    )
    
    return kpi_summary


# Endpoints para alertas

@router.get("/alerts", response_model=List[AlertResponse])
async def list_alerts(
    is_active: Optional[bool] = Query(None),
    is_acknowledged: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    metric_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Lista alertas com base nos filtros fornecidos.
    """
    alert_service = await get_alert_service(db)
    
    alerts = await alert_service.get_alerts(
        is_active=is_active,
        is_acknowledged=is_acknowledged,
        severity=severity,
        metric_id=metric_id,
        limit=limit
    )
    
    return alerts


@router.post("/alerts", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Cria um novo alerta manualmente.
    """
    alert_service = await get_alert_service(db)
    
    new_alert = await alert_service.create_alert(
        metric_id=alert.metric_id,
        severity=alert.severity,
        message=alert.message,
        value=alert.value
    )
    
    await db.commit()
    return new_alert


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Recupera detalhes de um alerta específico.
    """
    alert_service = await get_alert_service(db)
    alert = await alert_service.get_alert_by_id(alert_id)
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alerta com ID {alert_id} não encontrado"
        )
    
    return alert


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Reconhece um alerta, indicando que um usuário está ciente do problema.
    """
    alert_service = await get_alert_service(db)
    
    try:
        alert = await alert_service.acknowledge_alert(
            alert_id=alert_id,
            user_id=current_user.id
        )
        
        await db.commit()
        return alert
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/alerts/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Resolve um alerta, indicando que o problema foi corrigido.
    """
    alert_service = await get_alert_service(db)
    
    try:
        alert = await alert_service.resolve_alert(alert_id)
        await db.commit()
        return alert
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/alerts/summary", response_model=AlertSummaryResponse)
async def get_alert_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Recupera um resumo dos alertas ativos no sistema.
    """
    alert_service = await get_alert_service(db)
    summary = await alert_service.get_alert_summary()
    return summary


# Endpoints para dashboards

@router.get("/dashboards", response_model=List[DashboardResponse])
async def list_dashboards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Lista todos os dashboards disponíveis para o usuário.
    """
    query = select(Dashboard).where(
        (Dashboard.user_id == current_user.id) | (Dashboard.is_default == True)
    )
    result = await db.execute(query)
    dashboards = result.scalars().all()
    
    return dashboards


@router.post("/dashboards", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    dashboard: DashboardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Cria um novo dashboard com widgets opcionais.
    """
    # Cria o dashboard
    new_dashboard = Dashboard(
        name=dashboard.name,
        description=dashboard.description,
        layout=dashboard.layout,
        is_default=dashboard.is_default,
        user_id=dashboard.user_id or current_user.id
    )
    
    db.add(new_dashboard)
    await db.flush()
    
    # Cria widgets se fornecidos
    if dashboard.widgets:
        for widget_data in dashboard.widgets:
            widget = DashboardWidget(
                dashboard_id=new_dashboard.id,
                metric_id=widget_data.metric_id,
                widget_type=widget_data.widget_type,
                title=widget_data.title,
                config=widget_data.config.dict() if widget_data.config else None,
                position_x=widget_data.position_x,
                position_y=widget_data.position_y,
                width=widget_data.width,
                height=widget_data.height
            )
            db.add(widget)
    
    await db.commit()
    await db.refresh(new_dashboard)
    
    # Recupera dashboard com todos os relacionamentos carregados
    metrics_service = await get_metrics_service(db)
    full_dashboard = await metrics_service.get_dashboard(new_dashboard.id)
    
    if not full_dashboard:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao recuperar dashboard recém-criado"
        )
    
    return full_dashboard


@router.get("/dashboards/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard(
    dashboard_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Recupera um dashboard específico com todos os seus widgets e métricas associadas.
    """
    metrics_service = await get_metrics_service(db)
    dashboard = await metrics_service.get_dashboard(dashboard_id)
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dashboard com ID {dashboard_id} não encontrado"
        )
    
    # Verifica se o usuário tem acesso ao dashboard
    if not dashboard.get('is_default', False) and dashboard.get('user_id') != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado a este dashboard"
        )
    
    return dashboard


@router.put("/dashboards/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(
    dashboard_update: DashboardUpdate,
    dashboard_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Atualiza um dashboard existente.
    """
    query = select(Dashboard).where(Dashboard.id == dashboard_id)
    result = await db.execute(query)
    dashboard = result.scalar_one_or_none()
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dashboard com ID {dashboard_id} não encontrado"
        )
    
    # Verifica se o usuário tem permissão para editar
    if dashboard.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para editar este dashboard"
        )
    
    # Atualiza apenas os campos fornecidos
    update_data = dashboard_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dashboard, key, value)
    
    # Atualiza timestamp
    dashboard.updated_at = datetime.utcnow()
    
    db.add(dashboard)
    await db.commit()
    await db.refresh(dashboard)
    
    # Recupera dashboard completo
    metrics_service = await get_metrics_service(db)
    full_dashboard = await metrics_service.get_dashboard(dashboard_id)
    
    return full_dashboard


@router.delete("/dashboards/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Remove um dashboard e seus widgets.
    """
    query = select(Dashboard).where(Dashboard.id == dashboard_id)
    result = await db.execute(query)
    dashboard = result.scalar_one_or_none()
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dashboard com ID {dashboard_id} não encontrado"
        )
    
    # Verifica se o usuário tem permissão para remover
    if dashboard.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para remover este dashboard"
        )
    
    # Remove o dashboard (cascade deve remover os widgets)
    await db.delete(dashboard)
    await db.commit()
    
    return None


# Endpoints para widgets

@router.post("/widgets", response_model=WidgetResponse, status_code=status.HTTP_201_CREATED)
async def create_widget(
    widget: WidgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Cria um novo widget para um dashboard existente.
    """
    # Verifica se o dashboard existe e pertence ao usuário
    query = select(Dashboard).where(Dashboard.id == widget.dashboard_id)
    result = await db.execute(query)
    dashboard = result.scalar_one_or_none()
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dashboard com ID {widget.dashboard_id} não encontrado"
        )
    
    if dashboard.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para adicionar widgets a este dashboard"
        )
    
    # Cria o widget
    new_widget = DashboardWidget(
        dashboard_id=widget.dashboard_id,
        metric_id=widget.metric_id,
        widget_type=widget.widget_type,
        title=widget.title,
        config=widget.config.dict() if widget.config else None,
        position_x=widget.position_x,
        position_y=widget.position_y,
        width=widget.width,
        height=widget.height
    )
    
    db.add(new_widget)
    await db.commit()
    await db.refresh(new_widget)
    
    # Se tem métrica associada, recupera seus dados
    metric_data = None
    if widget.metric_id:
        metrics_service = await get_metrics_service(db)
        metric = await metrics_service.get_metric_by_id(widget.metric_id)
        if metric:
            metric_data = {
                "id": metric.id,
                "name": metric.name,
                "description": metric.description,
                "type": metric.type,
                "value": metric.value,
                "value_text": metric.value_text,
                "unit": metric.unit,
                "category": metric.category
            }
    
    response = {
        "id": new_widget.id,
        "dashboard_id": new_widget.dashboard_id,
        "metric_id": new_widget.metric_id,
        "widget_type": new_widget.widget_type,
        "title": new_widget.title,
        "config": new_widget.config,
        "position_x": new_widget.position_x,
        "position_y": new_widget.position_y,
        "width": new_widget.width,
        "height": new_widget.height,
        "metric": metric_data
    }
    
    return response


@router.put("/widgets/{widget_id}", response_model=WidgetResponse)
async def update_widget(
    widget_update: WidgetUpdate,
    widget_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Atualiza um widget existente.
    """
    # Localiza o widget
    query = select(DashboardWidget).where(DashboardWidget.id == widget_id)
    result = await db.execute(query)
    widget = result.scalar_one_or_none()
    
    if not widget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Widget com ID {widget_id} não encontrado"
        )
    
    # Verifica se o usuário tem permissão para editar o dashboard deste widget
    dashboard_query = select(Dashboard).where(Dashboard.id == widget.dashboard_id)
    dashboard_result = await db.execute(dashboard_query)
    dashboard = dashboard_result.scalar_one_or_none()
    
    if dashboard and dashboard.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para editar widgets deste dashboard"
        )
    
    # Atualiza apenas os campos fornecidos
    update_data = widget_update.dict(exclude_unset=True)
    if "config" in update_data and update_data["config"]:
        update_data["config"] = update_data["config"].dict()
        
    for key, value in update_data.items():
        setattr(widget, key, value)
    
    db.add(widget)
    await db.commit()
    await db.refresh(widget)
    
    # Recupera métrica se houver
    metric_data = None
    if widget.metric_id:
        metrics_service = await get_metrics_service(db)
        metric = await metrics_service.get_metric_by_id(widget.metric_id)
        if metric:
            metric_data = {
                "id": metric.id,
                "name": metric.name,
                "description": metric.description,
                "type": metric.type,
                "value": metric.value,
                "value_text": metric.value_text,
                "unit": metric.unit,
                "category": metric.category
            }
    
    response = {
        "id": widget.id,
        "dashboard_id": widget.dashboard_id,
        "metric_id": widget.metric_id,
        "widget_type": widget.widget_type,
        "title": widget.title,
        "config": widget.config,
        "position_x": widget.position_x,
        "position_y": widget.position_y,
        "width": widget.width,
        "height": widget.height,
        "metric": metric_data
    }
    
    return response


@router.delete("/widgets/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_widget(
    widget_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Remove um widget de um dashboard.
    """
    # Localiza o widget
    query = select(DashboardWidget).where(DashboardWidget.id == widget_id)
    result = await db.execute(query)
    widget = result.scalar_one_or_none()
    
    if not widget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Widget com ID {widget_id} não encontrado"
        )
    
    # Verifica se o usuário tem permissão para remover o widget
    dashboard_query = select(Dashboard).where(Dashboard.id == widget.dashboard_id)
    dashboard_result = await db.execute(dashboard_query)
    dashboard = dashboard_result.scalar_one_or_none()
    
    if dashboard and dashboard.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para remover widgets deste dashboard"
        )
    
    # Remove o widget
    await db.delete(widget)
    await db.commit()
    
    return None
