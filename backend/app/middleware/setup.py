"""
Configuração adicional do FastAPI para aplicar middleware de rate limiting.
"""
from fastapi import FastAPI, Request, Response, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable, List, Dict, Any, Optional, Tuple
import time
import logging

from app.core.config import settings
from app.middleware.rate_limiting import rate_limit_ip, rate_limit_user, RateLimiter

logger = logging.getLogger(__name__)

class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Middleware para aplicar rate limiting por path.
    """
    def __init__(
        self, 
        app: ASGIApp, 
        sensitive_paths: Dict[str, Dict[str, Any]] = None,
        enable_logging: bool = True
    ):
        super().__init__(app)
        self.sensitive_paths = sensitive_paths or {}
        self.enable_logging = enable_logging
    
    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        start_time = time.time()
        
        # Verificação de rate limiting
        limited = False
        remaining = 0
        
        # Verifica se o path atual está na lista de paths sensíveis
        for pattern, limits in self.sensitive_paths.items():
            if pattern in path:
                # Aplica rate limiting com os limites específicos para este path
                try:
                    await rate_limit_ip(
                        request, 
                        times=limits.get("times", 5), 
                        seconds=limits.get("seconds", 60)
                    )
                except Exception as e:
                    limited = True
                    if self.enable_logging:
                        logger.warning(
                            f"Rate limit exceeded for IP {client_ip} on path {path}: {str(e)}"
                        )
                    # Propagar a exceção para que a resposta 429 seja retornada
                    raise e
                
                break
                
        # Continua com a requisição se não for limitada
        response = await call_next(request)
        
        # Adiciona headers de telemetria se o logging estiver ativado
        if self.enable_logging:
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            
            if limited:
                response.headers["X-Rate-Limited"] = "true"
                response.headers["X-Rate-Limit-Remaining"] = str(remaining)
        
        return response


def setup_rate_limiting(app: FastAPI):
    """
    Configura rate limiting para paths sensíveis com diferentes limites baseados
    na criticidade da operação.
    """
    # Define paths sensíveis e seus limites
    sensitive_paths = {
        # Autenticação - mais restritivo
        "/auth/login": {"times": 5, "seconds": 300},  # 5 tentativas a cada 5 minutos
        "/auth/register": {"times": 3, "seconds": 3600},  # 3 registros por hora
        "/auth/reset-password": {"times": 3, "seconds": 3600},  # 3 resets por hora
        
        # APIs que podem ser computacionalmente intensivas
        "/metrics": {"times": 30, "seconds": 60},  # 30 chamadas por minuto
        "/dashboard": {"times": 20, "seconds": 60},  # 20 chamadas por minuto
        "/quotation": {"times": 50, "seconds": 60},  # 50 chamadas por minuto
        
        # APIs de documentos (podem ser grandes)
        "/document/upload": {"times": 10, "seconds": 60},  # 10 uploads por minuto
        "/document/process": {"times": 5, "seconds": 60},  # 5 processamentos por minuto
    }
    
    # Adiciona o middleware de rate limiting
    app.add_middleware(
        RateLimitingMiddleware,
        sensitive_paths=sensitive_paths,
        enable_logging=settings.ENABLE_TELEMETRY
    )
    
    # Log de configuração
    if settings.ENABLE_TELEMETRY:
        paths_config = ", ".join([f"{k}:{v['times']}/{v['seconds']}s" for k, v in sensitive_paths.items()])
        logger.info(f"Rate limiting configurado para paths: {paths_config}")
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
