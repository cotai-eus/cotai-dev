import os
import uuid
import shutil
from typing import BinaryIO, Optional
from fastapi import UploadFile

from app.core.config import settings


class MessageAttachmentService:
    def __init__(self):
        # Ensure upload directory exists
        self.base_dir = settings.UPLOAD_DIRECTORY
        self.message_attachments_dir = os.path.join(self.base_dir, "message_attachments")
        os.makedirs(self.message_attachments_dir, exist_ok=True)

    def save_attachment(self, file: UploadFile, conversation_id: int, message_id: int) -> dict:
        """
        Save a message attachment to disk
        
        Args:
            file: The uploaded file object
            conversation_id: The ID of the conversation
            message_id: The ID of the message
            
        Returns:
            dict: Metadata about the saved file
        """
        # Create directory structure: message_attachments/conversation_id/message_id/
        conversation_dir = os.path.join(self.message_attachments_dir, str(conversation_id))
        os.makedirs(conversation_dir, exist_ok=True)
        
        message_dir = os.path.join(conversation_dir, str(message_id))
        os.makedirs(message_dir, exist_ok=True)
        
        # Generate unique filename to avoid collisions
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
        safe_filename = f"{uuid.uuid4()}{file_ext}"
        
        # Complete path where the file will be saved
        file_path = os.path.join(message_dir, safe_filename)
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return metadata
        return {
            "file_name": file.filename,
            "file_type": file.content_type,
            "file_size": os.path.getsize(file_path),
            "file_path": os.path.relpath(file_path, self.base_dir)  # Store relative path
        }

    def get_attachment_path(self, file_path: str) -> str:
        """
        Get the full path to an attachment
        
        Args:
            file_path: The relative path stored in the database
            
        Returns:
            str: The full path to the attachment
        """
        return os.path.join(self.base_dir, file_path)

    def delete_attachment(self, file_path: str) -> bool:
        """
        Delete an attachment file
        
        Args:
            file_path: The relative path stored in the database
            
        Returns:
            bool: True if deletion was successful, False otherwise
        """
        full_path = self.get_attachment_path(file_path)
        
        try:
            if os.path.exists(full_path):
                os.remove(full_path)
                return True
        except Exception as e:
            print(f"Error deleting attachment {file_path}: {str(e)}")
            return False
            
        return False
