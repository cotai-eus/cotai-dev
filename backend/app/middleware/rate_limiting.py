"""
Middleware para rate limiting e proteção contra ataques de força bruta.
"""
from fastapi import Request, Response, HTTPException, status
import time
import redis
from typing import Dict, Any, Optional, Callable, Tuple

from app.core.config import settings
from app.db.redis import get_redis_client


class RateLimiter:
    """
    Middleware para limitar a taxa de requisições por IP ou usuário.
    Utiliza Redis para armazenar os contadores.
    """
    def __init__(
        self, 
        times: int = 100, 
        seconds: int = 60,
        prefix: str = "rl:",
        key_func: Optional[Callable[[Request], str]] = None,
        block_duration: int = 600  # 10 minutos de bloqueio após exceder limite
    ):
        self.times = times
        self.seconds = seconds
        self.prefix = prefix
        self.key_func = key_func or self._default_key_func
        self.block_duration = block_duration
        self.redis = get_redis_client()

    async def _default_key_func(self, request: Request) -> str:
        """
        Cria uma chave baseada no IP do cliente e path da requisição.
        Por padrão, limita por IP + path.
        """
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        return f"{client_ip}:{path}"

    async def is_rate_limited(self, request: Request) -> Tuple[bool, int]:
        """
        Verifica se a requisição ultrapassa o limite de taxa.
        Retorna (is_limited, remaining)
        """
        key = await self.key_func(request)
        redis_key = f"{self.prefix}{key}"
        
        # Verifica se o IP está bloqueado
        block_key = f"block:{self.prefix}{key}"
        is_blocked = await self.redis.get(block_key)
        if is_blocked:
            ttl = await self.redis.ttl(block_key)
            return True, ttl
            
        # Obtém o contador atual
        current = await self.redis.get(redis_key)
        if current is None:
            # Primeira requisição para esta chave
            await self.redis.setex(redis_key, self.seconds, 1)
            return False, self.times - 1
            
        # Incrementa o contador
        current = int(current)
        if current >= self.times:
            # Excedeu o limite, bloqueia
            await self.redis.setex(block_key, self.block_duration, 1)
            return True, 0
            
        # Incrementa o contador
        await self.redis.incr(redis_key)
        ttl = await self.redis.ttl(redis_key)
        if ttl == -1:
            # Se o TTL for -1, a chave não tem expiração definida
            await self.redis.expire(redis_key, self.seconds)
            
        return False, self.times - (current + 1)

    async def __call__(self, request: Request, call_next):
        """
        Middleware para aplicar rate limiting.
        """
        is_limited, remaining = await self.is_rate_limited(request)
        
        if is_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Muitas requisições. Tente novamente em {remaining} segundos."
            )
        
        response = await call_next(request)
        
        # Adiciona header com informações de rate limiting
        response.headers["X-RateLimit-Limit"] = str(self.times)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response
        

# Funções de utilidade para aplicar rate limiting diretamente nas rotas
async def rate_limit_ip(request: Request, times: int = 5, seconds: int = 60):
    """
    Rate limiting por IP para proteger endpoints sensíveis.
    Útil para rotas como login, registro, reset de senha.
    """
    limiter = RateLimiter(times=times, seconds=seconds, prefix="ip:")
    is_limited, remaining = await limiter.is_rate_limited(request)
    
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Muitas requisições. Tente novamente em {remaining} segundos."
        )


async def rate_limit_user(request: Request, user_id: int, times: int = 20, seconds: int = 60):
    """
    Rate limiting por usuário autenticado.
    Útil para limitar ações de usuários específicos.
    """
    # Cria uma chave baseada no ID do usuário
    async def user_key_func(req: Request) -> str:
        return f"user:{user_id}:{req.url.path}"
    
    limiter = RateLimiter(
        times=times, 
        seconds=seconds, 
        prefix="user:", 
        key_func=user_key_func
    )
    is_limited, remaining = await limiter.is_rate_limited(request)
    
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Muitas requisições. Tente novamente em {remaining} segundos."
        )


# Configuração global para diferentes tipos de rate limiting
LOGIN_LIMIT = 5  # 5 tentativas
LOGIN_PERIOD = 300  # 5 minutos
REGISTER_LIMIT = 3  # 3 registros
REGISTER_PERIOD = 3600  # 1 hora
RESET_PASSWORD_LIMIT = 3  # 3 resets
RESET_PASSWORD_PERIOD = 3600  # 1 hora
