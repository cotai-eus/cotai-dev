"""
Testes para os endpoints de processamento de documentos.
"""
import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, ProcessingJob
from app.db.repositories.document_repos import document_repository, processing_job_repository
from app.services.document_storage import DocumentStorageService

pytestmark = pytest.mark.asyncio

class TestDocumentEndpoints:
    """Testes para endpoints de documentos."""
    
    @patch("app.api.routers.document.process_document")
    @patch("app.services.document_storage.DocumentStorageService.save_file")
    async def test_upload_document(
        self, 
        mock_save_file, 
        mock_process_document,
        client, 
        db_session: AsyncSession, 
        test_user_token
    ):
        """Testa o upload de um documento."""
        # Configura os mocks
        mock_save_file.return_value = ("/tmp/doc_1.pdf", "abcdef123456", 1024)
        mock_process_document.delay.return_value = MagicMock(id="task123")
        
        # Prepara o arquivo para upload
        import io
        file_content = io.BytesIO(b"test file content")
        file_content.name = "test_document.pdf"
        
        # Dados da requisição
        upload_options = {
            "use_ocr": True,
            "process_now": True,
            "tags": ["teste", "documento"]
        }
        
        # Realiza o upload
        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": (file_content.name, file_content, "application/pdf")},
            data={"options": upload_options},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        # Verifica o resultado
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["original_filename"] == "test_document.pdf"
        assert data["extension"] == ".pdf"
        assert not data["processed"]
        assert not data["processing_error"]
        
        # Verifica se o documento foi criado no banco
        document = await document_repository.get_document_by_id(db_session, data["id"])
        assert document is not None
        
        # Verifica se o job de processamento foi criado
        job = await processing_job_repository.get_job_by_document_id(db_session, data["id"])
        assert job is not None
        assert job.status == "pending"
        
        # Verifica se o processamento assíncrono foi chamado
        mock_process_document.delay.assert_called_once_with(data["id"], use_ocr=True)
    
    async def test_get_document(self, client, db_session: AsyncSession, test_user, test_user_token):
        """Testa a obtenção de detalhes de um documento."""
        # Cria um documento de teste
        document_data = {
            "filename": "test.pdf",
            "original_filename": "original_test.pdf",
            "file_path": "/tmp/test.pdf",
            "file_size": 1024,
            "mime_type": "application/pdf",
            "extension": ".pdf",
            "md5_hash": "abcd1234",
            "uploaded_by_id": test_user.id,
            "processed": True,
            "processing_error": False,
        }
        
        document = await document_repository.create_document(db_session, document_data)
        
        # Faz a requisição para obter o documento
        response = await client.get(
            f"/api/v1/documents/{document.id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        # Verifica o resultado
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == document.id
        assert data["original_filename"] == "original_test.pdf"
        assert data["processed"] is True
    
    async def test_list_documents(
        self, 
        client, 
        db_session: AsyncSession, 
        test_user, 
        test_user_token
    ):
        """Testa a listagem de documentos do usuário."""
        # Cria alguns documentos de teste
        for i in range(3):
            document_data = {
                "filename": f"test{i}.pdf",
                "original_filename": f"original_test{i}.pdf",
                "file_path": f"/tmp/test{i}.pdf",
                "file_size": 1024,
                "mime_type": "application/pdf",
                "extension": ".pdf",
                "md5_hash": f"abcd{i}",
                "uploaded_by_id": test_user.id,
                "processed": i % 2 == 0,  # Alternando entre processado e não
                "processing_error": False,
            }
            await document_repository.create_document(db_session, document_data)
        
        # Faz a requisição para listar documentos
        response = await client.get(
            "/api/v1/documents",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        # Verifica o resultado
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert data["total"] == 3
        assert len(data["items"]) == 3
        
        # Testa filtro por status de processamento
        response = await client.get(
            "/api/v1/documents?processed=true",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        data = response.json()
        assert data["total"] == 2
        assert all(item["processed"] for item in data["items"])
    
    @patch("app.api.routers.document.process_document")
    async def test_process_document(
        self, 
        mock_process_document,
        client, 
        db_session: AsyncSession, 
        test_user, 
        test_user_token
    ):
        """Testa o reprocessamento de um documento."""
        # Cria um documento de teste
        document_data = {
            "filename": "test.pdf",
            "original_filename": "original_test.pdf",
            "file_path": "/tmp/test.pdf",
            "file_size": 1024,
            "mime_type": "application/pdf",
            "extension": ".pdf",
            "md5_hash": "abcd1234",
            "uploaded_by_id": test_user.id,
            "processed": False,
            "processing_error": True,
            "error_message": "Erro de processamento anterior"
        }
        
        document = await document_repository.create_document(db_session, document_data)
        mock_process_document.delay.return_value = MagicMock(id="task123")
        
        # Faz a requisição para processar o documento
        options = {
            "use_ocr": True,
            "extract_fields": True
        }
        
        response = await client.post(
            f"/api/v1/documents/{document.id}/process",
            json=options,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        # Verifica o resultado
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["document_id"] == document.id
        assert data["status"] == "pending"
        
        # Verifica se o job foi criado no banco
        job = await processing_job_repository.get_job_by_document_id(db_session, document.id)
        assert job is not None
        
        # Verifica se o processamento assíncrono foi chamado
        mock_process_document.delay.assert_called_once_with(document.id, use_ocr=True)
    
    async def test_delete_document(
        self, 
        client, 
        db_session: AsyncSession, 
        test_user, 
        test_user_token
    ):
        """Testa a remoção de um documento."""
        # Cria um documento de teste
        document_data = {
            "filename": "test.pdf",
            "original_filename": "original_test.pdf",
            "file_path": "/tmp/test.pdf",
            "file_size": 1024,
            "mime_type": "application/pdf",
            "extension": ".pdf",
            "md5_hash": "abcd1234",
            "uploaded_by_id": test_user.id,
            "processed": True,
            "processing_error": False,
        }
        
        document = await document_repository.create_document(db_session, document_data)
        
        # Cria um patch para o método de remoção do arquivo
        with patch.object(DocumentStorageService, 'delete_document', return_value=True):
            # Faz a requisição para deletar o documento
            response = await client.delete(
                f"/api/v1/documents/{document.id}",
                headers={"Authorization": f"Bearer {test_user_token}"}
            )
            
            # Verifica o resultado
            assert response.status_code == status.HTTP_200_OK
            
            # Verifica se o documento foi removido do banco
            document = await document_repository.get_document_by_id(db_session, document.id)
            assert document is None
