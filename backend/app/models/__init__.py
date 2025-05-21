"""
Inicializa os modelos do SQLAlchemy.
"""
# Importa todos os modelos aqui
from app.models.user import User, Item
from app.models.document import Document, DocumentTag, ExtractedField, ProcessingJob

# Adicione mais importações conforme necessário

__all__ = ["User", "Item", "Document", "DocumentTag", "ExtractedField", "ProcessingJob"]
