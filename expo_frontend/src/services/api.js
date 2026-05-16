import axios from 'axios';
import * as FileSystem from 'expo-file-system';

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

// Join room operation
export const joinRoom = async (roomId, name, userId, aiAgentId = null) => {
  const data = {
    name,
    userId,
    is_ai: false
  };
  
  if (aiAgentId) {
    data.ai_agent = aiAgentId;
  }
  
  const response = await api.post(`/rooms/${roomId}/join/`, data);
  return response.data;
};

// Message operations
export const sendMessage = async (roomId, sender, content, isAI = false) => {
  try {
    const response = await api.post(
      `/rooms/${roomId}/messages/`,
      { sender, content, is_ai: isAI, room: roomId }
    );
    return response.data;
  } catch (err) {
    console.error("sendMessage 400:", err.response?.data);
    throw err;
  }
};

export const getMessages = async (roomId) => {
  const response = await api.get(`/rooms/${roomId}/messages/`);
  return response.data;
};

export const triggerAIResponse = async (roomId, message, triggerType = 'user_message') => {
  try {
    const response = await api.post(`/rooms/${roomId}/ai_respond/`, {
      message,
      trigger_type: triggerType
    });
    return response.data;
  } catch (error) {
    console.error('Error triggering AI response:', error.response?.data);
    throw error;
  }
};

// AI Agent/Partner operations
export const getAIAgents = async () => {
  const response = await api.get('/ai-agents/');
  return response.data;
};

export const createAIAgent = async (role, description, avatar) => {
  try {
    const payload = { role, description };

    if (avatar) {
      const filename = avatar.split('/').pop();
      const ext = /\.(\w+)$/.exec(filename);
      const base64 = await FileSystem.readAsStringAsync(avatar, {
        encoding: FileSystem.EncodingType.Base64,
      });
      payload.avatar_base64 = base64;
      payload.avatar_filename = filename || 'avatar.jpg';
      payload.avatar_mimetype = ext ? `image/${ext[1].toLowerCase()}` : 'image/jpeg';
    }

    const response = await api.post('/save-ai-base64/', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating AI agent:', error.response?.data);
    throw error;
  }
};

export const updateAIAgent = async (agentId, role, description, avatar) => {
  try {
    const payload = { role, description };

    if (avatar && avatar.startsWith('file://')) {
      const filename = avatar.split('/').pop();
      const ext = /\.(\w+)$/.exec(filename);
      const base64 = await FileSystem.readAsStringAsync(avatar, {
        encoding: FileSystem.EncodingType.Base64,
      });
      payload.avatar_base64 = base64;
      payload.avatar_filename = filename || 'avatar.jpg';
      payload.avatar_mimetype = ext ? `image/${ext[1].toLowerCase()}` : 'image/jpeg';
    }

    const response = await api.patch(`/ai-agents/${agentId}/update/`, payload);
    return response.data;
  } catch (error) {
    console.error('Error updating AI agent:', error.response?.data);
    throw error;
  }
};

export const deleteAIAgent = async (agentId) => {
  try {
    const response = await api.delete(`/ai-agents/${agentId}/delete/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting AI agent:', error.response?.data);
    throw error;
  }
};

// AI Partners for a specific room
export const getAIPartners = async (roomId) => {
  const response = await api.get(`/rooms/${roomId}/ai-partners/`);
  return response.data;
};

export const setAIPartners = async (roomId, aiPartners) => {
  const response = await api.post(`/rooms/${roomId}/ai-partners/`, {
    aiPartners
  });
  return response.data;
};

// WebSocket connection for real-time updates
// Extracts the host from API_BASE_URL and constructs the correct WebSocket URL
// Automatically uses wss:// for https backends, ws:// for http
export const getWebSocketUrl = (roomId) => {
  const baseUrl = new URL(API_BASE_URL);
  const protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${baseUrl.host}/ws/chat/${roomId}/`;
};
