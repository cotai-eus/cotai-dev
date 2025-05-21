from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, status, File, UploadFile, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import json
import os

from app.api.deps.auth import get_current_active_user, get_current_user_ws
from app.api.deps.db import get_db
from app.api.schemas.message import (
    Conversation, ConversationCreate, ConversationUpdate, ConversationWithMessages,
    Message, MessageCreate, MessageResponse
)
from app.db.repositories.message_repository import MessageRepository
from app.models.user import User
from app.services.messages import MessageService, connection_manager
from app.services.message_attachments import MessageAttachmentService


router = APIRouter()
attachment_service = MessageAttachmentService()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user: User = Depends(get_current_user_ws),
    db: Session = Depends(get_db)
):
    message_service = MessageService(db)
    await message_service.handle_websocket_connection(websocket, user)


# Conversation endpoints
@router.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED)
def create_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    conversation = repository.create_conversation(
        created_by_id=current_user.id,
        is_group=conversation_data.is_group,
        name=conversation_data.name,
        member_ids=conversation_data.member_ids
    )
    return conversation


@router.get("/conversations", response_model=List[Conversation])
def get_conversations(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    return repository.get_conversations_for_user(current_user.id, skip, limit)


@router.get("/conversations/{conversation_id}", response_model=ConversationWithMessages)
def get_conversation(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    conversation = repository.get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
        
    # Check if user is member of the conversation
    if current_user.id not in [member.id for member in conversation.members]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this conversation"
        )
        
    # Get messages for the conversation
    messages = repository.get_messages(conversation_id, 0, limit)
    
    # Create the response with the conversation and messages
    result = ConversationWithMessages.from_orm(conversation)
    result.messages = messages
    
    return result


@router.put("/conversations/{conversation_id}", response_model=Conversation)
def update_conversation(
    conversation_id: int,
    update_data: ConversationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    conversation = repository.get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
        
    # Check if user is member of the conversation
    if current_user.id not in [member.id for member in conversation.members]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this conversation"
        )
        
    # Only creator can update group conversations
    if conversation.is_group and conversation.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the conversation creator can update group details"
        )
    
    # Convert to dict for update
    update_dict = update_data.dict(exclude_unset=True)
    updated_conversation = repository.update_conversation(conversation_id, update_dict)
    
    return updated_conversation


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    conversation = repository.get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
        
    # Only the creator can delete conversations
    if conversation.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the conversation creator can delete it"
        )
        
    repository.delete_conversation(conversation_id)
    return None


# Message endpoints
@router.post("/messages", response_model=Message, status_code=status.HTTP_201_CREATED)
async def create_message(
    content: str = Form(...),
    conversation_id: int = Form(...),
    files: List[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    conversation = repository.get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
        
    # Check if user is member of the conversation
    if current_user.id not in [member.id for member in conversation.members]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this conversation"
        )
    
    # Create the message
    message = repository.create_message(
        sender_id=current_user.id,
        conversation_id=conversation_id,
        content=content
    )
    
    # Process attachments if provided
    if files:
        for file in files:
            if file.filename:  # Skip empty file inputs
                attachment_data = attachment_service.save_attachment(
                    file, conversation_id, message.id
                )
                repository.add_attachment(
                    message_id=message.id,
                    file_name=attachment_data["file_name"],
                    file_type=attachment_data["file_type"],
                    file_size=attachment_data["file_size"],
                    file_path=attachment_data["file_path"]
                )
    
    # Send notifications
    message_service = MessageService(db)
    await message_service.notify_new_message(message, conversation)
    
    # Refresh message to get attachments
    return repository.get_message(message.id)


@router.get("/messages/{message_id}", response_model=Message)
def get_message(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    message = repository.get_message(message_id)
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
        
    # Get the conversation to check permissions
    conversation = repository.get_conversation(message.conversation_id)
    
    # Check if user is member of the conversation
    if current_user.id not in [member.id for member in conversation.members]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this message"
        )
        
    return message


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    message = repository.get_message(message_id)
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
        
    # Only sender or conversation creator can delete
    conversation = repository.get_conversation(message.conversation_id)
    if message.sender_id != current_user.id and conversation.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this message"
        )
    
    # Delete attachments first
    for attachment in message.attachments:
        attachment_service.delete_attachment(attachment.file_path)
    
    # Delete the message
    repository.delete_message(message_id)
    return None


@router.get("/messages/unread/count")
def get_unread_count(
    conversation_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    
    # If conversation_id is provided, check membership
    if conversation_id:
        conversation = repository.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
            
        if current_user.id not in [member.id for member in conversation.members]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this conversation"
            )
    
    # Get unread count
    count = repository.get_unread_count(current_user.id, conversation_id)
    
    return {"unread_count": count}


@router.post("/messages/read", status_code=status.HTTP_200_OK)
async def mark_messages_as_read(
    message_ids: List[int],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    
    # Check if all messages belong to conversations the user is a member of
    for message_id in message_ids:
        message = repository.get_message(message_id)
        if not message:
            continue
            
        conversation = repository.get_conversation(message.conversation_id)
        if current_user.id not in [member.id for member in conversation.members]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have access to message {message_id}"
            )
    
    # Mark messages as read
    repository.mark_as_read(current_user.id, message_ids)
    
    return {"success": True, "message": "Messages marked as read"}


@router.get("/attachments/{attachment_id}")
def get_attachment(
    attachment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repository = MessageRepository(db)
    attachment = repository.get_attachment(attachment_id)
    
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )
    
    # Check if user has access to the message/conversation
    message = repository.get_message(attachment.message_id)
    conversation = repository.get_conversation(message.conversation_id)
    
    if current_user.id not in [member.id for member in conversation.members]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this attachment"
        )
    
    # Get full file path
    full_path = attachment_service.get_attachment_path(attachment.file_path)
    
    if not os.path.exists(full_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment file not found"
        )
    
    return FileResponse(
        full_path,
        media_type=attachment.file_type,
        filename=attachment.file_name
    )
