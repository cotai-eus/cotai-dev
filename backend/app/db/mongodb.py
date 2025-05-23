"""
Inicializa a conexão com o MongoDB.
"""
from typing import Generator
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure

from app.core.config import settings
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_fixed

# Singleton para o cliente MongoDB
_mongo_client = None


def get_mongodb_client() -> MongoClient:
    """
    Cria e retorna um cliente MongoDB singleton.
    """
    global _mongo_client
    if _mongo_client is None:
        logger.info("Inicializando conexão com MongoDB")
        _mongo_client = MongoClient(
            settings.MONGODB_URI,
            maxPoolSize=10,
            minPoolSize=1,
            maxIdleTimeMS=30000,
            connectTimeoutMS=5000,
            serverSelectionTimeoutMS=5000,
            waitQueueTimeoutMS=5000
        )
        # Verificando a conexão
        try:
            _mongo_client.admin.command('ping')
            logger.info("Conexão com MongoDB estabelecida com sucesso")
        except ConnectionFailure:
            logger.error("Não foi possível se conectar ao MongoDB")
            raise
    return _mongo_client


@retry(stop=stop_after_attempt(5), wait=wait_fixed(1))
def get_mongodb() -> Generator[Database, None, None]:
    """
    Dependency para obter uma conexão com o banco de dados MongoDB.
    Implementa retry para lidar com falhas temporárias de conexão.
    """
    client = get_mongodb_client()
    try:
        db = client[settings.MONGO_INITDB_DATABASE]
        yield db
    finally:
        # Não fechamos o cliente aqui para reutilização de conexão
        pass


def close_mongodb_connection() -> None:
    """
    Fecha a conexão com o MongoDB.
    Deve ser chamado ao encerrar a aplicação.
    """
    global _mongo_client
    if _mongo_client is not None:
        logger.info("Fechando conexão com MongoDB")
        _mongo_client.close()
        _mongo_client = None
