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

## Enviroment Setup
1. Download nodejs

2. Run the commands 
```bash
pip install -r requirements.txt
cd frontend
npm install --legacy-peer-deps
# To download icon package
npm install react-icons --save --legacy-peer-deps
```
---
## Expo
- Simply put, our original implementation is using React.js (WebBased); but Expo needs React Native Framework(AppBased), so restructured and re-coded the expo-frontend
- Is at Expo-testing branch 
- VideoConferencing not implemented yet.
- [Guide](https://docs.expo.dev/more/expo-cli/)
```bash
cd expo_frontend
npm install --legacy-peer-deps
# To run
npx expo start --tunnel
```
To connect with the db, use ngrok to listen
and place ngrok link at video_app\expo_frontend\src\services\api.js
[ngrok](https://dashboard.ngrok.com/get-started/setup/windows)
also run backend django server
both two port should be the same 


---
Copyright © 2025 by 1ching & xup6sophia. All rights reserved.
