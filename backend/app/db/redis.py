"""
Inicializa a conexão com o Redis.
"""
import redis
from app.core.config import settings

# Cliente Redis global
_redis_client = None


def get_redis_client() -> redis.Redis:
    """
    Retorna uma instância de cliente Redis.
    Reutiliza a conexão global se já existir.
    """
    global _redis_client
    
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=int(settings.REDIS_PORT),
            password=settings.REDIS_PASSWORD,
            decode_responses=True,  # Decodifica automaticamente para string
            socket_timeout=5,
            socket_connect_timeout=5,
        )
    
    return _redis_client


def close_redis_connection():
    """Fecha a conexão com o Redis."""
    global _redis_client
    
    if _redis_client is not None:
        _redis_client.close()
        _redis_client = None
