"""
Inicialização de repositórios para documentos.
"""
from app.models.document import Document, DocumentTag, ExtractedField, ProcessingJob
from app.db.repositories.document import (
    DocumentRepository, 
    DocumentTagRepository, 
    ExtractedFieldRepository,
    ProcessingJobRepository
)

# Inicializa os repositórios de documentos
document_repository = DocumentRepository(model=Document)
document_tag_repository = DocumentTagRepository(model=DocumentTag)
extracted_field_repository = ExtractedFieldRepository(model=ExtractedField)
processing_job_repository = ProcessingJobRepository(model=ProcessingJob)

__all__ = [
    "document_repository",
    "document_tag_repository",
    "extracted_field_repository",
    "processing_job_repository"
]
