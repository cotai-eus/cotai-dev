"""
Serviço para gerenciamento de armazenamento de documentos.
"""
import os
import shutil
import hashlib
import aiofiles
from datetime import datetime
from typing import Optional, Tuple
from fastapi import UploadFile
from app.core.config import settings

class DocumentStorageService:
    """
    Serviço para gerenciar o armazenamento seguro de documentos.
    """
    
    @staticmethod
    def get_storage_path() -> str:
        """
        Obtém o caminho base para armazenamento de documentos.
        """
        # Usa o caminho configurado ou cria um padrão
        base_path = settings.DOCUMENT_STORAGE_PATH
        
        # Certifica-se de que o diretório existe
        os.makedirs(base_path, exist_ok=True)
        
        return base_path
    
    @staticmethod
    def get_document_path(user_id: int, document_id: int) -> str:
        """
        Obtém o caminho para o diretório de um documento específico.
        """
        # Organiza os arquivos em uma estrutura de pastas com base no usuário e documento
        document_path = os.path.join(
            DocumentStorageService.get_storage_path(),
            f"user_{user_id}",
            f"doc_{document_id}"
        )
        
        # Certifica-se de que o diretório existe
        os.makedirs(document_path, exist_ok=True)
        
        return document_path
    
    @staticmethod
    async def save_file(file: UploadFile, user_id: int, document_id: int) -> Tuple[str, str, int]:
        """
        Salva um arquivo carregado em armazenamento seguro.
        
        Args:
            file: O arquivo carregado
            user_id: ID do usuário que carregou o arquivo
            document_id: ID do documento no banco de dados
            
        Returns:
            Tuple contendo (caminho_do_arquivo, hash_md5, tamanho_do_arquivo)
        """
        # Gera um nome de arquivo seguro baseado no timestamp e ID do documento
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        file_extension = os.path.splitext(file.filename)[1].lower()
        safe_filename = f"{timestamp}_{document_id}{file_extension}"
        
        # Obtém o diretório de armazenamento
        document_dir = DocumentStorageService.get_document_path(user_id, document_id)
        file_path = os.path.join(document_dir, safe_filename)
        
        # Inicializa o hash MD5
        md5_hash = hashlib.md5()
        file_size = 0
        
        # Salva o arquivo em disco e calcula o hash
        try:
            # Retorna o ponteiro para o início do arquivo
            await file.seek(0)
            
            # Abre um arquivo para escrita
            async with aiofiles.open(file_path, 'wb') as out_file:
                # Lê e escreve o arquivo em blocos para lidar com arquivos grandes
                while content := await file.read(1024 * 1024):  # 1MB por vez
                    await out_file.write(content)
                    md5_hash.update(content)
                    file_size += len(content)
            
            return file_path, md5_hash.hexdigest(), file_size
        except Exception as e:
            # Em caso de erro, tenta limpar qualquer arquivo parcialmente escrito
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e
    
    @staticmethod
    def delete_document(file_path: str) -> bool:
        """
        Exclui um documento do armazenamento.
        
        Args:
            file_path: Caminho para o arquivo a ser excluído
            
        Returns:
            True se o arquivo foi excluído com sucesso, False caso contrário
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                # Tenta remover o diretório se estiver vazio
                document_dir = os.path.dirname(file_path)
                if not os.listdir(document_dir):
                    os.rmdir(document_dir)
                return True
            return False
        except Exception:
            return False
    
    @staticmethod
    def delete_user_documents(user_id: int) -> bool:
        """
        Exclui todos os documentos de um usuário.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            True se os documentos foram excluídos com sucesso, False caso contrário
        """
        try:
            user_dir = os.path.join(
                DocumentStorageService.get_storage_path(),
                f"user_{user_id}"
            )
            
            if os.path.exists(user_dir):
                shutil.rmtree(user_dir)
                return True
            return False
        except Exception:
            return False
    
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """
        Obtém a extensão de um arquivo, garantindo que esteja em minúsculas.
        
        Args:
            filename: Nome do arquivo
            
        Returns:
            Extensão do arquivo (incluindo o ponto)
        """
        return os.path.splitext(filename)[1].lower()
    
    @staticmethod
    def get_mime_type(file_extension: str) -> str:
        """
        Obtém o tipo MIME com base na extensão do arquivo.
        
        Args:
            file_extension: Extensão do arquivo (incluindo o ponto)
            
        Returns:
            Tipo MIME correspondente
        """
        mime_types = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.csv': 'text/csv',
            '.txt': 'text/plain',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.bmp': 'image/bmp',
        }
        
        return mime_types.get(file_extension.lower(), 'application/octet-stream')
