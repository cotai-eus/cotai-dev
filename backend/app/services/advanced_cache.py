"""
Serviço avançado de cache para armazenar resultados de consultas pesadas e relatórios.
"""
import json
import logging
from typing import Any, Dict, List, Optional, TypeVar, Generic, Callable, Union, Tuple
import hashlib
import pickle
from datetime import datetime, timedelta
from functools import wraps

from redis.asyncio import Redis

from app.db.redis import get_redis_client
from app.services.cache import CacheService

logger = logging.getLogger(__name__)

T = TypeVar('T')


class AdvancedCacheService:
    """
    Serviço avançado de cache que fornece recursos adicionais como:
    - Cache de relatórios
    - Cache baseado em hash de parâmetros complexos
    - Cache com TTL progressivo
    - Invalidação em cascata
    - Cache com múltiplos níveis (memória e redis)
    """
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.base_cache = CacheService(redis_client)
        self._memory_cache: Dict[str, Tuple[Any, datetime]] = {}
    
    async def get_from_memory(self, key: str) -> Optional[Any]:
        """Recupera um valor do cache em memória."""
        if key in self._memory_cache:
            value, expiry = self._memory_cache[key]
            if expiry > datetime.now():
                return value
            else:
                # Remove itens expirados
                del self._memory_cache[key]
        return None
    
    def set_in_memory(self, key: str, value: Any, ttl_seconds: int = 60) -> None:
        """Armazena um valor no cache em memória."""
        expiry = datetime.now() + timedelta(seconds=ttl_seconds)
        self._memory_cache[key] = (value, expiry)
    
    async def get_or_set_multi_level(
        self,
        key: str,
        callback: Callable[[], T],
        redis_ttl: int = 300,
        memory_ttl: int = 60,
        force_refresh: bool = False
    ) -> T:
        """
        Tenta recuperar um valor usando cache multinível (memória -> redis).
        Se não existir ou force_refresh for True, executa o callback para obter o valor,
        armazena no cache e o retorna.
        """
        if not force_refresh:
            # Primeiro tenta do cache em memória (mais rápido)
            memory_value = await self.get_from_memory(key)
            if memory_value is not None:
                logger.debug(f"Cache hit (memory): {key}")
                return memory_value
            
            # Depois tenta do Redis
            redis_value = await self.base_cache.get(key)
            if redis_value:
                try:
                    parsed_value = json.loads(redis_value)
                    # Atualiza também o cache em memória
                    self.set_in_memory(key, parsed_value, memory_ttl)
                    logger.debug(f"Cache hit (redis): {key}")
                    return parsed_value
                except json.JSONDecodeError:
                    return redis_value
        
        # Executa o callback para obter o valor
        logger.debug(f"Cache miss: {key}")
        value = await callback()
        
        # Armazena no redis
        await self.base_cache.set(key, value, redis_ttl)
        
        # Armazena em memória
        self.set_in_memory(key, value, memory_ttl)
        
        return value
    
    @staticmethod
    def hash_params(*args, **kwargs) -> str:
        """
        Cria um hash único baseado nos parâmetros fornecidos.
        Útil para gerar chaves de cache para funções com parâmetros complexos.
        """
        # Converter argumentos para string e fazer hash
        hasher = hashlib.md5()
        
        # Adiciona args ao hash
        for arg in args:
            hasher.update(str(arg).encode('utf-8'))
        
        # Adiciona kwargs ordenados ao hash
        for k, v in sorted(kwargs.items()):
            hasher.update(f"{k}:{v}".encode('utf-8'))
            
        return hasher.hexdigest()
    
    async def cache_report(
        self, 
        report_type: str,
        report_data: Any,
        user_id: Optional[int] = None,
        ttl_seconds: int = 3600  # 1 hora por padrão
    ) -> str:
        """
        Armazena os resultados de um relatório em cache.
        Retorna um ID único para recuperar o relatório posteriormente.
        """
        # Gera um ID único para o relatório
        timestamp = datetime.now().isoformat()
        report_id = self.hash_params(report_type, user_id, timestamp)
        
        # Cria a chave do cache
        cache_key = f"report:{report_type}:{report_id}"
        
        # Armazena metadados junto com os dados do relatório
        report_cache = {
            "id": report_id,
            "type": report_type,
            "user_id": user_id,
            "generated_at": timestamp,
            "data": report_data
        }
        
        # Armazena no Redis com TTL
        await self.base_cache.set(cache_key, report_cache, ttl_seconds)
        
        # Também adiciona à lista de relatórios do usuário, se aplicável
        if user_id:
            user_reports_key = f"user:{user_id}:reports"
            try:
                # Obtém a lista atual de relatórios do usuário
                user_reports = await self.base_cache.get(user_reports_key)
                if user_reports:
                    reports_list = json.loads(user_reports)
                else:
                    reports_list = []
                
                # Adiciona o novo relatório ao início da lista (mais recente primeiro)
                reports_list.insert(0, {
                    "id": report_id,
                    "type": report_type,
                    "generated_at": timestamp
                })
                
                # Limita a quantidade de relatórios na lista (manter apenas os 10 mais recentes)
                if len(reports_list) > 10:
                    reports_list = reports_list[:10]
                    
                # Atualiza a lista no cache
                await self.base_cache.set(user_reports_key, reports_list, 86400)  # 24 horas
                
            except Exception as e:
                logger.error(f"Erro ao atualizar lista de relatórios do usuário: {e}")
        
        return report_id
    
    async def get_report(
        self, 
        report_type: str,
        report_id: str,
        user_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Recupera um relatório do cache pelo seu ID.
        """
        cache_key = f"report:{report_type}:{report_id}"
        report_data = await self.base_cache.get(cache_key)
        
        if not report_data:
            return None
            
        try:
            report = json.loads(report_data)
            
            # Verifica se o relatório pertence ao usuário, se um ID de usuário for fornecido
            if user_id and report.get("user_id") and int(report["user_id"]) != int(user_id):
                logger.warning(f"Tentativa de acesso a relatório de outro usuário: {report_id} por {user_id}")
                return None
                
            return report
        except json.JSONDecodeError:
            logger.error(f"Erro ao decodificar relatório do cache: {report_id}")
            return None
    
    async def list_user_reports(
        self, 
        user_id: int
    ) -> List[Dict[str, Any]]:
        """
        Lista todos os relatórios em cache para um usuário específico.
        """
        user_reports_key = f"user:{user_id}:reports"
        reports_data = await self.base_cache.get(user_reports_key)
        
        if not reports_data:
            return []
            
        try:
            return json.loads(reports_data)
        except json.JSONDecodeError:
            logger.error(f"Erro ao decodificar lista de relatórios do usuário: {user_id}")
            return []


# Decorator para cache multinível
def advanced_cached(
    key_prefix: str, 
    redis_ttl: int = 300,  # 5 minutos no Redis
    memory_ttl: int = 60   # 1 minuto em memória
):
    """
    Decorator para cachear o resultado de uma função usando cache multinível.
    Muito mais eficiente para funções chamadas frequentemente.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Ignorar o parâmetro self para métodos de classe
            args_to_use = args[1:] if args and hasattr(args[0], '__class__') else args
            
            # Gera um hash dos argumentos para criar uma chave única
            params_hash = AdvancedCacheService.hash_params(*args_to_use, **kwargs)
            cache_key = f"{key_prefix}:{params_hash}"
            
            # Obtém cliente redis
            redis_client = await get_redis_client()
            advanced_cache = AdvancedCacheService(redis_client)
            
            # Verifica se force_refresh foi passado como parâmetro
            force_refresh = kwargs.pop('force_refresh', False) if 'force_refresh' in kwargs else False
            
            # Função para obter o valor real
            async def fetch_value():
                return await func(*args, **kwargs)
            
            # Retorna do cache ou executa a função
            return await advanced_cache.get_or_set_multi_level(
                cache_key, 
                fetch_value, 
                redis_ttl=redis_ttl,
                memory_ttl=memory_ttl,
                force_refresh=force_refresh
            )
        
        return wrapper
    
    return decorator


async def get_advanced_cache_service() -> AdvancedCacheService:
    """Cria e retorna uma instância do serviço avançado de cache."""
    redis_client = await get_redis_client()
    return AdvancedCacheService(redis_client)