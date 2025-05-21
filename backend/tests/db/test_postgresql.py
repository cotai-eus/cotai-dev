"""
Testes para conexão com o PostgreSQL.
"""
import pytest
from sqlalchemy import text

from app.db.session import get_db


def test_postgresql_connection(db_session):
    """
    Testa se a conexão com o PostgreSQL está funcionando.
    """
    # Executa uma consulta simples
    result = db_session.execute(text("SELECT 1")).scalar()
    assert result == 1, "Não foi possível estabelecer conexão com o PostgreSQL"


def test_get_db_generator():
    """
    Testa o gerador de conexão com o banco de dados.
    """
    # Obtém o gerador
    db_generator = get_db()
    
    # Obtém a sessão
    db = next(db_generator)
    
    try:
        # Executa uma consulta simples
        result = db.execute(text("SELECT 1")).scalar()
        assert result == 1, "Não foi possível estabelecer conexão com o PostgreSQL usando get_db()"
    finally:
        # Fecha a sessão manualmente
        try:
            db_generator.send(None)
        except StopIteration:
            pass
