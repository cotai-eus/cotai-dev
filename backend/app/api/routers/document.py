"""
Rotas da API para gerenciamento de documentos.
"""
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi import Query, Path, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.core.config import settings
from app.db.session import get_async_session
from app.db.redis import get_redis_client
from app.api.deps import get_current_user
from app.models.user import User
from app.db.repositories.document_repos import (
    document_repository, 
    document_tag_repository, 
    extracted_field_repository,
    processing_job_repository
)
from app.api.schemas.document import (
    DocumentUpload, 
    DocumentResponse, 
    DocumentListResponse,
    ProcessingJobResponse,
    DocumentTagCreate,
    DocumentTagResponse,
    DocumentProcessingOptions
)
from app.services.document_storage import DocumentStorageService
from app.tasks.document_processing import process_document

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    options: str = Form(...),  # JSON serializado das opções (DocumentUpload)
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
    redis: Redis = Depends(get_redis_client)
):
    """
    Faz upload de um documento e inicia seu processamento.
    
    O processamento pode ser síncrono ou assíncrono, com extração
    de texto e campos estruturados opcionais.
    """
    # Converte opções de string JSON para objeto Pydantic
    import json
    from pydantic import ValidationError
    
    try:
        upload_options = DocumentUpload.parse_raw(options)
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Opções de upload inválidas"
        )
    
    # Validação do tipo de arquivo
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in settings.ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de arquivo não suportado. Tipos permitidos: {', '.join(settings.ALLOWED_DOCUMENT_TYPES)}"
        )
    
    # Validação do tamanho do arquivo
    try:
        content = await file.read()
        file_size = len(content)
        await file.seek(0)  # Retorna o ponteiro para o início do arquivo
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao ler o arquivo: {str(e)}"
        )
    
    if file_size > settings.DOCUMENT_MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo muito grande. Tamanho máximo: {settings.DOCUMENT_MAX_SIZE/1024/1024:.1f}MB"
        )
    
    # Cria o registro do documento no banco
    try:
        # Cria documento inicialmente sem o path real
        document_data = {
            "filename": "temp",
            "original_filename": file.filename,
            "file_path": "temp",
            "file_size": file_size,
            "mime_type": file.content_type or "application/octet-stream",
            "extension": file_extension,
            "md5_hash": "temp",  # Será atualizado após o upload
            "uploaded_by_id": current_user.id,
            "processed": False,
            "processing_error": False,
        }
        
        # Cria o documento no banco
        document = await document_repository.create_document(db, document_data)
        
        # Salva o arquivo e obtém o hash MD5 e caminho
        file_path, md5_hash, file_size = await DocumentStorageService.save_file(
            file, current_user.id, document.id
        )
        
        # Verifica se já existe um documento com esse hash
        existing_document = await document_repository.get_document_by_hash(db, md5_hash)
        
        if existing_document and existing_document.id != document.id:
            # Remove o arquivo que foi salvo
            DocumentStorageService.delete_document(file_path)
            
            # Remove o registro incompleto do banco
            await document_repository.delete_document(db, document.id)
            
            # Retorna referência ao documento existente
            return await document_repository.get_document_by_id(
                db, existing_document.id, include_tags=True
            )
        
        # Atualiza o documento com o caminho real e hash
        document = await document_repository.update_document(
            db, 
            document.id,
            {
                "file_path": file_path,
                "md5_hash": md5_hash,
                "filename": os.path.basename(file_path)
            }
        )
        
        # Adiciona as tags, se fornecidas
        if upload_options.tags:
            for tag_name in upload_options.tags:
                # Busca ou cria a tag
                tag = await document_tag_repository.get_tag_by_name(db, tag_name)
                
                if not tag:
                    tag = await document_tag_repository.create_tag(
                        db, {"name": tag_name}
                    )
                
                # Adiciona a tag ao documento
                await document_tag_repository.add_tag_to_document(
                    db, document.id, tag.id
                )
        
        # Cria o job de processamento
        processing_job = await processing_job_repository.create_job(
            db, {"document_id": document.id, "status": "pending"}
        )
        
        # Inicia o processamento do documento (síncrono ou assíncrono)
        if upload_options.process_now:
            # Processamento assíncrono com Celery
            task = process_document.delay(document.id, use_ocr=upload_options.use_ocr)
            
            # Atualiza o job com o ID da tarefa Celery
            await processing_job_repository.update_job(
                db, processing_job.id, {"job_id": str(task.id)}
            )
        
        # Retorna o documento com todas as informações
        return await document_repository.get_document_by_id(
            db, document.id, include_tags=True
        )
    
    except Exception as e:
        # Em caso de erro, limpa qualquer arquivo parcialmente salvo
        if 'file_path' in locals() and os.path.exists(file_path):
            DocumentStorageService.delete_document(file_path)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar documento: {str(e)}"
        )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    processed: Optional[bool] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Lista documentos do usuário com opção de filtros por status e tags.
    """
    filters = {}
    
    if processed is not None:
        filters["processed"] = processed
    
    if tag:
        filters["tag"] = tag
    
    if search:
        filters["search"] = search
    
    # Busca documentos com filtros aplicados
    documents = await document_repository.get_user_documents_with_filters(
        db, current_user.id, skip=skip, limit=limit, filters=filters, include_tags=True
    )
    
    # Obtém contagem total 
    total = await document_repository.count_user_documents_with_filters(
        db, current_user.id, filters=filters
    )
    
    return DocumentListResponse(total=total, items=documents)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int = Path(..., gt=0),
    include_fields: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Obtém detalhes de um documento específico.
    """
    document = await document_repository.get_document_by_id(
        db, document_id, include_fields=include_fields, include_tags=True
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
    
    # Verifica se o usuário tem acesso ao documento
    if document.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para acessar este documento"
        )
    
    return document


@router.post("/{document_id}/process", response_model=ProcessingJobResponse)
async def process_document_endpoint(
    document_id: int = Path(..., gt=0),
    options: DocumentProcessingOptions = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Inicia ou reinicia o processamento de um documento.
    """
    document = await document_repository.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
    
    # Verifica se o usuário tem acesso ao documento
    if document.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para acessar este documento"
        )
    
    # Reseta o status de processamento do documento
    await document_repository.update_document_status(
        db,
        document_id,
        processed=False,
        processing_error=False,
        error_message=None,
        processing_start=None,
        processing_end=None
    )
    
    # Cria novo job de processamento
    processing_job = await processing_job_repository.create_job(
        db, {"document_id": document_id, "status": "pending"}
    )
    
    # Inicia processamento assíncrono
    task = process_document.delay(document_id, use_ocr=options.use_ocr)
    
    # Atualiza o job com o ID da tarefa Celery
    await processing_job_repository.update_job(
        db, processing_job.id, {"job_id": str(task.id)}
    )
    
    return processing_job


@router.get("/{document_id}/jobs", response_model=List[ProcessingJobResponse])
async def get_document_jobs(
    document_id: int = Path(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Obtém o histórico de processamento de um documento.
    """
    document = await document_repository.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
    
    # Verifica se o usuário tem acesso ao documento
    if document.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para acessar este documento"
        )
    
    # Obtém jobs de processamento
    jobs = await processing_job_repository.get_jobs_by_document_id(db, document_id)
    return jobs


@router.delete("/{document_id}")
async def delete_document(
    document_id: int = Path(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Remove um documento e todos os seus dados associados.
    """
    document = await document_repository.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
    
    # Verifica se o usuário tem acesso ao documento
    if document.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para acessar este documento"
        )
    
    # Remove o arquivo do storage
    if document.file_path and os.path.exists(document.file_path):
        DocumentStorageService.delete_document(document.file_path)
    
    # Remove o documento do banco (em cascata remove campos e jobs)
    await document_repository.delete_document(db, document_id)
    
    return {"message": "Documento removido com sucesso"}
