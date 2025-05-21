// WebSocket service for real-time messaging
import { API_BASE_URL } from '../config';
import { Message, User } from './messageService';

interface WSMessagePayload {
  type: string;
  payload: any;
}

type MessageHandler = (message: Message) => void;
type TypingHandler = (userId: number, conversationId: number, isTyping: boolean) => void;
type ReadReceiptHandler = (userId: number, messageIds: number[], conversationId: number) => void;
type ConnectionHandler = (isConnected: boolean) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private typingHandlers: TypingHandler[] = [];
  private readReceiptHandlers: ReadReceiptHandler[] = [];
  private connectionHandlers: ConnectionHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentConversationId: number | null = null;

  constructor() {
    this.initSocket();
  }

  private initSocket(): void {
    try {
      // Get the JWT token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      this.socket = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/ws?token=${token}`);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        this.notifyConnectionChange(true);
        
        // Join current conversation if available
        if (this.currentConversationId) {
          this.joinConversation(this.currentConversationId);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data: WSMessagePayload = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        this.notifyConnectionChange(false);
        
        if (!event.wasClean) {
          console.log(`WebSocket connection closed unexpectedly. Code: ${event.code}`);
          this.attemptReconnect();
        } else {
          console.log('WebSocket connection closed cleanly');
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * (2 ** this.reconnectAttempts), 30000); // Exponential backoff capped at 30 seconds
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.initSocket();
    }, delay);
  }

  private handleMessage(data: WSMessagePayload): void {
    const { type, payload } = data;

    switch (type) {
      case 'new_message':
        this.notifyNewMessage(payload.message);
        break;
      case 'typing_status':
        this.notifyTypingStatus(
          payload.user_id,
          payload.conversation_id,
          payload.is_typing
        );
        break;
      case 'read_receipt':
        this.notifyReadReceipt(
          payload.user_id,
          payload.message_ids,
          payload.conversation_id
        );
        break;
      default:
        console.log('Unknown WebSocket message type:', type);
    }
  }

  private sendMessage(type: string, payload: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  // Public methods
  public joinConversation(conversationId: number): void {
    this.currentConversationId = conversationId;
    this.sendMessage('join_conversation', { conversation_id: conversationId });
  }

  public leaveConversation(conversationId: number): void {
    this.currentConversationId = null;
    this.sendMessage('leave_conversation', { conversation_id: conversationId });
  }

  public sendTypingStatus(conversationId: number, isTyping: boolean): void {
    this.sendMessage('typing_status', {
      conversation_id: conversationId,
      is_typing: isTyping,
    });
  }

  public sendReadReceipt(conversationId: number, messageIds: number[]): void {
    this.sendMessage('read_receipt', {
      conversation_id: conversationId,
      message_ids: messageIds,
    });
  }

  public closeConnection(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Event listeners
  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  public onTypingStatus(handler: TypingHandler): () => void {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter(h => h !== handler);
    };
  }

  public onReadReceipt(handler: ReadReceiptHandler): () => void {
    this.readReceiptHandlers.push(handler);
    return () => {
      this.readReceiptHandlers = this.readReceiptHandlers.filter(h => h !== handler);
    };
  }

  public onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  // Notification methods
  private notifyNewMessage(message: Message): void {
    this.messageHandlers.forEach(handler => handler(message));
  }

  private notifyTypingStatus(userId: number, conversationId: number, isTyping: boolean): void {
    this.typingHandlers.forEach(handler => handler(userId, conversationId, isTyping));
  }

  private notifyReadReceipt(userId: number, messageIds: number[], conversationId: number): void {
    this.readReceiptHandlers.forEach(handler => handler(userId, messageIds, conversationId));
  }

  private notifyConnectionChange(isConnected: boolean): void {
    this.connectionHandlers.forEach(handler => handler(isConnected));
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;
