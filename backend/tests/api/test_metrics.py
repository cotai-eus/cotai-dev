"""
Testes para verificar os cálculos de métricas e KPIs.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock, AsyncMock

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.metric import Metric, MetricHistory, AggregationType, TimeGranularity
from app.services.metrics import MetricsService


@pytest.fixture
async def sample_metrics(db_session: AsyncSession):
    """Fixture para criar métricas de amostra para testes."""
    # Cria métricas de teste
    metrics = [
        {
            "name": "total_cotacoes",
            "description": "Total de cotações",
            "type": "count",
            "value": 100.0,
            "unit": "unidades",
            "category": "kpi",
            "is_realtime": False,
            "threshold_warning": 10.0,
            "threshold_critical": 5.0,
        },
        {
            "name": "cotacoes_sucesso",
            "description": "Cotações com sucesso",
            "type": "count",
            "value": 75.0,
            "unit": "unidades",
            "category": "kpi",
            "is_realtime": False,
        },
        {
            "name": "taxa_conversao",
            "description": "Taxa de conversão",
            "type": "rate",
            "value": 0.75,
            "unit": "%",
            "category": "kpi",
            "is_realtime": False,
            "threshold_warning": 0.6,
            "threshold_critical": 0.5,
        },
    ]
    
    result_metrics = []
    for metric_data in metrics:
        stmt = insert(Metric).values(**metric_data)
        result = await db_session.execute(stmt)
        metric_id = result.inserted_primary_key[0]
        
        # Cria histórico para a métrica
        now = datetime.utcnow()
        for i in range(10):
            history_entry = {
                "metric_id": metric_id,
                "value": metric_data["value"] * (0.9 + 0.02 * i),  # Variação de valores
                "timestamp": now - timedelta(days=i),
            }
            await db_session.execute(insert(MetricHistory).values(**history_entry))
        
        # Recupera a métrica criada
        metric = await db_session.get(Metric, metric_id)
        result_metrics.append(metric)
    
    await db_session.commit()
    return result_metrics


@pytest.mark.asyncio
async def test_get_metrics(db_session: AsyncSession, sample_metrics):
    """Testa a função para obter métricas."""
    # Configura o serviço
    metrics_service = MetricsService(db_session)
    
    # Testa função get_metrics
    metrics = await metrics_service.get_metrics(category="kpi")
    
    # Verifica resultados
    assert len(metrics) == 3
    assert any(m.name == "total_cotacoes" for m in metrics)
    assert any(m.name == "cotacoes_sucesso" for m in metrics)
    assert any(m.name == "taxa_conversao" for m in metrics)


@pytest.mark.asyncio
async def test_get_metric_by_id(db_session: AsyncSession, sample_metrics):
    """Testa a função para obter métrica por ID."""
    # Configura o serviço
    metrics_service = MetricsService(db_session)
    
    # Testa função get_metric_by_id
    metric = await metrics_service.get_metric_by_id(sample_metrics[0].id)
    
    # Verifica resultados
    assert metric is not None
    assert metric.name == "total_cotacoes"
    assert metric.value == 100.0


@pytest.mark.asyncio
async def test_get_metric_history(db_session: AsyncSession, sample_metrics):
    """Testa a função para obter histórico de métrica."""
    # Configura o serviço
    metrics_service = MetricsService(db_session)
    
    # Define período
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=10)
    
    # Testa função get_metric_history
    history = await metrics_service.get_metric_history(
        metric_id=sample_metrics[0].id,
        start_date=start_date,
        end_date=end_date,
        granularity=TimeGranularity.DAY
    )
    
    # Verifica resultados
    assert history is not None
    assert len(history) > 0
    assert "period" in history[0]
    assert "avg_value" in history[0]


@pytest.mark.asyncio
async def test_calculate_aggregated_metric(db_session: AsyncSession, sample_metrics):
    """Testa a função para calcular métrica agregada."""
    # Configura o serviço
    metrics_service = MetricsService(db_session)
    
    # Define período
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=10)
    
    # Testa função calculate_aggregated_metric
    metric_ids = [m.id for m in sample_metrics[:2]]  # Usa as duas primeiras métricas
    result = await metrics_service.calculate_aggregated_metric(
        metric_ids=metric_ids,
        aggregation_type=AggregationType.AVG,
        start_date=start_date,
        end_date=end_date
    )
    
    # Verifica resultados
    assert result is not None
    assert "value" in result
    assert isinstance(result["value"], float) or result["value"] is None


@pytest.mark.asyncio
async def test_update_metric_value(db_session: AsyncSession, sample_metrics):
    """Testa a função para atualizar valor de métrica."""
    # Configura o serviço
    metrics_service = MetricsService(db_session)
    
    # Define novo valor
    new_value = 120.0
    
    # Configura mock para alert_service
    with patch("app.services.metrics.AlertService") as mock_alert_service:
        # Mock do objeto e método
        mock_service = MagicMock()
        mock_check = AsyncMock()
        mock_service.check_metric_alert_conditions = mock_check
        mock_alert_service.return_value = mock_service
        
        # Testa função update_metric_value
        metric, history = await metrics_service.update_metric_value(
            metric_id=sample_metrics[0].id,
            value=new_value,
            check_alerts=True
        )
        
        # Verifica resultados
        assert metric.value == new_value
        assert history.value == new_value
        mock_check.assert_called_once()
