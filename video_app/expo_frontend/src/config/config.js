// API Configuration
const API_CONFIG = {
  // Base URLs
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  WS_BASE_URL: process.env.EXPO_PUBLIC_WS_BASE_URL || 'ws://localhost:8000',

  // API Endpoints
  ENDPOINTS: {
    // Room endpoints
    ROOMS: {
      LIST: '/api/rooms/',
      CREATE: '/api/rooms/',
      JOIN: (roomId) => `/api/rooms/${roomId}/join/`,
      PARTICIPANTS: (roomId) => `/api/rooms/${roomId}/participants/`,
      MESSAGES: (roomId) => `/api/rooms/${roomId}/messages/`,
    },
    // AI endpoints
    AI: {
      LIST: '/api/ai/',
      CREATE: '/api/ai/',
    },
  },

  // WebSocket endpoints
  WS_ENDPOINTS: {
    CHAT: (roomId) => `/ws/chat/${roomId}/`,
  },

  // WebRTC Configuration
  WEBRTC: {
    ICE_SERVERS: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },

  // Pagination
  PAGINATION: {
    PARTICIPANTS_PER_PAGE: 4,
  },

  // Reconnection settings
  RECONNECTION: {
    MAX_ATTEMPTS: 5,
    INITIAL_DELAY: 1000, // ms
    MAX_DELAY: 30000, // ms
  },
};

export default API_CONFIG; 