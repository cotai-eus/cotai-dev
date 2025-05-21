// Application configuration

// API configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// File upload configuration
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

// Message configuration
export const MESSAGE_PAGE_SIZE = 50;
export const TYPING_DEBOUNCE_TIME = 500; // milliseconds

// UI configuration
export const EMOJI_PICKER_HEIGHT = 300; // pixels
