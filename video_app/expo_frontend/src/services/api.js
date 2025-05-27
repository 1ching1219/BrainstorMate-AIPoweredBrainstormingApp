import axios from 'axios';

const BASE_URL = 'https://0000-0000.ngrok-free.app/api';

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
  // Get the full domain including protocol
  const url = new URL(BASE_URL);
  
  // Determine the WebSocket protocol based on HTTP protocol
  const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Return the properly formatted WebSocket URL
  // Add 'ws' to the path to match Django Channels routing
  return `${wsProtocol}//${url.host}/ws/chat/${roomId}/`
  // return `${wsProtocol}//${url.host}/api/rooms/${roomId}/`;
};