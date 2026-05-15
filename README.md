# BrainstroMate - Your AI-powered Creative Partner

**BrainstroMate** is an AI-powered brainstorming tool designed to enhance creativity and productivity in online meetings. It uses React.js for the frontend and Django for the backend, providing custom AI agents (via prompt role settings) that join online meetings to assist in discussions. This tool tackles the common challenges of brainstorming sessions, such as difficulty in finding the right team members and creative stagnation during discussions.

---

## 🚀 Features

- **AI-Powered Agent**: Customizable AI agents can be added to the meeting to provide relevant suggestions, ask questions, and drive the conversation.
- **Video & Messaging Support**: Real-time video and messaging powered by WebRTC and socket communication for seamless interaction.
- **Dynamic Prompt Role Setting**: Users can define the role of the AI agent, tailoring its behavior and responses to match the session's goals.
- **Real-time Collaboration**: Participants can collaborate efficiently through video and chat, with real-time communication and updates.
- **Creative Assistance**: AI agents help overcome creative blocks by suggesting new ideas and keeping discussions focused.

---

## 🧰 Tech Stack

- **Frontend**: React.js
- **Backend**: Django
- **Real-time Communication**: WebRTC for video and WebSockets for messaging
- **Database**: SQLite (default for Django, can be switched to PostgreSQL or MySQL)
- **AI Integration**: Custom AI agents (integrated via Python scripts or external APIs)
- **Authentication**: Django Rest Framework with JWT for secure user authentication

---

## 📁 Project Structure

```
BrainstorMate-AIPoweredBrainstormingApp/
├── backend/                  # Django backend (shared by both frontends)
│   ├── manage.py
│   ├── backend/              # Django project settings
│   │   ├── settings.py
│   │   ├── asgi.py           # Channels ASGI config
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── video_api/            # Django REST API + WebSocket consumer
│       ├── models.py
│       ├── views.py
│       ├── consumers.py      # Channels WebSocket handler
│       ├── routing.py        # WebSocket routes
│       ├── ai_utils.py       # AI feedback generation
│       └── ...
├── web_frontend/             # React web application
│   ├── public/
│   ├── src/
│   │   ├── components/       # React components (VideoRoom, Chat, etc.)
│   │   └── ...
│   └── package.json
├── expo_frontend/            # React Native mobile app
│   ├── src/
│   │   ├── screens/          # Mobile screens (VideoRoom, Chat, etc.)
│   │   ├── services/         # API client (api.js)
│   │   └── ...
│   └── package.json
├── requirements.txt          # Python dependencies
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14+)
- **Python** (v3.8+)
- **pip** (Python package manager)

### 1. Backend Setup

```bash
# (Windows) Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Navigate to backend directory
cd backend

# Run database migrations (creates db.sqlite3)
python manage.py migrate

# Start backend with one unified port for REST + WebSocket (recommended)
daphne -p 8000 -b 0.0.0.0 backend.asgi:application

# Optional: Django development server (HTTP-focused local debugging)
python manage.py runserver 8000
```

**Notes**: 
- The virtual environment (`venv/`) is created at the project root
- Activate it **before** running any Python commands
- The database `db.sqlite3` is created automatically in the `backend/` folder after running migrations
- If you delete it, running migrations again will recreate it with fresh schema
- To deactivate the virtual environment later, run `deactivate`

---

### 2. Web Frontend Setup

```bash
# Navigate to web frontend
cd web_frontend

# Install dependencies
npm install --legacy-peer-deps

# Install icon package (if not already installed)
npm install react-icons --save --legacy-peer-deps

# Start development server (runs on http://localhost:3000)
# Optional: set REACT_APP_API_BASE_URL for local LAN/ngrok backend access
# Example: set REACT_APP_API_BASE_URL=http://localhost:8000/api
# Example: set REACT_APP_API_BASE_URL=https://your-ngrok-url.ngrok-free.app/api
npm start
```

**Browser Usage**: 
- Open http://localhost:3000
- The app reads `REACT_APP_API_BASE_URL` from the environment; if it is not set, it defaults to `http://localhost:8000/api`
- The WebSocket URL is derived from the same backend base automatically

---

### 3. Expo Mobile App Setup

```bash
# Navigate to expo frontend
cd expo_frontend

# Install dependencies
npm install --legacy-peer-deps

# (Optional) Install Expo CLI globally
npm install -g expo-cli

# Start Expo development server
npx expo start --tunnel
```

**Configuration for Expo**:
- Set `EXPO_PUBLIC_API_BASE_URL` before starting Expo, for example:
   - **Local development**: `http://localhost:8000/api`
   - **Remote/ngrok**: `https://your-ngrok-url.ngrok-free.app/api`
   - **LAN device**: `http://192.168.x.y:8000/api`
- The Expo app reads that value in `expo_frontend/src/services/api.js`
- The WebSocket URL is automatically constructed from the same API base URL
- Use `npx expo start --tunnel` to expose your dev server for testing on physical devices

---

## 🔗 Connecting Multiple Clients Locally

To run web and mobile clients simultaneously:

1. **Backend**: Run one server on `localhost:8000` (Daphne recommended)
2. **Web Frontend**: Run on `localhost:3000` and set `REACT_APP_API_BASE_URL` if the backend is not on the same machine
3. **Expo**: 
   - Update `EXPO_PUBLIC_API_BASE_URL` to point to your backend
   - Use ngrok or LAN IP if testing on a physical device

---

## 🔧 For Remote Testing (e.g., exposing via ngrok)

1. **Install ngrok**: [Download](https://dashboard.ngrok.com/get-started/setup/windows)
2. **Expose backend**:
   ```bash
   ngrok http 8000
   ```
3. **Update Expo config**:
   - Set `EXPO_PUBLIC_API_BASE_URL` to the ngrok URL
   - Example: `https://abc-123-xyz.ngrok-free.app/api`
4. **Start all services**: Backend, web frontend, and Expo

---

## ✨ Key Features

- **Shared Backend**: Both web and mobile apps use the same Django API and WebSocket server
- **Real-time Communication**: WebRTC for video + WebSockets for messaging
- **AI Agents**: Customizable AI partners with role-based feedback (Designer, Engineer, Finance, Professor)
- **Cross-platform**: Web (React) and Mobile (React Native/Expo) clients targeting same backend

---

## 📱 Expo Notes

- The Expo app structure mirrors the web app but uses React Native components
- WebSocket and signaling logic is identical to the web client
- Full video conferencing support is implemented using `react-native-webrtc`
- Ensure network connectivity between Expo device and backend server (same LAN or ngrok tunnel) 


---
Copyright © 2025 by 1ching & xup6sophia. All rights reserved.
