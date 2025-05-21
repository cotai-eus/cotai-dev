# Arquivo de inicialização do backend

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import redis

from app.core.config import settings
from app.db.init_db import init_db, close_db_connections
from app.db.redis import get_redis_client, close_redis_connection
from app.middleware.rate_limiting import RateLimiter
from app.middleware.setup import setup_rate_limiting
from app.middleware.compression import setup_compression
from app.services.cache_invalidation import setup_cache_invalidation

# Importação dos routers
from app.api.routers.auth import router as auth_router
from app.api.routers.document import router as document_router
from app.api.routers.dashboard import router as dashboard_router
from app.api.routers.metrics import router as metrics_router
from app.api.routers.messages import router as messages_router
from app.api.routers.quotation import router as quotation_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API para o sistema CotAi de gestão de cotações para licitações",
    version="0.1.0",
)

# Middleware de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração do rate limiter global (opcional, pois também aplicamos por rota)
# app.add_middleware(RateLimiter, times=100, seconds=60)

# Aplicar middleware de compressão
setup_compression(app, min_size=1000)  # Comprimir respostas maiores que 1KB

# Eventos de inicialização e desligamento
@app.on_event("startup")
async def startup_db_client():
    """
    Inicializa conexões com bancos de dados ao iniciar a aplicação.
    """
    init_db()
    
    # Inicialização do Redis para rate limiting
    redis_client = get_redis_client()
    
    # Configurar FastAPI Limiter se necessário
    # from fastapi_limiter import FastAPILimiter
    # await FastAPILimiter.init(redis_client)
    
    # Configurar rate limiting para rotas sensíveis
    setup_rate_limiting(app)
    
    # Iniciar serviço de invalidação de cache
    await setup_cache_invalidation()

@app.on_event("shutdown")
async def shutdown_db_client():
    """
    Fecha conexões com bancos de dados ao encerrar a aplicação.
    """
    close_db_connections()
    close_redis_connection()

# Endpoint de saúde para healthchecks
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

# Incluir routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(document_router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)
app.include_router(metrics_router, prefix=settings.API_V1_PREFIX)
app.include_router(messages_router, prefix=settings.API_V1_PREFIX + "/messaging")
app.include_router(quotation_router, prefix=settings.API_V1_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
