"""
Inicializa a conexão com o banco de dados PostgreSQL usando SQLAlchemy.
"""
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from app.core.config import settings

# Configuração do pool de conexões
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    echo=settings.DEBUG,
    echo_pool=settings.DEBUG,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
    poolclass=QueuePool
)

# Evento para log de conexões
if settings.DEBUG:
    @event.listens_for(engine, "connect")
    def connect(dbapi_connection, connection_record):
        print("Nova conexão com o banco de dados estabelecida")

    @event.listens_for(engine, "checkout")
    def checkout(dbapi_connection, connection_record, connection_proxy):
        print("Conexão retirada do pool")

    @event.listens_for(engine, "checkin")
    def checkin(dbapi_connection, connection_record):
        print("Conexão devolvida ao pool")

# Cria a sessão
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para os modelos
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency para obter uma sessão do banco de dados.
    Garante que a sessão seja fechada após o uso.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_transaction() -> Generator[Session, None, None]:
    """
    Context manager para operações dentro de uma transação.
    Automaticamente realiza commit no final ou rollback em caso de exceção.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
