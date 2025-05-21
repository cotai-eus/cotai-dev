/**
 * Tipos compartilhados para o frontend
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  address?: Address;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Document {
  id: string;
  title: string;
  type: 'pdf' | 'doc' | 'xls' | 'other';
  fileUrl: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  extractedData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Bid {
  id: string;
  title: string;
  description?: string;
  bidNumber: string;
  organization: string;
  openingDate: string;
  closingDate: string;
  status: 'upcoming' | 'open' | 'closed' | 'canceled';
  documents: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  bidId: string;
  title: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  items: QuotationItem[];
  totalValue: number;
  profit: number;
  riskScore: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface QuotationItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice: number;
  profit: number;
  riskScore: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  userId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: string[];
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title?: string;
  participants: string[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  type: 'bid' | 'meeting' | 'deadline' | 'other';
  relatedId?: string; // ID de licitação ou outro item relacionado
  createdAt: string;
  updatedAt: string;
  userId: string;
}
