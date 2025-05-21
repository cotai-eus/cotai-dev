import asyncio
import json
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.db import get_db
from app.api.deps.auth import get_current_user_ws
from app.db.repositories.message_repository import MessageRepository
from app.models.user import User
from app.services.notifications import NotificationService


class ConnectionManager:
    def __init__(self):
        # Maps user_id -> list of websocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Maps conversation_id -> set of user_ids with active connections
        self.conversation_users: Dict[int, Set[int]] = {}
        # Maps user_id -> {conversation_id -> typing status}
        self.typing_status: Dict[int, Dict[int, bool]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
            
        self.active_connections[user_id].append(websocket)
        
        # Initialize typing status for this user if not exists
        if user_id not in self.typing_status:
            self.typing_status[user_id] = {}

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            # If no more connections for this user, clean up
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
                # Remove user from all conversation_users entries
                for conv_id, users in self.conversation_users.items():
                    if user_id in users:
                        users.remove(user_id)
                
                # Clean up typing status
                if user_id in self.typing_status:
                    del self.typing_status[user_id]

    def get_connected_users_for_conversation(self, conversation_id: int) -> Set[int]:
        """Get all connected user_ids for a specific conversation"""
        return self.conversation_users.get(conversation_id, set())

    def join_conversation(self, user_id: int, conversation_id: int):
        """Register that a user has joined (is viewing) a conversation"""
        if conversation_id not in self.conversation_users:
            self.conversation_users[conversation_id] = set()
            
        self.conversation_users[conversation_id].add(user_id)

    def leave_conversation(self, user_id: int, conversation_id: int):
        """Register that a user has left a conversation view"""
        if conversation_id in self.conversation_users and user_id in self.conversation_users[conversation_id]:
            self.conversation_users[conversation_id].remove(user_id)
            
            # Clean up empty sets
            if not self.conversation_users[conversation_id]:
                del self.conversation_users[conversation_id]

    def update_typing_status(self, user_id: int, conversation_id: int, is_typing: bool):
        """Update the typing status for a user in a conversation"""
        if user_id not in self.typing_status:
            self.typing_status[user_id] = {}
            
        self.typing_status[user_id][conversation_id] = is_typing

    def get_typing_users(self, conversation_id: int) -> List[int]:
        """Get all users currently typing in a conversation"""
        typing_users = []
        for user_id, conversations in self.typing_status.items():
            if conversation_id in conversations and conversations[conversation_id]:
                typing_users.append(user_id)
        return typing_users

    async def broadcast_to_conversation(self, conversation_id: int, message: Dict[str, Any], exclude_user_id: Optional[int] = None):
        """Send a message to all connected clients in a conversation"""
        if conversation_id in self.conversation_users:
            for user_id in self.conversation_users[conversation_id]:
                if user_id != exclude_user_id and user_id in self.active_connections:
                    for connection in self.active_connections[user_id]:
                        await connection.send_text(json.dumps(message))

    async def send_personal_message(self, user_id: int, message: Dict[str, Any]):
        """Send a message to a specific user across all their connections"""
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_text(json.dumps(message))


# Create a global instance
connection_manager = ConnectionManager()


class MessageService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = MessageRepository(db)
        self.notification_service = NotificationService(db)

    async def handle_websocket_connection(self, websocket: WebSocket, user: User):
        """Handle a new WebSocket connection from a user"""
        user_id = user.id
        await connection_manager.connect(websocket, user_id)
        
        try:
            while True:
                data = await websocket.receive_text()
                await self.process_message(user, data)
        except WebSocketDisconnect:
            connection_manager.disconnect(websocket, user_id)
        except Exception as e:
            print(f"Error in websocket connection: {str(e)}")
            connection_manager.disconnect(websocket, user_id)

    async def process_message(self, user: User, message_data: str):
        """Process incoming websocket messages"""
        try:
            data = json.loads(message_data)
            message_type = data.get("type")
            payload = data.get("payload", {})
            
            if message_type == "join_conversation":
                conversation_id = payload.get("conversation_id")
                if conversation_id:
                    connection_manager.join_conversation(user.id, conversation_id)
                    
            elif message_type == "leave_conversation":
                conversation_id = payload.get("conversation_id")
                if conversation_id:
                    connection_manager.leave_conversation(user.id, conversation_id)
                    
            elif message_type == "typing_status":
                conversation_id = payload.get("conversation_id")
                is_typing = payload.get("is_typing", False)
                if conversation_id:
                    connection_manager.update_typing_status(user.id, conversation_id, is_typing)
                    
                    # Broadcast typing status to other members
                    await connection_manager.broadcast_to_conversation(
                        conversation_id,
                        {
                            "type": "typing_status",
                            "payload": {
                                "user_id": user.id,
                                "conversation_id": conversation_id,
                                "is_typing": is_typing
                            }
                        },
                        exclude_user_id=user.id
                    )
                    
            elif message_type == "read_receipt":
                message_ids = payload.get("message_ids", [])
                conversation_id = payload.get("conversation_id")
                
                if message_ids and conversation_id:
                    # Mark messages as read
                    self.repository.mark_as_read(user.id, message_ids)
                    
                    # Notify other users
                    await connection_manager.broadcast_to_conversation(
                        conversation_id,
                        {
                            "type": "read_receipt",
                            "payload": {
                                "user_id": user.id,
                                "message_ids": message_ids,
                                "conversation_id": conversation_id
                            }
                        },
                        exclude_user_id=user.id
                    )
        
        except json.JSONDecodeError:
            print("Invalid JSON received from WebSocket")
        except Exception as e:
            print(f"Error processing WebSocket message: {str(e)}")

    async def notify_new_message(self, message, conversation):
        """Notify users about a new message through websocket and notification system"""
        # Prepare message data
        message_data = {
            "type": "new_message",
            "payload": {
                "message": {
                    "id": message.id,
                    "content": message.content,
                    "sender_id": message.sender_id,
                    "conversation_id": message.conversation_id,
                    "created_at": message.created_at.isoformat(),
                    "updated_at": message.updated_at.isoformat(),
                },
                "conversation_id": message.conversation_id
            }
        }
        
        # Broadcast to conversation members
        await connection_manager.broadcast_to_conversation(
            message.conversation_id,
            message_data,
            exclude_user_id=message.sender_id
        )
        
        # Send notification to users who are not currently in this conversation
        connected_users = connection_manager.get_connected_users_for_conversation(message.conversation_id)
        
        for member in conversation.members:
            if member.id != message.sender_id and member.id not in connected_users:
                # Create a notification for the user
                sender_name = message.sender.full_name or message.sender.username
                conversation_name = conversation.name or sender_name
                
                notification_content = {
                    "title": f"New message from {conversation_name}",
                    "message": message.content[:50] + ('...' if len(message.content) > 50 else ''),
                    "type": "message",
                    "data": {
                        "conversation_id": conversation.id,
                        "message_id": message.id,
                        "sender_id": message.sender_id
                    }
                }
                
                await self.notification_service.send_notification(member.id, notification_content)
