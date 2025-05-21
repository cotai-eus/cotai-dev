from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any

from sqlalchemy import desc, func
from sqlalchemy.orm import Session, joinedload

from app.models.message import Conversation, Message, ReadReceipt, MessageAttachment
from app.models.user import User


class MessageRepository:
    def __init__(self, db: Session):
        self.db = db

    # Conversation methods
    def create_conversation(self, created_by_id: int, is_group: bool, name: Optional[str], member_ids: List[int]) -> Conversation:
        # Create the conversation
        conversation = Conversation(
            created_by_id=created_by_id,
            is_group=is_group,
            name=name if is_group else None
        )
        self.db.add(conversation)
        self.db.flush()  # To get the ID
        
        # Add members (including creator)
        member_ids = set(member_ids)
        member_ids.add(created_by_id)  # Ensure creator is a member
        
        # Get users
        members = self.db.query(User).filter(User.id.in_(member_ids)).all()
        conversation.members = members
        
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def get_conversation(self, conversation_id: int) -> Optional[Conversation]:
        return self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).options(
            joinedload(Conversation.members),
            joinedload(Conversation.created_by)
        ).first()

    def get_conversations_for_user(self, user_id: int, skip: int = 0, limit: int = 20) -> List[Conversation]:
        # This query gets conversations with their last message
        subquery = self.db.query(
            Message.conversation_id,
            func.max(Message.created_at).label('max_date')
        ).group_by(Message.conversation_id).subquery('t')

        conversations = self.db.query(Conversation).join(
            Conversation.members
        ).filter(
            User.id == user_id
        ).options(
            joinedload(Conversation.members),
            joinedload(Conversation.created_by)
        ).order_by(
            desc(Conversation.updated_at)
        ).offset(skip).limit(limit).all()
        
        # Get the last message for each conversation
        for conversation in conversations:
            last_message = self.db.query(Message).filter(
                Message.conversation_id == conversation.id
            ).order_by(
                desc(Message.created_at)
            ).first()
            
            conversation.last_message = last_message

        return conversations
    
    def update_conversation(self, conversation_id: int, data: Dict[str, Any]) -> Optional[Conversation]:
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return None

        if "name" in data and data["name"]:
            conversation.name = data["name"]

        if "member_ids" in data and data["member_ids"]:
            members = self.db.query(User).filter(
                User.id.in_(data["member_ids"])
            ).all()
            conversation.members = members

        conversation.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def delete_conversation(self, conversation_id: int) -> bool:
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return False

        self.db.delete(conversation)
        self.db.commit()
        return True

    # Message methods
    def create_message(self, sender_id: int, conversation_id: int, content: str) -> Message:
        message = Message(
            sender_id=sender_id,
            conversation_id=conversation_id,
            content=content
        )
        self.db.add(message)
        
        # Update conversation last activity time
        conversation = self.get_conversation(conversation_id)
        conversation.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(message)
        return message

    def get_message(self, message_id: int) -> Optional[Message]:
        return self.db.query(Message).filter(
            Message.id == message_id
        ).options(
            joinedload(Message.sender),
            joinedload(Message.attachments),
            joinedload(Message.read_receipts).joinedload(ReadReceipt.user)
        ).first()

    def get_messages(self, conversation_id: int, skip: int = 0, limit: int = 50) -> List[Message]:
        return self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).options(
            joinedload(Message.sender),
            joinedload(Message.attachments),
            joinedload(Message.read_receipts).joinedload(ReadReceipt.user)
        ).order_by(
            desc(Message.created_at)
        ).offset(skip).limit(limit).all()

    def delete_message(self, message_id: int) -> bool:
        message = self.get_message(message_id)
        if not message:
            return False

        self.db.delete(message)
        self.db.commit()
        return True
    
    # Attachment methods
    def add_attachment(self, message_id: int, file_name: str, file_type: str, 
                      file_size: int, file_path: str) -> MessageAttachment:
        attachment = MessageAttachment(
            message_id=message_id,
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
            file_path=file_path
        )
        self.db.add(attachment)
        self.db.commit()
        self.db.refresh(attachment)
        return attachment

    def get_attachment(self, attachment_id: int) -> Optional[MessageAttachment]:
        return self.db.query(MessageAttachment).filter(
            MessageAttachment.id == attachment_id
        ).first()
    
    # Read receipt methods
    def mark_as_read(self, user_id: int, message_ids: List[int]) -> List[ReadReceipt]:
        receipts = []
        
        # Check for existing read receipts
        existing_receipts = self.db.query(ReadReceipt).filter(
            ReadReceipt.user_id == user_id, 
            ReadReceipt.message_id.in_(message_ids)
        ).all()
        
        existing_message_ids = [receipt.message_id for receipt in existing_receipts]
        
        # Create new read receipts for messages that haven't been marked as read
        for message_id in message_ids:
            if message_id not in existing_message_ids:
                receipt = ReadReceipt(
                    user_id=user_id,
                    message_id=message_id,
                    read_at=datetime.utcnow()
                )
                self.db.add(receipt)
                receipts.append(receipt)
        
        self.db.commit()
        
        # Refresh created receipts
        for receipt in receipts:
            self.db.refresh(receipt)
            
        return receipts

    def get_unread_count(self, user_id: int, conversation_id: Optional[int] = None) -> int:
        # Base query to get messages in conversations the user is a member of, but didn't send
        query = self.db.query(Message).join(
            Conversation, Message.conversation_id == Conversation.id
        ).join(
            Conversation.members
        ).filter(
            User.id == user_id,
            Message.sender_id != user_id
        )
        
        # Apply conversation filter if provided
        if conversation_id:
            query = query.filter(Message.conversation_id == conversation_id)
            
        # Exclude messages that have a read receipt from this user
        subquery = self.db.query(ReadReceipt.message_id).filter(
            ReadReceipt.user_id == user_id
        ).subquery()
        
        query = query.filter(Message.id.notin_(subquery))
        
        # Return the count
        return query.count()
