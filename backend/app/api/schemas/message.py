from datetime import datetime
from typing import List, Optional, Union

from pydantic import BaseModel, Field


# User schema (simplified for response inclusion)
class UserBase(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None


# Message Attachment Schemas
class MessageAttachmentBase(BaseModel):
    file_name: str
    file_type: str
    file_size: int


class MessageAttachmentCreate(MessageAttachmentBase):
    pass


class MessageAttachment(MessageAttachmentBase):
    id: int
    message_id: int
    file_path: str
    created_at: datetime

    class Config:
        orm_mode = True


# Read Receipt Schemas
class ReadReceiptBase(BaseModel):
    user_id: int
    message_id: int


class ReadReceiptCreate(ReadReceiptBase):
    pass


class ReadReceipt(ReadReceiptBase):
    id: int
    read_at: datetime
    user: UserBase

    class Config:
        orm_mode = True


# Message Schemas
class MessageBase(BaseModel):
    content: str


class MessageCreate(MessageBase):
    conversation_id: int
    attachments: Optional[List[MessageAttachmentCreate]] = []


class Message(MessageBase):
    id: int
    conversation_id: int
    sender_id: int
    sender: UserBase
    created_at: datetime
    updated_at: datetime
    attachments: List[MessageAttachment] = []
    read_receipts: List[ReadReceipt] = []

    class Config:
        orm_mode = True


class MessageResponse(Message):
    is_read: bool = False


# Conversation Schemas
class ConversationBase(BaseModel):
    name: Optional[str] = None
    is_group: bool = False


class ConversationCreate(ConversationBase):
    member_ids: List[int]


class ConversationUpdate(BaseModel):
    name: Optional[str] = None
    member_ids: Optional[List[int]] = None


class Conversation(ConversationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by_id: int
    created_by: UserBase
    members: List[UserBase] = []
    last_message: Optional[Message] = None

    class Config:
        orm_mode = True


class ConversationWithMessages(Conversation):
    messages: List[Message] = []


# WebSocket Schemas
class WSMessage(BaseModel):
    type: str  # message, typing, read_receipt
    payload: dict


class WSMessageEvent(BaseModel):
    message: Message
    conversation_id: int


class WSTypingEvent(BaseModel):
    user_id: int
    conversation_id: int
    is_typing: bool


class WSReadReceiptEvent(BaseModel):
    user_id: int
    message_ids: List[int]
    conversation_id: int
