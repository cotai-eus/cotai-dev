"""
Inicialização de repositórios.
"""
from app.db.repositories.user import user_repository

# Exporte todos os repositórios aqui
__all__ = ["user_repository"]

# Inicializa os repositórios de documentos
document_repository = DocumentRepository(model=Document)
document_tag_repository = DocumentTagRepository(model=DocumentTag)
extracted_field_repository = ExtractedFieldRepository(model=ExtractedField)
processing_job_repository = ProcessingJobRepository(model=ProcessingJob)

# Exporte todos os repositórios aqui
__all__ = [
    "user_repository",
    "document_repository",
    "document_tag_repository",
    "extracted_field_repository",
    "processing_job_repository"
]
