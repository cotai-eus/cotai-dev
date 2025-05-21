"""
Dependências para endpoints de documentos.
"""
from fastapi import Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.api.deps import get_current_user
from app.models.user import User
from app.db.repositories.document_repos import document_repository
from app.core.config import settings


async def validate_file_upload(
    file: UploadFile,
) -> UploadFile:
    """
    Valida se o arquivo de upload é válido (tipo e tamanho).
    """
    # Valida extensão
    import os
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in settings.ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de arquivo não suportado. Tipos permitidos: {', '.join(settings.ALLOWED_DOCUMENT_TYPES)}"
        )
    
    # Verifica tamanho sem ler o arquivo todo na memória
    file_size = 0
    chunk_size = 1024 * 1024  # 1MB
    
    # Volta para o início do arquivo
    await file.seek(0)
    
    while chunk := await file.read(chunk_size):
        file_size += len(chunk)
        
        if file_size > settings.DOCUMENT_MAX_SIZE:
            await file.seek(0)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Arquivo muito grande. Tamanho máximo: {settings.DOCUMENT_MAX_SIZE/1024/1024:.1f}MB"
            )
    
    # Volta para o início do arquivo
    await file.seek(0)
    
    return file


async def get_user_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> dict:
    """
    Obtém um documento verificando se pertence ao usuário atual.
    """
    document = await document_repository.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
    
    if document.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para acessar este documento"
        )
    
    return document
