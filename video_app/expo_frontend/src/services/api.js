import axios from 'axios';

const BASE_URL = 'https://fc14-2001-b400-e254-e7a8-fd1c-3782-f237-2012.ngrok-free.app/api';

const api = axios.create({
  baseURL: BASE_URL,
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
export const addParticipant = async (roomId, name, userId) => {
  // Updated to match the backend expectation with userId instead of isAI
  const response = await api.post(`/rooms/${roomId}/participants`, {
    name,
    userId
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
  // Note: The backend doesn't seem to have a direct endpoint for sending messages
  // You may need to adjust your backend or this function
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

// AI Agent/Partner operations
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
      formData.append('avatar', avatar);
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
export const getWebSocketUrl = (roomId) => {
  // Extract the domain from BASE_URL without the http/https protocol
  const domain = BASE_URL.split('://')[1];
  return `wss://${domain}/ws/rooms/${roomId}/`;
};