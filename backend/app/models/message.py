from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.models.user import User


# Association table for conversation members (including groups)
conversation_members = Table(
    "conversation_members",
    Base.metadata,
    Column("conversation_id", Integer, ForeignKey("conversations.id")),
    Column("user_id", Integer, ForeignKey("users.id")),
)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=True)  # Name for group conversations, null for direct messages
    is_group = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    members = relationship("User", secondary=conversation_members, backref="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Conversation(id={self.id}, name={self.name}, is_group={self.is_group})>"


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")
    read_receipts = relationship("ReadReceipt", back_populates="message", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Message(id={self.id}, sender_id={self.sender_id}, created_at={self.created_at})>"


class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_path = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    message = relationship("Message", back_populates="attachments")

    def __repr__(self):
        return f"<MessageAttachment(id={self.id}, file_name={self.file_name})>"


class ReadReceipt(Base):
    __tablename__ = "read_receipts"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    read_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    message = relationship("Message", back_populates="read_receipts")
    user = relationship("User")

    def __repr__(self):
        return f"<ReadReceipt(message_id={self.message_id}, user_id={self.user_id}, read_at={self.read_at})>"
