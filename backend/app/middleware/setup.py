"""
Configuração adicional do FastAPI para aplicar middleware de rate limiting.
"""
from fastapi import FastAPI, Request, Response, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable, List, Dict, Any, Optional
import time

from app.core.config import settings
from app.middleware.rate_limiting import rate_limit_ip, rate_limit_user


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Middleware para aplicar rate limiting por path.
    """
    def __init__(
        self, 
        app: ASGIApp, 
        sensitive_paths: Dict[str, Dict[str, Any]] = None
    ):
        super().__init__(app)
        self.sensitive_paths = sensitive_paths or {}
    
    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        path = request.url.path
        
        # Verifica se o path atual está na lista de paths sensíveis
        for pattern, limits in self.sensitive_paths.items():
            if pattern in path:
                # Aplica rate limiting com os limites específicos para este path
                await rate_limit_ip(
                    request, 
                    times=limits.get("times", 5), 
                    seconds=limits.get("seconds", 60)
                )
                break
                
        # Continua com a requisição
        response = await call_next(request)
        return response


def setup_rate_limiting(app: FastAPI):
    """
    Configura rate limiting para paths sensíveis.
    """
    # Define paths sensíveis e seus limites
    sensitive_paths = {
        "/api/v1/auth/login": {"times": 5, "seconds": 300},  # 5 tentativas em 5 minutos
        "/api/v1/auth/register": {"times": 3, "seconds": 3600},  # 3 registros por hora
        "/api/v1/auth/reset-password": {"times": 3, "seconds": 3600},  # 3 resets por hora
        "/api/v1/auth/verify-2fa": {"times": 5, "seconds": 300},  # 5 tentativas em 5 minutos
        "/api/v1/auth/oauth": {"times": 10, "seconds": 600},  # 10 tentativas em 10 minutos
    }
    
    # Adiciona o middleware à aplicação
    app.add_middleware(
        RateLimitingMiddleware,
        sensitive_paths=sensitive_paths
    )
