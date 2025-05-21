"""
Tarefas assíncronas para processamento de documentos.
"""
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from celery import Task

from app.core.celery import celery_app
from app.db.session import get_db_session
from app.db.repositories.document_repos import (
    document_repository, 
    processing_job_repository,
    extracted_field_repository
)
from app.services.text_extraction import TextExtractionService
from app.services.structured_fields import StructuredFieldsService

logger = logging.getLogger(__name__)

class DocumentProcessingTask(Task):
    """Tarefa base para processamento de documentos."""
    _session = None

    @property
    def db_session(self):
        if self._session is None:
            self._session = next(get_db_session())
        return self._session

    def after_return(self, *args, **kwargs):
        """Fecha a sessão do banco de dados após execução da tarefa."""
        if self._session is not None:
            self._session.close()
            self._session = None


@celery_app.task(bind=True, base=DocumentProcessingTask, name="process_document")
async def process_document(self, document_id: int, use_ocr: bool = True) -> Dict[str, Any]:
    """
    Processa um documento, extraindo texto e campos estruturados.
    
    Args:
        document_id: ID do documento a ser processado
        use_ocr: Se OCR deve ser usado para documentos escaneados
    
    Returns:
        Dicionário com resultados do processamento
    """
    logger.info(f"Iniciando processamento do documento ID: {document_id}")
    
    # Atualiza status de processamento
    processing_job = await processing_job_repository.get_job_by_document_id(
        self.db_session, document_id
    )
    
    if not processing_job:
        logger.error(f"Job de processamento não encontrado para documento {document_id}")
        return {"status": "error", "message": "Job de processamento não encontrado"}
    
    # Atualiza status para "processing"
    await processing_job_repository.update_job_status(
        self.db_session, 
        processing_job.id, 
        "processing", 
        job_id=self.request.id
    )
    
    try:
        # Obtém o documento
        document = await document_repository.get_document_by_id(self.db_session, document_id)
        
        if not document:
            logger.error(f"Documento não encontrado: {document_id}")
            await processing_job_repository.update_job_status(
                self.db_session, processing_job.id, "failed", 
                log_message="Documento não encontrado"
            )
            return {"status": "error", "message": "Documento não encontrado"}
        
        # Atualiza documento com status de processamento
        await document_repository.update_document_status(
            self.db_session,
            document_id,
            processed=False,
            processing_error=False,
            processing_start=datetime.utcnow()
        )
        
        # Extrai texto baseado no tipo de documento
        has_ocr = False
        text_content = ""
        page_count = 0
        
        try:
            extension = document.extension.lower()
            file_path = document.file_path
            
            if extension in (".pdf"):
                text_content, has_ocr, page_count = TextExtractionService.extract_from_pdf(
                    file_path, use_ocr=use_ocr
                )
            elif extension in (".docx", ".doc"):
                text_content, page_count = TextExtractionService.extract_from_docx(file_path)
            elif extension in (".xlsx", ".xls"):
                text_content, sheet_count = TextExtractionService.extract_from_excel(file_path)
                page_count = sheet_count
            elif extension in (".csv"):
                text_content, row_count = TextExtractionService.extract_from_csv(file_path)
                page_count = 1
            elif extension in (".txt"):
                text_content = TextExtractionService.extract_from_text(file_path)
                page_count = 1
            elif extension in (".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"):
                text_content = TextExtractionService.extract_from_image(file_path)
                has_ocr = True
                page_count = 1
            else:
                # Tipo de arquivo não suportado
                raise ValueError(f"Formato de arquivo não suportado: {extension}")
                
            # Atualiza o conteúdo do texto e metadados
            await document_repository.update_document_status(
                self.db_session,
                document_id,
                text_content=text_content,
                page_count=page_count,
                has_ocr=has_ocr
            )
            
            # Extrai campos estruturados
            extracted_fields = StructuredFieldsService.extract_all_fields(text_content)
            
            # Salva os campos extraídos
            for field_name, field_data in extracted_fields.items():
                await extracted_field_repository.create_field(
                    self.db_session,
                    {
                        "document_id": document_id,
                        "field_name": field_name,
                        "field_value": field_data.get("value"),
                        "confidence": field_data.get("confidence", 0.0),
                        "page_number": field_data.get("page_number")
                    }
                )
            
            # Finaliza o processamento com sucesso
            await document_repository.update_document_status(
                self.db_session,
                document_id,
                processed=True,
                processing_error=False,
                processing_end=datetime.utcnow()
            )
            
            await processing_job_repository.update_job_status(
                self.db_session, 
                processing_job.id, 
                "completed"
            )
            
            logger.info(f"Documento {document_id} processado com sucesso")
            return {
                "status": "success", 
                "document_id": document_id,
                "has_ocr": has_ocr,
                "page_count": page_count,
                "extracted_fields_count": len(extracted_fields)
            }
            
        except Exception as e:
            logger.exception(f"Erro ao processar documento {document_id}: {str(e)}")
            
            # Atualiza documento e job com erro
            await document_repository.update_document_status(
                self.db_session,
                document_id,
                processed=False,
                processing_error=True,
                error_message=str(e),
                processing_end=datetime.utcnow()
            )
            
            await processing_job_repository.update_job_status(
                self.db_session, 
                processing_job.id, 
                "failed", 
                log_message=str(e)
            )
            
            return {"status": "error", "message": str(e), "document_id": document_id}
            
    except Exception as e:
        logger.exception(f"Erro geral ao processar documento {document_id}: {str(e)}")
        
        # Atualiza job com erro
        await processing_job_repository.update_job_status(
            self.db_session, 
            processing_job.id, 
            "failed", 
            log_message=f"Erro geral: {str(e)}"
        )
        
        return {"status": "error", "message": str(e), "document_id": document_id}
