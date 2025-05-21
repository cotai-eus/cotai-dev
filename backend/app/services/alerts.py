"""
Serviço para gerenciamento de alertas de métricas.
"""
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.metric import Metric, MetricAlert
from app.services.cache import cached, get_cache_service

logger = logging.getLogger(__name__)


class AlertService:
    """Serviço para gerenciamento de alertas de métricas."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_alerts(
        self, 
        is_active: Optional[bool] = None,
        is_acknowledged: Optional[bool] = None,
        severity: Optional[str] = None,
        metric_id: Optional[int] = None,
        user_id: Optional[int] = None,
        limit: int = 100,
    ) -> List[MetricAlert]:
        """
        Recupera alertas com base nos filtros fornecidos.
        
        Args:
            is_active: Filtrar por alertas ativos/resolvidos
            is_acknowledged: Filtrar por alertas reconhecidos/não reconhecidos
            severity: Filtrar por severidade (warning, critical)
            metric_id: Filtrar por ID da métrica
            user_id: Filtrar por ID do usuário que reconheceu o alerta
            limit: Limite de resultados
            
        Returns:
            Lista de alertas que atendem aos critérios
        """
        query = select(MetricAlert)
        
        if is_active is not None:
            query = query.where(MetricAlert.is_active == is_active)
        if is_acknowledged is not None:
            query = query.where(MetricAlert.is_acknowledged == is_acknowledged)
        if severity:
            query = query.where(MetricAlert.severity == severity)
        if metric_id:
            query = query.where(MetricAlert.metric_id == metric_id)
        if user_id:
            query = query.where(MetricAlert.acknowledged_by == user_id)
            
        # Ordena por criação (mais recentes primeiro)
        query = query.order_by(MetricAlert.created_at.desc()).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_alert_by_id(self, alert_id: int) -> Optional[MetricAlert]:
        """Recupera um alerta pelo ID."""
        query = select(MetricAlert).where(MetricAlert.id == alert_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def check_metric_alert_conditions(
        self, 
        metric: Metric, 
        current_value: float
    ) -> Optional[MetricAlert]:
        """
        Verifica se uma métrica atingiu condições de alerta e cria um alerta se necessário.
        
        Args:
            metric: A métrica a ser verificada
            current_value: O valor atual da métrica
            
        Returns:
            Alerta criado ou None se nenhuma condição foi atingida
        """
        # Verifica se existe um alerta ativo para esta métrica
        existing_alert_query = select(MetricAlert).where(
            (MetricAlert.metric_id == metric.id) & 
            (MetricAlert.is_active == True)
        )
        existing_alert_result = await self.db.execute(existing_alert_query)
        existing_alert = existing_alert_result.scalar_one_or_none()
        
        # Se não temos limiares configurados, não há nada a verificar
        if metric.threshold_critical is None and metric.threshold_warning is None:
            # Se existir um alerta ativo, podemos resolvê-lo
            if existing_alert:
                await self.resolve_alert(existing_alert.id)
            return None
        
        # Verifica condições de alerta crítico
        if (metric.threshold_critical is not None and 
            ((metric.threshold_critical > 0 and current_value >= metric.threshold_critical) or
             (metric.threshold_critical < 0 and current_value <= metric.threshold_critical))):
            
            # Temos uma condição crítica
            severity = "critical"
            message = f"Valor crítico atingido para {metric.name}: {current_value} {metric.unit or ''}"
            
            # Se já existe um alerta crítico, não criamos outro
            if existing_alert and existing_alert.severity == "critical":
                return existing_alert
                
            # Se existe um alerta de warning, atualizamos para crítico
            if existing_alert and existing_alert.severity == "warning":
                existing_alert.severity = "critical"
                existing_alert.message = message
                existing_alert.value = current_value
                existing_alert.is_acknowledged = False  # Desmarca o reconhecimento
                self.db.add(existing_alert)
                await self.db.flush()
                
                # Invalida cache relacionado
                cache_service = await get_cache_service()
                await cache_service.invalidate_pattern(f"alert:*")
                
                return existing_alert
            
            # Cria um novo alerta crítico
            return await self.create_alert(metric.id, severity, message, current_value)
            
        # Verifica condições de alerta de aviso
        elif (metric.threshold_warning is not None and 
              ((metric.threshold_warning > 0 and current_value >= metric.threshold_warning) or
               (metric.threshold_warning < 0 and current_value <= metric.threshold_warning))):
            
            # Temos uma condição de aviso
            severity = "warning"
            message = f"Valor de aviso atingido para {metric.name}: {current_value} {metric.unit or ''}"
            
            # Se já existe um alerta, não criamos outro
            if existing_alert:
                return existing_alert
                
            # Cria um novo alerta de aviso
            return await self.create_alert(metric.id, severity, message, current_value)
            
        # Se não atingiu nenhuma condição, mas temos um alerta ativo, podemos resolvê-lo
        elif existing_alert:
            await self.resolve_alert(existing_alert.id)
            
        return None
    
    async def create_alert(
        self, 
        metric_id: int, 
        severity: str, 
        message: str, 
        value: float
    ) -> MetricAlert:
        """
        Cria um novo alerta de métrica.
        
        Args:
            metric_id: ID da métrica
            severity: Severidade do alerta (warning, critical)
            message: Mensagem descritiva do alerta
            value: Valor da métrica que disparou o alerta
            
        Returns:
            Alerta criado
        """
        alert = MetricAlert(
            metric_id=metric_id,
            severity=severity,
            message=message,
            value=value,
            is_active=True,
            is_acknowledged=False,
            created_at=datetime.utcnow()
        )
        
        self.db.add(alert)
        await self.db.flush()
        
        # Invalida cache relacionado
        cache_service = await get_cache_service()
        await cache_service.invalidate_pattern(f"alert:*")
        
        logger.info(f"Alerta criado: {message} [severity={severity}]")
        
        return alert
    
    async def acknowledge_alert(self, alert_id: int, user_id: int) -> MetricAlert:
        """
        Reconhece um alerta, indicando que um usuário está ciente do problema.
        
        Args:
            alert_id: ID do alerta a ser reconhecido
            user_id: ID do usuário que está reconhecendo o alerta
            
        Returns:
            Alerta atualizado
        """
        alert = await self.get_alert_by_id(alert_id)
        if not alert:
            raise ValueError(f"Alerta com ID {alert_id} não encontrado")
        
        if not alert.is_active:
            raise ValueError(f"Não é possível reconhecer um alerta já resolvido")
        
        alert.is_acknowledged = True
        alert.acknowledged_by = user_id
        self.db.add(alert)
        await self.db.flush()
        
        # Invalida cache relacionado
        cache_service = await get_cache_service()
        await cache_service.invalidate_pattern(f"alert:*")
        
        return alert
    
    async def resolve_alert(self, alert_id: int) -> MetricAlert:
        """
        Resolve um alerta, indicando que o problema foi corrigido.
        
        Args:
            alert_id: ID do alerta a ser resolvido
            
        Returns:
            Alerta atualizado
        """
        alert = await self.get_alert_by_id(alert_id)
        if not alert:
            raise ValueError(f"Alerta com ID {alert_id} não encontrado")
        
        if not alert.is_active:
            # Já está resolvido
            return alert
        
        alert.is_active = False
        alert.resolved_at = datetime.utcnow()
        self.db.add(alert)
        await self.db.flush()
        
        # Invalida cache relacionado
        cache_service = await get_cache_service()
        await cache_service.invalidate_pattern(f"alert:*")
        
        return alert
    
    @cached(key_prefix="alert_summary", ttl_seconds=60)
    async def get_alert_summary(self) -> Dict[str, Any]:
        """
        Retorna um resumo dos alertas ativos no sistema.
        
        Returns:
            Resumo com contagem de alertas por severidade e status
        """
        # Total de alertas ativos
        active_alerts_query = select(MetricAlert).where(MetricAlert.is_active == True)
        active_alerts_result = await self.db.execute(active_alerts_query)
        active_alerts = active_alerts_result.scalars().all()
        
        # Contagem por severidade
        critical_count = sum(1 for alert in active_alerts if alert.severity == "critical")
        warning_count = sum(1 for alert in active_alerts if alert.severity == "warning")
        
        # Contagem por status de reconhecimento
        acknowledged_count = sum(1 for alert in active_alerts if alert.is_acknowledged)
        unacknowledged_count = len(active_alerts) - acknowledged_count
        
        # Alertas recentes (criados nas últimas 24h)
        now = datetime.utcnow()
        recent_cutoff = now - datetime.timedelta(hours=24)
        recent_count = sum(1 for alert in active_alerts if alert.created_at >= recent_cutoff)
        
        return {
            "total_active": len(active_alerts),
            "critical": critical_count,
            "warning": warning_count,
            "acknowledged": acknowledged_count,
            "unacknowledged": unacknowledged_count,
            "recent_24h": recent_count,
            "timestamp": now.isoformat()
        }


async def get_alert_service(db: AsyncSession) -> AlertService:
    """Retorna uma instância do serviço de alertas."""
    return AlertService(db)