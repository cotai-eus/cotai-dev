"""
Inicializa a conexão com o MongoDB.
"""
from typing import Generator
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure

from app.core.config import settings

# Singleton para o cliente MongoDB
_mongo_client = None


def get_mongodb_client() -> MongoClient:
    """
    Cria e retorna um cliente MongoDB singleton.
    """
    global _mongo_client
    if _mongo_client is None:
        print("Inicializando conexão com MongoDB")
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
            print("Conexão com MongoDB estabelecida com sucesso")
        except ConnectionFailure:
            print("Não foi possível se conectar ao MongoDB")
            raise
    return _mongo_client


def get_mongodb() -> Generator[Database, None, None]:
    """
    Dependency para obter uma conexão com o banco de dados MongoDB.
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
        print("Fechando conexão com MongoDB")
        _mongo_client.close()
        _mongo_client = None
