// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import SelectAIPartners from './components/SelectAIPartners';
import VideoRoom from './components/VideoRoom';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import AddAI from './components/AddAI';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/join-room" element={<JoinRoom />} />
        <Route path="/select-partners" element={<SelectAIPartners />} />
        <Route path="/add-ai" element={<AddAI />} />
        <Route path="/room/:roomId" element={<VideoRoom />} />
      </Routes>
    </Router>
  );
}

export default App;