from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Boolean, Float, Table
from sqlalchemy.orm import relationship
from app.models.base import Base

# Tabela de associação para tags de documentos
document_tag = Table(
    "document_tag",
    Base.metadata,
    Column("document_id", Integer, ForeignKey("documents.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("document_tags.id"), primary_key=True),
)

class Document(Base):
    """Modelo para armazenar documentos e seus metadados básicos"""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False, unique=True)
    file_size = Column(Integer, nullable=False)  # tamanho em bytes
    mime_type = Column(String(100), nullable=False)
    extension = Column(String(10), nullable=False)
    md5_hash = Column(String(32), nullable=False)  # hash para verificar integridade
    
    # Metadados do processo
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    processing_error = Column(Boolean, default=False, nullable=False)
    error_message = Column(Text, nullable=True)
    processing_start = Column(DateTime, nullable=True)
    processing_end = Column(DateTime, nullable=True)
    has_ocr = Column(Boolean, default=False, nullable=False)
    
    # Metadados do conteúdo
    page_count = Column(Integer, nullable=True)
    text_content = Column(Text, nullable=True)
    created_date = Column(DateTime, nullable=True)  # data de criação do documento original
    modified_date = Column(DateTime, nullable=True)  # data de modificação do documento original
    
    # Relacionamentos
    extracted_fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")
    tags = relationship("DocumentTag", secondary=document_tag, back_populates="documents")
    uploaded_by = relationship("User", back_populates="documents")
    
    def __repr__(self):
        return f"<Document(id={self.id}, filename='{self.filename}', processed={self.processed})>"


class DocumentTag(Base):
    """Modelo para tags/categorias de documentos"""
    __tablename__ = "document_tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(255), nullable=True)
    
    # Relacionamentos
    documents = relationship("Document", secondary=document_tag, back_populates="tags")
    
    def __repr__(self):
        return f"<DocumentTag(id={self.id}, name='{self.name}')>"


class ExtractedField(Base):
    """Modelo para armazenar campos estruturados extraídos dos documentos"""
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    field_value = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=True)  # confiança da extração (0-1)
    manually_verified = Column(Boolean, default=False, nullable=False)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Relacionamentos
    document = relationship("Document", back_populates="extracted_fields")
    verified_by = relationship("User")
    
    def __repr__(self):
        return f"<ExtractedField(id={self.id}, field_name='{self.field_name}', document_id={self.document_id})>"


class ProcessingJob(Base):
    """Modelo para rastrear trabalhos de processamento de documentos"""
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending, processing, completed, failed
    job_id = Column(String(100), nullable=True)  # ID do trabalho na fila
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    log_message = Column(Text, nullable=True)
    
    # Relacionamentos
    document = relationship("Document")
    
    def __repr__(self):
        return f"<ProcessingJob(id={self.id}, document_id={self.document_id}, status='{self.status}')>"
