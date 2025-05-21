"""
Configurações para testes.
"""
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.db.session import Base
from app.models.user import User, Item  # Importamos os modelos aqui para que sejam criados no banco de teste


# Substitui a URL do banco de dados para testes em memória ou um banco temporário
TEST_SQLALCHEMY_DATABASE_URI = "postgresql+psycopg://postgres:postgres@localhost:5432/test_cotai"


@pytest.fixture(scope="session")
def test_engine():
    """
    Cria uma engine de teste para o SQLAlchemy.
    """
    engine = create_engine(
        TEST_SQLALCHEMY_DATABASE_URI,
        poolclass=NullPool,
    )
    # Cria todas as tabelas no banco de teste
    Base.metadata.create_all(bind=engine)
    yield engine
    # Limpa as tabelas ao final
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(test_engine):
    """
    Cria uma sessão de teste para cada função de teste.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = SessionLocal()
    
    yield session
    
    # Limpa a sessão ao final de cada teste
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="session")
def mongodb_client():
    """
    Cria um cliente MongoDB para testes.
    """
    from pymongo import MongoClient
    
    # Use a URL do MongoDB de teste
    client = MongoClient(settings.MONGODB_URI)
    yield client
    
    # Limpa o banco de dados ao final
    client.drop_database(settings.MONGO_INITDB_DATABASE)
