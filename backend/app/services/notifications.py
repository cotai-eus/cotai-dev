"""
Service for handling notifications, including those from messages.
"""
from typing import Dict, Any, Optional, List
import asyncio
import json
from datetime import datetime

from sqlalchemy.orm import Session
from fastapi import WebSocket

from app.models.user import User
from app.db.redis import get_redis_client


class NotificationService:
    """
    Service for sending notifications to users through various channels.
    - In-app notifications through Redis pub/sub
    - Push notifications
    - Email notifications (for important events)
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.redis = get_redis_client()
    
    async def send_notification(self, 
                               user_id: int, 
                               content: Dict[str, Any], 
                               channels: List[str] = ['in_app']):
        """
        Send a notification to a user through specified channels.
        
        Args:
            user_id: The ID of the user to notify
            content: The notification content
            channels: Channels to send the notification through ('in_app', 'push', 'email')
        """
        notification_data = {
            "id": f"notification_{datetime.utcnow().timestamp()}_{user_id}",
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "is_read": False,
            **content
        }
        
        # Convert to JSON for storage/transmission
        notification_json = json.dumps(notification_data)
        
        # In-app notification via Redis pub/sub
        if 'in_app' in channels:
            await self._send_in_app_notification(user_id, notification_json)
        
        # Push notification (if configured)
        if 'push' in channels:
            await self._send_push_notification(user_id, content)
        
        # Email notification (for important notifications)
        if 'email' in channels:
            await self._send_email_notification(user_id, content)
            
        # Store notification in database
        await self._store_notification(notification_data)
    
    async def _send_in_app_notification(self, user_id: int, notification_json: str):
        """
        Publish notification to Redis channel for in-app real-time notifications.
        The WebSocket connection manager will listen to this channel and forward to client.
        """
        channel = f"user:{user_id}:notifications"
        try:
            # Use Redis pub/sub to publish notification
            await asyncio.to_thread(
                self.redis.publish,
                channel, 
                notification_json
            )
        except Exception as e:
            print(f"Error publishing notification to Redis: {str(e)}")
    
    async def _send_push_notification(self, user_id: int, content: Dict[str, Any]):
        """
        Send push notification to user's registered devices.
        
        To be implemented with a push notification service like Firebase.
        """
        # To be implemented
        pass
    
    async def _send_email_notification(self, user_id: int, content: Dict[str, Any]):
        """
        Send email notification for important events.
        """
        # To be implemented 
        pass
    
    async def _store_notification(self, notification_data: Dict[str, Any]):
        """
        Store notification in database for history and retrieval.
        """
        # To be implemented - store in PostgreSQL or MongoDB
        pass
    
    async def mark_notification_as_read(self, notification_id: str, user_id: int):
        """
        Mark a notification as read.
        """
        # To be implemented
        pass
    
    async def delete_notification(self, notification_id: str, user_id: int):
        """
        Delete a notification.
        """
        # To be implemented
        pass
