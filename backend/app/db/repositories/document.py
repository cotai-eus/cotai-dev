"""
Repositório para operações com documentos no banco de dados.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.repositories import BaseRepository
from app.models.document import Document, DocumentTag, ExtractedField, ProcessingJob


class DocumentRepository(BaseRepository[Document]):
    """
    Repositório para operações com documentos.
    """
    
    async def create_document(
        self, 
        db_session: AsyncSession, 
        document_data: Dict[str, Any]
    ) -> Document:
        """
        Cria um novo documento no banco de dados.
        """
        document = Document(**document_data)
        db_session.add(document)
        await db_session.commit()
        await db_session.refresh(document)
        return document
    
    async def get_document_by_id(
        self, 
        db_session: AsyncSession, 
        document_id: int, 
        include_fields: bool = False,
        include_tags: bool = False
    ) -> Optional[Document]:
        """
        Busca um documento pelo ID, opcionalmente incluindo campos extraídos e tags.
        """
        query = select(Document).where(Document.id == document_id)
        
        if include_fields:
            query = query.options(selectinload(Document.extracted_fields))
        
        if include_tags:
            query = query.options(selectinload(Document.tags))
        
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_document_by_hash(
        self, 
        db_session: AsyncSession, 
        md5_hash: str
    ) -> Optional[Document]:
        """
        Busca um documento pelo hash MD5, útil para evitar duplicatas.
        """
        query = select(Document).where(Document.md5_hash == md5_hash)
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_user_documents(
        self, 
        db_session: AsyncSession, 
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        include_tags: bool = False
    ) -> List[Document]:
        """
        Busca documentos de um usuário específico.
        """
        query = select(Document).where(Document.uploaded_by_id == user_id)
        
        if include_tags:
            query = query.options(selectinload(Document.tags))
        
        query = query.offset(skip).limit(limit).order_by(Document.created_at.desc())
        result = await db_session.execute(query)
        return list(result.scalars().all())
    
    async def update_document_status(
        self,
        db_session: AsyncSession,
        document_id: int,
        processed: bool = True,
        processing_error: bool = False,
        error_message: Optional[str] = None,
        text_content: Optional[str] = None,
        page_count: Optional[int] = None,
        has_ocr: Optional[bool] = None
    ) -> Optional[Document]:
        """
        Atualiza o status de processamento de um documento.
        """
        # Cria um dicionário com valores a serem atualizados
        values = {"processed": processed, "processing_error": processing_error}
        
        if processed and not processing_error:
            values["processing_end"] = datetime.utcnow()
        
        if error_message is not None:
            values["error_message"] = error_message
            
        if text_content is not None:
            values["text_content"] = text_content
            
        if page_count is not None:
            values["page_count"] = page_count
            
        if has_ocr is not None:
            values["has_ocr"] = has_ocr
        
        # Executa a atualização
        stmt = update(Document).where(Document.id == document_id).values(**values)
        await db_session.execute(stmt)
        await db_session.commit()
        
        # Retorna o documento atualizado
        return await self.get_document_by_id(db_session, document_id)
    
    async def delete_document(
        self,
        db_session: AsyncSession,
        document_id: int
    ) -> bool:
        """
        Exclui um documento do banco de dados.
        """
        stmt = delete(Document).where(Document.id == document_id)
        result = await db_session.execute(stmt)
        await db_session.commit()
        return result.rowcount > 0
    
    async def search_documents(
        self,
        db_session: AsyncSession,
        query: str,
        user_id: Optional[int] = None,
        tag_ids: Optional[List[int]] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Document]:
        """
        Pesquisa documentos por conteúdo ou metadados.
        """
        stmt = select(Document)
        
        # Filtra por texto no nome do arquivo ou conteúdo
        if query:
            search_query = f"%{query}%"
            stmt = stmt.where(
                (Document.filename.ilike(search_query)) | 
                (Document.text_content.ilike(search_query))
            )
            
        # Filtra por usuário
        if user_id is not None:
            stmt = stmt.where(Document.uploaded_by_id == user_id)
            
        # Filtra por tags
        if tag_ids and len(tag_ids) > 0:
            stmt = stmt.join(Document.tags).where(DocumentTag.id.in_(tag_ids))
            
        # Aplica paginação e ordem
        stmt = stmt.offset(skip).limit(limit).order_by(Document.created_at.desc())
        
        result = await db_session.execute(stmt)
        return list(result.scalars().all())


class DocumentTagRepository(BaseRepository[DocumentTag]):
    """
    Repositório para operações com tags de documentos.
    """
    
    async def create_tag(
        self,
        db_session: AsyncSession,
        name: str,
        description: Optional[str] = None
    ) -> DocumentTag:
        """
        Cria uma nova tag de documento.
        """
        tag = DocumentTag(name=name, description=description)
        db_session.add(tag)
        await db_session.commit()
        await db_session.refresh(tag)
        return tag
    
    async def get_tag_by_id(
        self,
        db_session: AsyncSession,
        tag_id: int
    ) -> Optional[DocumentTag]:
        """
        Busca uma tag pelo ID.
        """
        query = select(DocumentTag).where(DocumentTag.id == tag_id)
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_tag_by_name(
        self,
        db_session: AsyncSession,
        name: str
    ) -> Optional[DocumentTag]:
        """
        Busca uma tag pelo nome.
        """
        query = select(DocumentTag).where(DocumentTag.name == name)
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_all_tags(
        self,
        db_session: AsyncSession
    ) -> List[DocumentTag]:
        """
        Busca todas as tags disponíveis.
        """
        query = select(DocumentTag).order_by(DocumentTag.name)
        result = await db_session.execute(query)
        return list(result.scalars().all())
    
    async def add_tag_to_document(
        self,
        db_session: AsyncSession,
        document_id: int,
        tag_id: int
    ) -> bool:
        """
        Adiciona uma tag a um documento.
        """
        document = await db_session.get(Document, document_id)
        tag = await db_session.get(DocumentTag, tag_id)
        
        if not document or not tag:
            return False
        
        document.tags.append(tag)
        await db_session.commit()
        return True
    
    async def remove_tag_from_document(
        self,
        db_session: AsyncSession,
        document_id: int,
        tag_id: int
    ) -> bool:
        """
        Remove uma tag de um documento.
        """
        document = await db_session.get(Document, document_id)
        tag = await db_session.get(DocumentTag, tag_id)
        
        if not document or not tag:
            return False
        
        document.tags.remove(tag)
        await db_session.commit()
        return True


class ExtractedFieldRepository(BaseRepository[ExtractedField]):
    """
    Repositório para operações com campos extraídos de documentos.
    """
    
    async def create_field(
        self,
        db_session: AsyncSession,
        document_id: int,
        field_name: str,
        field_value: str,
        page_number: Optional[int] = None,
        confidence: Optional[float] = None
    ) -> ExtractedField:
        """
        Cria um novo campo extraído para um documento.
        """
        field = ExtractedField(
            document_id=document_id,
            field_name=field_name,
            field_value=field_value,
            page_number=page_number,
            confidence=confidence
        )
        db_session.add(field)
        await db_session.commit()
        await db_session.refresh(field)
        return field
    
    async def get_document_fields(
        self,
        db_session: AsyncSession,
        document_id: int
    ) -> List[ExtractedField]:
        """
        Busca todos os campos extraídos de um documento.
        """
        query = select(ExtractedField).where(ExtractedField.document_id == document_id)
        result = await db_session.execute(query)
        return list(result.scalars().all())
    
    async def update_field(
        self,
        db_session: AsyncSession,
        field_id: int,
        field_value: Optional[str] = None,
        manually_verified: bool = True,
        verified_by_id: Optional[int] = None
    ) -> Optional[ExtractedField]:
        """
        Atualiza um campo extraído, útil para correção manual.
        """
        values = {"manually_verified": manually_verified}
        
        if field_value is not None:
            values["field_value"] = field_value
            
        if verified_by_id is not None:
            values["verified_by_id"] = verified_by_id
            values["verified_at"] = datetime.utcnow()
            
        stmt = update(ExtractedField).where(ExtractedField.id == field_id).values(**values)
        await db_session.execute(stmt)
        await db_session.commit()
        
        # Retorna o campo atualizado
        query = select(ExtractedField).where(ExtractedField.id == field_id)
        result = await db_session.execute(query)
        return result.scalar_one_or_none()


class ProcessingJobRepository(BaseRepository[ProcessingJob]):
    """
    Repositório para operações com trabalhos de processamento de documentos.
    """
    
    async def create_job(
        self,
        db_session: AsyncSession,
        document_id: int,
        job_id: Optional[str] = None
    ) -> ProcessingJob:
        """
        Cria um novo trabalho de processamento.
        """
        job = ProcessingJob(
            document_id=document_id,
            status="pending",
            job_id=job_id
        )
        db_session.add(job)
        await db_session.commit()
        await db_session.refresh(job)
        return job
    
    async def update_job_status(
        self,
        db_session: AsyncSession,
        job_id: Union[int, str],
        status: str,
        log_message: Optional[str] = None
    ) -> Optional[ProcessingJob]:
        """
        Atualiza o status de um trabalho de processamento.
        """
        values = {"status": status}
        
        if status == "processing" and not values.get("start_time"):
            values["start_time"] = datetime.utcnow()
            
        if status in ["completed", "failed"]:
            values["end_time"] = datetime.utcnow()
            
        if log_message is not None:
            values["log_message"] = log_message
        
        # Verifica se o job_id é um ID interno ou um ID de trabalho da fila
        if isinstance(job_id, int):
            stmt = update(ProcessingJob).where(ProcessingJob.id == job_id).values(**values)
        else:  # Se for uma string, é um ID de trabalho da fila
            stmt = update(ProcessingJob).where(ProcessingJob.job_id == job_id).values(**values)
            
        await db_session.execute(stmt)
        await db_session.commit()
        
        # Retorna o trabalho atualizado
        if isinstance(job_id, int):
            query = select(ProcessingJob).where(ProcessingJob.id == job_id)
        else:
            query = select(ProcessingJob).where(ProcessingJob.job_id == job_id)
            
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_document_jobs(
        self,
        db_session: AsyncSession,
        document_id: int
    ) -> List[ProcessingJob]:
        """
        Busca todos os trabalhos de processamento de um documento.
        """
        query = select(ProcessingJob).where(ProcessingJob.document_id == document_id).order_by(ProcessingJob.id.desc())
        result = await db_session.execute(query)
        return list(result.scalars().all())
    
    async def get_pending_jobs(
        self,
        db_session: AsyncSession,
        limit: int = 100
    ) -> List[ProcessingJob]:
        """
        Busca trabalhos pendentes para processamento.
        """
        query = select(ProcessingJob).where(ProcessingJob.status == "pending").limit(limit)
        result = await db_session.execute(query)
        return list(result.scalars().all())
