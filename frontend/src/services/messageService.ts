// Services for message API interaction
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/messages`;
const CONVERSATIONS_URL = `${API_BASE_URL}/conversations`;

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface MessageAttachment {
  id: number;
  message_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
}

export interface ReadReceipt {
  id: number;
  user_id: number;
  message_id: number;
  read_at: string;
  user: User;
}

export interface Message {
  id: number;
  content: string;
  conversation_id: number;
  sender_id: number;
  sender: User;
  created_at: string;
  updated_at: string;
  attachments: MessageAttachment[];
  read_receipts: ReadReceipt[];
  is_read?: boolean;
}

export interface Conversation {
  id: number;
  name?: string;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: number;
  created_by: User;
  members: User[];
  last_message?: Message | null;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface MessageCreate {
  content: string;
  conversation_id: number;
}

export interface ConversationCreate {
  name?: string;
  is_group: boolean;
  member_ids: number[];
}

export interface ConversationUpdate {
  name?: string;
  member_ids?: number[];
}

// Fetch all conversations for the current user
export const getConversations = async (skip = 0, limit = 20) => {
  const response = await axios.get(`${CONVERSATIONS_URL}?skip=${skip}&limit=${limit}`);
  return response.data;
};

// Fetch a single conversation with messages
export const getConversation = async (conversationId: number, limit = 50) => {
  const response = await axios.get(`${CONVERSATIONS_URL}/${conversationId}?limit=${limit}`);
  return response.data;
};

// Create a new conversation
export const createConversation = async (conversationData: ConversationCreate) => {
  const response = await axios.post(CONVERSATIONS_URL, conversationData);
  return response.data;
};

// Update an existing conversation
export const updateConversation = async (conversationId: number, updateData: ConversationUpdate) => {
  const response = await axios.put(`${CONVERSATIONS_URL}/${conversationId}`, updateData);
  return response.data;
};

// Delete a conversation
export const deleteConversation = async (conversationId: number) => {
  await axios.delete(`${CONVERSATIONS_URL}/${conversationId}`);
  return true;
};

// Send a message (supports file attachments)
export const sendMessage = async (content: string, conversationId: number, files?: File[]) => {
  const formData = new FormData();
  formData.append('content', content);
  formData.append('conversation_id', conversationId.toString());
  
  if (files && files.length > 0) {
    files.forEach(file => {
      formData.append('files', file);
    });
  }
  
  const response = await axios.post(API_URL, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

// Get a single message
export const getMessage = async (messageId: number) => {
  const response = await axios.get(`${API_URL}/${messageId}`);
  return response.data;
};

// Delete a message
export const deleteMessage = async (messageId: number) => {
  await axios.delete(`${API_URL}/${messageId}`);
  return true;
};

// Get unread message count
export const getUnreadCount = async (conversationId?: number) => {
  const url = conversationId 
    ? `${API_URL}/unread/count?conversation_id=${conversationId}`
    : `${API_URL}/unread/count`;
  
  const response = await axios.get(url);
  return response.data.unread_count;
};

// Mark messages as read
export const markMessagesAsRead = async (messageIds: number[]) => {
  const response = await axios.post(`${API_URL}/read`, messageIds);
  return response.data;
};

// Get attachment URL
export const getAttachmentUrl = (attachmentId: number) => {
  return `${API_URL}/attachments/${attachmentId}`;
};

// Search messages
export const searchMessages = async (query: string, conversationId?: number, limit = 20) => {
  const url = conversationId
    ? `${API_URL}/search?query=${encodeURIComponent(query)}&conversation_id=${conversationId}&limit=${limit}`
    : `${API_URL}/search?query=${encodeURIComponent(query)}&limit=${limit}`;
  
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error searching messages:', error);
    return [];
  }
};
