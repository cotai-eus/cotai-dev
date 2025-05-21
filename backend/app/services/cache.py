from datetime import datetime, timedelta
import json
import logging
from typing import Any, Dict, List, Optional, TypeVar, Generic, Callable, Union

from functools import wraps
from redis.asyncio import Redis

from app.db.redis import get_redis_client

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CacheService:
    """Serviço de cache utilizando Redis para armazenar consultas frequentes."""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
    
    async def get(self, key: str) -> Optional[str]:
        """Recupera um valor do cache."""
        try:
            return await self.redis.get(key)
        except Exception as e:
            logger.error(f"Erro ao recuperar do cache: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """Armazena um valor no cache com TTL (tempo de vida)."""
        try:
            # Para objetos complexos, convertemos para JSON
            if not isinstance(value, (str, bytes, int, float)):
                value = json.dumps(value)
            
            return await self.redis.set(key, value, ex=ttl_seconds)
        except Exception as e:
            logger.error(f"Erro ao armazenar no cache: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Remove um valor do cache."""
        try:
            return await self.redis.delete(key) > 0
        except Exception as e:
            logger.error(f"Erro ao remover do cache: {e}")
            return False
    
    async def get_or_set(
        self, 
        key: str, 
        callback: Callable[[], T], 
        ttl_seconds: int = 300, 
        force_refresh: bool = False
    ) -> T:
        """
        Tenta recuperar um valor do cache. Se não existir ou force_refresh for True, 
        executa o callback para obter o valor, armazena no cache e o retorna.
        """
        if not force_refresh:
            cached_value = await self.get(key)
            if cached_value:
                try:
                    return json.loads(cached_value)
                except json.JSONDecodeError:
                    # Se não for um JSON válido, pode ser um valor simples
                    return cached_value
        
        # Executa o callback para obter o valor
        value = await callback()
        
        # Armazena no cache
        await self.set(key, value, ttl_seconds)
        
        return value
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalida todas as chaves que correspondem ao padrão especificado."""
        try:
            keys = await self.redis.keys(pattern)
            if not keys:
                return 0
            
            return await self.redis.delete(*keys)
        except Exception as e:
            logger.error(f"Erro ao invalidar padrão no cache: {e}")
            return 0
    
    async def get_keys(self, pattern: str) -> List[str]:
        """Obtém todas as chaves que correspondem ao padrão especificado."""
        try:
            keys = await self.redis.keys(pattern)
            return [key.decode('utf-8') for key in keys]
        except Exception as e:
            logger.error(f"Erro ao obter chaves do cache: {e}")
            return []


# Decorator para cache de funções/métodos
def cached(key_prefix: str, ttl_seconds: int = 300):
    """
    Decorator para cachear o resultado de uma função ou método.
    Utiliza como chave o prefixo fornecido mais os argumentos da função.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Ignorar o parâmetro self para métodos de classe
            args_to_use = args[1:] if args and hasattr(args[0], '__class__') else args
            
            # Constrói a chave do cache com o prefixo e os argumentos
            key_parts = [key_prefix]
            
            for arg in args_to_use:
                if isinstance(arg, (str, int, float, bool)):
                    key_parts.append(str(arg))
            
            for k, v in sorted(kwargs.items()):
                if isinstance(v, (str, int, float, bool)):
                    key_parts.append(f"{k}:{v}")
            
            cache_key = ":".join(key_parts)
            
            # Obtém cliente redis
            redis_client = await get_redis_client()
            cache_service = CacheService(redis_client)
            
            # Verifica se force_refresh foi passado como parâmetro
            force_refresh = kwargs.pop('force_refresh', False) if 'force_refresh' in kwargs else False
            
            # Função para obter o valor real
            async def fetch_value():
                return await func(*args, **kwargs)
            
            # Retorna do cache ou executa a função
            return await cache_service.get_or_set(
                cache_key, 
                fetch_value, 
                ttl_seconds, 
                force_refresh
            )
        
        return wrapper
    
    return decorator


async def get_cache_service() -> CacheService:
    """Cria e retorna uma instância do serviço de cache."""
    redis_client = await get_redis_client()
    return CacheService(redis_client)