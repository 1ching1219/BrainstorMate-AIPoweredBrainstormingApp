import axios from 'axios';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

const normalizeApiBaseUrl = (url) => url.replace(/\/+$/, '');

// Configure this through EXPO_PUBLIC_API_BASE_URL for remote testing.
// Examples:
// - Local dev: http://localhost:8000/api
// - LAN device: http://192.168.x.y:8000/api
// - ngrok: https://your-ngrok-url.ngrok-free.app/api
export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
);


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Room operations
export const createRoom = async (name) => {
  try {
    const response = await api.post('/rooms/create/', { name });
    return response.data;
  } catch (error) {
    console.error('Error creating room:', error.response?.data);
    throw error;
  }
};

export const getRoom = async (roomId) => {
  const response = await api.get(`/rooms/${roomId}/`);
  return response.data;
};

// Participant operations
export const addParticipant = async (roomId, name, isAI) => {
  const response = await api.post(`/rooms/${roomId}/add-participant/`, {
    name,
    is_ai: isAI
  });
  return response.data;
};

export const getParticipants = async (roomId) => {
  const response = await api.get(`/rooms/${roomId}/participants/`);
  return response.data;
};

// Message operations
export const sendMessage = async (roomId, sender, content, isAI = false) => {
  const response = await api.post(`/rooms/${roomId}/messages/`, {
    sender,
    content,
    is_ai: isAI
  });
  return response.data;
};

export const getMessages = async (roomId) => {
  const response = await api.get(`/rooms/${roomId}/messages/`);
  return response.data;
};

// AI Agent operations
export const getAIAgents = async () => {
  const response = await api.get('/ai-agents/');
  return response.data;
};

export const createAIAgent = async (role, description, avatar) => {
  try {
    const formData = new FormData();
    formData.append('role', role);
    formData.append('description', description);
    if (avatar) {
      formData.append('avatar', {
        uri: avatar,
        type: 'image/jpeg',
        name: 'avatar.jpg'
      });
    }
    
    const response = await api.post('/save-ai/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating AI agent:', error.response?.data);
    throw error;
  }
};

// WebSocket connection for real-time updates
// Extracts the host from API_BASE_URL and constructs the correct WebSocket URL
// Automatically uses wss:// for https backends, ws:// for http
export const getWebSocketUrl = (roomId) => {
  const baseUrl = new URL(API_BASE_URL);
  const protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${baseUrl.host}/ws/chat/${roomId}/`;
};
