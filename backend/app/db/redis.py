"""
Inicializa a conexão com o Redis.
"""
import redis
from app.core.config import settings


def get_redis_client():
    """
    Cria e retorna um cliente Redis.
    """
    return redis.Redis.from_url(settings.REDIS_URI)
