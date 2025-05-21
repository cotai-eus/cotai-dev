"""
Middleware para compressão de respostas HTTP.
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable
import gzip


class CompressionMiddleware(BaseHTTPMiddleware):
    """
    Middleware para aplicar compressão gzip nas respostas HTTP.
    Comprime respostas apenas quando:
    1. O cliente suporta gzip (cabeçalho Accept-Encoding contém 'gzip')
    2. A resposta não está já comprimida (não tem Content-Encoding)
    3. O tamanho da resposta é maior que min_size
    """
    def __init__(
        self, 
        app: ASGIApp, 
        min_size: int = 500,
        compression_level: int = 6
    ):
        super().__init__(app)
        self.min_size = min_size
        self.compression_level = compression_level
    
    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        # Verifica se o cliente aceita compressão gzip
        accept_encoding = request.headers.get("Accept-Encoding", "")
        
        response = await call_next(request)
        
        # Não comprime se:
        # - O cliente não aceita gzip
        # - A resposta já tem um Content-Encoding
        # - Não há corpo na resposta
        # - A resposta é muito pequena para valer a pena comprimir
        if (
            "gzip" not in accept_encoding
            or response.headers.get("Content-Encoding")
            or not hasattr(response, "body")
            or len(response.body) < self.min_size
        ):
            return response
            
        # Comprime o corpo da resposta
        compressed_body = gzip.compress(
            response.body, 
            compresslevel=self.compression_level
        )
        
        # Atualiza os cabeçalhos da resposta
        response.headers["Content-Encoding"] = "gzip"
        response.headers["Content-Length"] = str(len(compressed_body))
        response.body = compressed_body
        
        return response


def setup_compression(app: ASGIApp, min_size: int = 1000):
    """
    Configura a compressão para o aplicativo.
    
    Args:
        app: Aplicativo FastAPI
        min_size: Tamanho mínimo da resposta para aplicar compressão (em bytes)
    """
    app.add_middleware(
        CompressionMiddleware,
        min_size=min_size,
        compression_level=6
    )
