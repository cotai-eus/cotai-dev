"""
Tests for the message and conversation APIs.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.message import Conversation, Message, MessageAttachment, ReadReceipt
from app.models.user import User
from app.db.repositories.message_repository import MessageRepository
from app.api.deps.auth import get_current_active_user, get_current_user_ws
from app.api.schemas.message import ConversationCreate, MessageCreate


# Mock authentication for tests
async def override_get_current_active_user():
    # Return a mock user for testing
    return User(
        id=1,
        username="test_user",
        email="test@example.com",
        hashed_password="hashed_password",
        full_name="Test User",
        is_active=True
    )


async def override_get_current_user_ws():
    # Return a mock user for websocket tests
    return User(
        id=1,
        username="test_user",
        email="test@example.com",
        hashed_password="hashed_password",
        full_name="Test User",
        is_active=True
    )


# Apply authentication override for tests
app.dependency_overrides[get_current_active_user] = override_get_current_active_user
app.dependency_overrides[get_current_user_ws] = override_get_current_user_ws


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def test_user(db: Session):
    """Create a test user for message tests."""
    user = User(
        username="test_user",
        email="test@example.com",
        hashed_password="hashed_password",
        full_name="Test User",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_user2(db: Session):
    """Create a second test user for conversation tests."""
    user = User(
        username="test_user2",
        email="test2@example.com",
        hashed_password="hashed_password",
        full_name="Test User 2",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_conversation(db: Session, test_user, test_user2):
    """Create a test conversation."""
    conversation = Conversation(
        name=None,
        is_group=False,
        created_by_id=test_user.id
    )
    db.add(conversation)
    db.flush()
    
    # Add members
    conversation.members = [test_user, test_user2]
    
    db.commit()
    db.refresh(conversation)
    return conversation


@pytest.fixture
def test_message(db: Session, test_conversation, test_user):
    """Create a test message."""
    message = Message(
        conversation_id=test_conversation.id,
        sender_id=test_user.id,
        content="Test message content"
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


class TestConversationAPI:
    """Tests for conversation endpoints."""
    
    def test_create_conversation(self, client, db: Session, test_user, test_user2):
        """Test creating a new conversation."""
        conversation_data = {
            "name": None,
            "is_group": False,
            "member_ids": [test_user2.id]
        }
        
        response = client.post(
            "/api/v1/messaging/conversations",
            json=conversation_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["is_group"] == False
        assert len(data["members"]) == 2
        assert data["created_by_id"] == test_user.id
        
        # Check that the conversation was actually created in the database
        conversation = db.query(Conversation).filter(Conversation.id == data["id"]).first()
        assert conversation is not None
        assert len(conversation.members) == 2
    
    def test_create_group_conversation(self, client, db: Session, test_user, test_user2):
        """Test creating a new group conversation."""
        conversation_data = {
            "name": "Test Group",
            "is_group": True,
            "member_ids": [test_user2.id]
        }
        
        response = client.post(
            "/api/v1/messaging/conversations",
            json=conversation_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["is_group"] == True
        assert data["name"] == "Test Group"
        assert len(data["members"]) == 2
    
    def test_get_conversations(self, client, test_conversation):
        """Test retrieving user conversations."""
        response = client.get("/api/v1/messaging/conversations")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(conv["id"] == test_conversation.id for conv in data)
    
    def test_get_conversation(self, client, test_conversation):
        """Test retrieving a specific conversation with messages."""
        response = client.get(f"/api/v1/messaging/conversations/{test_conversation.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_conversation.id
        assert "messages" in data
        
    def test_update_conversation(self, client, test_conversation, test_user2, db: Session):
        """Test updating a conversation."""
        update_data = {
            "name": "Updated Conversation"
        }
        
        response = client.put(
            f"/api/v1/messaging/conversations/{test_conversation.id}",
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Conversation"
        
        # Verify in database
        db.refresh(test_conversation)
        assert test_conversation.name == "Updated Conversation"


class TestMessageAPI:
    """Tests for message endpoints."""
    
    def test_create_message(self, client, test_conversation):
        """Test creating a new message."""
        form_data = {
            "content": "Hello, this is a test message",
            "conversation_id": test_conversation.id
        }
        
        response = client.post(
            "/api/v1/messaging/messages",
            data=form_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "Hello, this is a test message"
        assert data["conversation_id"] == test_conversation.id
    
    def test_get_message(self, client, test_message):
        """Test retrieving a specific message."""
        response = client.get(f"/api/v1/messaging/messages/{test_message.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_message.id
        assert data["content"] == test_message.content
    
    def test_mark_messages_as_read(self, client, test_message, db: Session, test_user):
        """Test marking messages as read."""
        response = client.post(
            "/api/v1/messaging/messages/read",
            json={"message_ids": [test_message.id]}
        )
        
        assert response.status_code == 200
        
        # Verify in database
        read_receipt = db.query(ReadReceipt).filter(
            ReadReceipt.message_id == test_message.id,
            ReadReceipt.user_id == test_user.id
        ).first()
        
        assert read_receipt is not None
    
    def test_get_unread_count(self, client, test_message, test_conversation):
        """Test getting unread message count."""
        response = client.get("/api/v1/messaging/messages/unread/count")
        
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        
        # Test with conversation filter
        response = client.get(f"/api/v1/messaging/messages/unread/count?conversation_id={test_conversation.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
    
    def test_delete_message(self, client, test_message, db: Session):
        """Test deleting a message."""
        response = client.delete(f"/api/v1/messaging/messages/{test_message.id}")
        
        assert response.status_code == 204
        
        # Verify deletion in database
        message = db.query(Message).filter(Message.id == test_message.id).first()
        assert message is None
