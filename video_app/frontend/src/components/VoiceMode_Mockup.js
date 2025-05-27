import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiMic, FiMicOff, FiX } from 'react-icons/fi';

// Styled components matching your original code
const VoiceModeContainer = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '100%',
  backgroundColor: '#2c2f33',
  color: 'white',
  overflow: 'hidden'
};

const Header = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 'clamp(12px, 3vw, 20px)',
  borderBottom: '1px solid #4f545c',
  minHeight: '50px',
  backgroundColor: '#23272a'
};

const RoomTitle = {
  margin: 0,
  fontSize: 'clamp(16px, 4vw, 22px)',
  fontWeight: 600
};

const SpeakerArea = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  gap: '20px'
};

const SpeakerAvatar = {
  width: 'clamp(100px, 20vw, 150px)',
  height: 'clamp(100px, 20vw, 150px)',
  borderRadius: '50%',
  backgroundColor: '#7289da',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
  border: '3px solid white',
  boxShadow: '0 0 15px rgba(255, 255, 255, 0.3)'
};

const SpeakerName = {
  fontSize: 'clamp(18px, 4vw, 24px)',
  fontWeight: 500,
  margin: 0,
  textAlign: 'center'
};

const ParticipantsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
  gap: '12px',
  padding: '20px',
  backgroundColor: '#2f3136',
  flexShrink: 0,
  maxHeight: '300px',
  overflowY: 'auto'
};

const ControlsArea = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 'clamp(15px, 3vw, 25px)',
  gap: 'clamp(15px, 8vw, 100px)',
  backgroundColor: '#23272a',
  borderTop: '1px solid #4f545c'
};

const VoiceMode_Mockup = () => {
  const roomId = "Q4ZLSQRV";
  const userName = "You";
  const humanPartnerB = "B";
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [currentSpeaker, setCurrentSpeaker] = useState({ name: userName, avatarImg: null });
  
  const aiPartners = [
    { name: 'Designer', avatarImg: '../../img/designer.png', role: 'Designer' },
    { name: 'Engineer', avatarImg: '../../img/engineer.png', role: 'Engineer' },
    { name: 'Marketing', avatarImg: '../../img/finance.png', role: 'Marketing' }
  ];
  
  const participants = [
    { name: userName, avatarImg: null }, // User A
    { name: humanPartnerB, avatarImg: null }, // Human partner B
    ...aiPartners.map(p => ({ name: p.name, avatarImg: p.avatarImg }))
  ];

  const speakerIntervalRef = useRef(null);

  useEffect(() => {
    if (participants.length > 0) {
      speakerIntervalRef.current = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * participants.length);
        setCurrentSpeaker(participants[randomIndex]);
      }, 3000);
    }

    return () => {
      if (speakerIntervalRef.current) {
        clearInterval(speakerIntervalRef.current);
      }
    };
  }, []);

  const toggleMic = () => {
    setIsMicOn(prev => !prev);
  };

  const navigateToChat = () => {
    alert('Navigate to chat mode');
  };

  return (
    <div style={VoiceModeContainer}>
      {/* Header */}
      <div style={Header}>
        <h2 style={RoomTitle}>Room {roomId} - Voice Mode</h2>
      </div>

      {/* Speaker Area */}
      <div style={SpeakerArea}>
        <div style={SpeakerAvatar}>
          {currentSpeaker.avatarImg ? (
            <img 
              src={currentSpeaker.avatarImg} 
              alt={currentSpeaker.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 'clamp(40px, 10vw, 60px)', fontWeight: 'bold', color: 'white' }}>
              {currentSpeaker.name?.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <p style={SpeakerName}>{currentSpeaker.name}</p>
      </div>

      {/* Participants Grid */}
      <div style={ParticipantsGrid}>
        {participants.map(p => {
          const isActive = p.name === currentSpeaker.name;
          return (
            <div 
              key={p.name} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontSize: '10px',
                color: 'white',
                opacity: isActive ? 1 : 0.6
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#7289da',
                overflow: 'hidden',
                border: isActive ? '2px solid white' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {p.avatarImg ? (
                  <img 
                    src={p.avatarImg} 
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '14px', color: 'white' }}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span style={{ marginTop: '4px' }}>{p.name}</span>
            </div>
          );
        })}
      </div>

      {/* Controls Area */}
      <div style={ControlsArea}>
        <button
          onClick={toggleMic}
          style={{
            width: 'clamp(50px, 12vw, 70px)',
            height: 'clamp(50px, 12vw, 70px)',
            borderRadius: '50%',
            backgroundColor: '#6c6d70',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'clamp(20px, 5vw, 28px)',
            transition: 'background-color 0.2s ease-in-out'
          }}
          onMouseEnter={(e) => e.target.style.filter = 'brightness(1.2)'}
          onMouseLeave={(e) => e.target.style.filter = 'brightness(1)'}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicOn ? <FiMic size={28} /> : <FiMicOff size={28} />}
        </button>
        <button
          onClick={navigateToChat}
          style={{
            width: 'clamp(50px, 12vw, 70px)',
            height: 'clamp(50px, 12vw, 70px)',
            borderRadius: '50%',
            backgroundColor: '#6c6d70',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'clamp(20px, 5vw, 28px)',
            transition: 'background-color 0.2s ease-in-out'
          }}
          onMouseEnter={(e) => e.target.style.filter = 'brightness(1.2)'}
          onMouseLeave={(e) => e.target.style.filter = 'brightness(1)'}
          aria-label="Open chat mode"
        >
          <FiX size={28} />
        </button>
      </div>
    </div>
  );
};

export default VoiceMode_Mockup;