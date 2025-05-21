"""
Testes para conexão com o MongoDB.
"""
import pytest
from pymongo.errors import ConnectionFailure

from app.db.mongodb_client import get_mongodb_client, get_mongodb


def test_mongodb_connection():
    """
    Testa se a conexão com o MongoDB está funcionando.
    """
    # Obtém o cliente
    client = get_mongodb_client()
    
    # Testa a conexão
    try:
        client.admin.command('ping')
    except ConnectionFailure:
        pytest.fail("Não foi possível estabelecer conexão com o MongoDB")


def test_get_mongodb_generator():
    """
    Testa o gerador de conexão com o MongoDB.
    """
    # Obtém o gerador
    db_generator = get_mongodb()
    
    # Obtém o banco de dados
    db = next(db_generator)
    
    try:
        # Testa se consegue acessar uma coleção
        collection = db.test_collection
        assert collection is not None, "Não foi possível acessar uma coleção no MongoDB"
    finally:
        # Fecha o gerador manualmente
        try:
            db_generator.send(None)
        except StopIteration:
            pass
