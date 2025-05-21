"""
Utilitário para limpeza periódica de cache e revalidação.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set

from app.services.cache import get_cache_service

logger = logging.getLogger(__name__)


class CacheInvalidator:
    """
    Utilitário para invalidação periódica de cache baseada em padrões e temporizações.
    Ajuda a manter o cache atualizado sem depender apenas do TTL individual de cada chave.
    """
    
    def __init__(self):
        self.patterns: Dict[str, Dict[str, Any]] = {}
        self.running: bool = False
        self.task: Optional[asyncio.Task] = None
    
    def register_pattern(
        self,
        pattern: str,
        invalidation_interval: int = 300,  # Segundos
        dependencies: Optional[Set[str]] = None
    ) -> None:
        """
        Registra um padrão para invalidação periódica.
        
        Args:
            pattern: O padrão de chave Redis a ser invalidado (ex: "metrics:*")
            invalidation_interval: Intervalo em segundos para invalidação
            dependencies: Conjunto de outros padrões que devem ser invalidados junto
        """
        self.patterns[pattern] = {
            "interval": invalidation_interval,
            "last_invalidated": datetime.utcnow(),
            "dependencies": dependencies or set()
        }
        logger.info(f"Padrão de cache registrado para invalidação: {pattern} (intervalo: {invalidation_interval}s)")
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalida manualmente um padrão de cache.
        
        Args:
            pattern: O padrão a ser invalidado
            
        Returns:
            Número de chaves invalidadas
        """
        cache_service = await get_cache_service()
        count = await cache_service.invalidate_pattern(pattern)
        
        # Atualiza o timestamp de última invalidação
        if pattern in self.patterns:
            self.patterns[pattern]["last_invalidated"] = datetime.utcnow()
            
        # Invalida dependências
        for dependency in self.patterns.get(pattern, {}).get("dependencies", set()):
            await cache_service.invalidate_pattern(dependency)
        
        logger.info(f"Padrão {pattern} invalidado manualmente. {count} chaves removidas.")
        return count
    
    async def start(self) -> None:
        """
        Inicia o loop de invalidação periódica.
        """
        if self.running:
            return
            
        self.running = True
        self.task = asyncio.create_task(self._invalidation_loop())
        logger.info("Serviço de invalidação periódica de cache iniciado.")
    
    async def stop(self) -> None:
        """
        Para o loop de invalidação periódica.
        """
        if not self.running:
            return
            
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
            self.task = None
        
        logger.info("Serviço de invalidação periódica de cache parado.")
    
    async def _invalidation_loop(self) -> None:
        """
        Loop principal que verifica e invalida padrões periodicamente.
        """
        while self.running:
            now = datetime.utcnow()
            
            for pattern, config in self.patterns.items():
                last_invalidated = config["last_invalidated"]
                interval = timedelta(seconds=config["interval"])
                
                if now - last_invalidated >= interval:
                    try:
                        await self.invalidate_pattern(pattern)
                    except Exception as e:
                        logger.error(f"Erro ao invalidar padrão {pattern}: {e}")
            
            # Espera 30 segundos antes da próxima verificação
            await asyncio.sleep(30)


# Instância global do invalidador
_invalidator = None


async def get_cache_invalidator() -> CacheInvalidator:
    """
    Retorna a instância global do invalidador de cache.
    """
    global _invalidator
    if _invalidator is None:
        _invalidator = CacheInvalidator()
    return _invalidator


async def setup_cache_invalidation() -> None:
    """
    Configura a invalidação periódica de cache para padrões comuns.
    Chamado durante a inicialização da aplicação.
    """
    invalidator = await get_cache_invalidator()
    
    # Registra padrões para métricas e KPIs
    invalidator.register_pattern("metrics:*", 300)
    invalidator.register_pattern("metrics_list:*", 300)
    invalidator.register_pattern("kpi_summary:*", 300, {"metrics:*"})
    invalidator.register_pattern("dashboard:*", 300, {"metrics:*"})
    invalidator.register_pattern("alert:*", 60)
    invalidator.register_pattern("alert_summary:*", 60, {"alert:*"})
    
    # Inicia o serviço
    await invalidator.start()
