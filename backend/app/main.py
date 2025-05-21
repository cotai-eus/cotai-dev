# Arquivo de inicialização do backend

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="CotAi API",
    description="API para o sistema CotAi de gestão de cotações para licitações",
    version="0.1.0",
)

# Middleware de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar origens exatas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint de saúde para healthchecks
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

# Importar e incluir routers aqui quando estiverem disponíveis
# from app.api.routers import router
# app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
