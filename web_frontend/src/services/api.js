import axios from 'axios';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

const normalizeApiBaseUrl = (url) => url.replace(/\/+$/, '');

// Configure this through REACT_APP_API_BASE_URL for remote testing.
// Examples:
// - Local dev: http://localhost:8000/api
// - LAN device: http://192.168.x.y:8000/api
// - ngrok: https://your-ngrok-url.ngrok-free.app/api
export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL
);

export const API_ORIGIN = API_BASE_URL.startsWith('/')
  ? window.location.origin
  : `${new URL(API_BASE_URL).protocol}//${new URL(API_BASE_URL).host}`;

axios.defaults.baseURL = API_ORIGIN;

export const getWebSocketUrl = (roomId) => {
  const protocol = API_ORIGIN.startsWith('https:') ? 'wss:' : 'ws:';
  return `${protocol}//${API_ORIGIN.replace(/^https?:\/\//, '')}/ws/chat/${roomId}/`;
};

