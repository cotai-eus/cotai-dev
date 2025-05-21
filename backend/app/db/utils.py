"""
Utilitários para gerenciamento do banco de dados.
"""
from app.db.session import Base, engine


def create_database_and_tables() -> None:
    """
    Cria o banco de dados e as tabelas definidas.
    Deve ser chamado durante a inicialização da aplicação.
    """
    # Cria todas as tabelas definidas
    Base.metadata.create_all(bind=engine)


def drop_database_and_tables() -> None:
    """
    Remove todas as tabelas do banco de dados.
    Deve ser usado apenas em ambiente de desenvolvimento ou testes.
    """
    # Remove todas as tabelas definidas
    Base.metadata.drop_all(bind=engine)
