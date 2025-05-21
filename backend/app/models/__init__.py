"""
Inicializa os modelos do SQLAlchemy.
"""
# Importa todos os modelos aqui
from app.models.user import User, Item

# Adicione mais importações conforme necessário

__all__ = ["User", "Item"]
