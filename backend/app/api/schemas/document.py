"""
Schemas para operações de documentos na API.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator, AnyHttpUrl


class DocumentTagBase(BaseModel):
    """Schema base para tags de documentos."""
    name: str
    description: Optional[str] = None


class DocumentTagCreate(DocumentTagBase):
    """Schema para criação de tags de documentos."""
    pass


class DocumentTagResponse(DocumentTagBase):
    """Schema para resposta de tags de documentos."""
    id: int
    
    class Config:
        orm_mode = True


class ExtractedFieldBase(BaseModel):
    """Schema base para campos extraídos."""
    field_name: str
    field_value: Optional[str] = None
    page_number: Optional[int] = None
    confidence: Optional[float] = None


class ExtractedFieldCreate(ExtractedFieldBase):
    """Schema para criação de campos extraídos."""
    document_id: int


class ExtractedFieldResponse(ExtractedFieldBase):
    """Schema para resposta de campos extraídos."""
    id: int
    document_id: int
    manually_verified: bool = False
    verified_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class DocumentBase(BaseModel):
    """Schema base para documentos."""
    filename: Optional[str] = None
    original_filename: Optional[str] = None


class DocumentCreate(DocumentBase):
    """Schema para criação de documento (usado internamente)."""
    file_path: str
    file_size: int
    mime_type: str
    extension: str
    md5_hash: str
    uploaded_by_id: int


class DocumentUpload(BaseModel):
    """Schema para solicitação de upload de documento."""
    use_ocr: bool = True
    process_now: bool = True
    tags: Optional[List[str]] = None


class DocumentProcessingOptions(BaseModel):
    """Opções para processamento de documentos."""
    use_ocr: bool = True
    extract_fields: bool = True
    field_types: Optional[List[str]] = None


class DocumentResponse(DocumentBase):
    """Schema para resposta de documento."""
    id: int
    file_size: int
    mime_type: str
    extension: str
    processed: bool
    processing_error: bool
    error_message: Optional[str] = None
    processing_start: Optional[datetime] = None
    processing_end: Optional[datetime] = None
    has_ocr: bool = False
    page_count: Optional[int] = None
    created_at: datetime
    tags: Optional[List[DocumentTagResponse]] = None
    extracted_fields: Optional[List[ExtractedFieldResponse]] = None
    
    class Config:
        orm_mode = True


class DocumentListResponse(BaseModel):
    """Schema para resposta de lista de documentos."""
    total: int
    items: List[DocumentResponse]


class ProcessingJobBase(BaseModel):
    """Schema base para jobs de processamento."""
    document_id: int
    status: str = "pending"


class ProcessingJobCreate(ProcessingJobBase):
    """Schema para criação de job de processamento."""
    pass


class ProcessingJobResponse(ProcessingJobBase):
    """Schema para resposta de job de processamento."""
    id: int
    job_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    log_message: Optional[str] = None
    
    class Config:
        orm_mode = True
