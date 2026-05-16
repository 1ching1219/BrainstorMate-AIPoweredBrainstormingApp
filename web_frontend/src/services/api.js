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

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const updateAIAgent = async (agentId, role, description, avatarFile) => {
  const payload = { role, description };
  if (avatarFile) {
    payload.avatar_base64 = await toBase64(avatarFile);
    payload.avatar_filename = avatarFile.name;
    payload.avatar_mimetype = avatarFile.type || 'image/jpeg';
  }
  const response = await fetch(`${API_BASE_URL}/ai-agents/${agentId}/update/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

export const deleteAIAgent = async (agentId) => {
  const response = await fetch(`${API_BASE_URL}/ai-agents/${agentId}/delete/`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(await response.text());
};

export const getWebSocketUrl = (roomId) => {
  const protocol = API_ORIGIN.startsWith('https:') ? 'wss:' : 'ws:';
  return `${protocol}//${API_ORIGIN.replace(/^https?:\/\//, '')}/ws/chat/${roomId}/`;
};

