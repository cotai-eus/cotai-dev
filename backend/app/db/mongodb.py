"""
Inicializa a conexão com o MongoDB.
"""
from pymongo import MongoClient
from app.core.config import settings


def get_mongodb_client():
    """
    Cria e retorna um cliente MongoDB.
    """
    return MongoClient(settings.MONGODB_URI)


def get_mongodb():
    """
    Dependency para obter uma conexão com o banco de dados MongoDB.
    """
    client = get_mongodb_client()
    try:
        db = client[settings.MONGO_INITDB_DATABASE]
        yield db
    finally:
        client.close()
