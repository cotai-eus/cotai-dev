"""
Inicialização dos bancos de dados e modelos.
"""
from app.db.session import engine, Base
from app.db.mongodb_client import get_mongodb_client, close_mongodb_connection
from app.db.utils import create_database_and_tables

# Importa todos os modelos aqui para que o SQLAlchemy os reconheça
from app.models.user import User, Item


def init_db():
    """
    Inicializa os bancos de dados.
    Deve ser chamado durante a inicialização da aplicação.
    """
    # Inicializa o cliente MongoDB
    get_mongodb_client()
    
    # Cria as tabelas no PostgreSQL
    create_database_and_tables()
    
    # Adicione qualquer lógica adicional de inicialização aqui
    # Por exemplo, criar usuários iniciais, migrar dados, etc.


def close_db_connections():
    """
    Fecha as conexões com os bancos de dados.
    Deve ser chamado ao encerrar a aplicação.
    """
    # Fecha a conexão com o MongoDB
    close_mongodb_connection()
