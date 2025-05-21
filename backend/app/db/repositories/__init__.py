"""
Inicialização de repositórios.
"""
from app.db.repositories.user import user_repository

# Exporte todos os repositórios aqui
__all__ = ["user_repository"]
