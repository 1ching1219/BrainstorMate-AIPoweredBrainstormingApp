import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiMic, FiMicOff, FiX } from 'react-icons/fi';

const VoiceModeContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: #2c2f33; /* Dark theme for voice mode */
  color: white;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: center; /* Center room title */
  align-items: center;
  padding: clamp(12px, 3vw, 20px);
  border-bottom: 1px solid #4f545c; /* Darker border */
  min-height: 50px;
  background-color: #23272a; /* Slightly darker header */
`;

const RoomTitle = styled.h2`
  margin: 0;
  font-size: clamp(16px, 4vw, 22px);
  font-weight: 600;
`;

const SpeakerArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  gap: 20px;
`;

const SpeakerAvatar = styled.div`
  width: clamp(100px, 20vw, 150px);
  height: clamp(100px, 20vw, 150px);
  border-radius: 50%;
  background-color: #7289da; /* Discord-like blue for placeholder */
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border: 3px solid white; /* Highlight active speaker */
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  span { /* For initial letter */
    font-size: clamp(40px, 10vw, 60px);
    font-weight: bold;
    color: white;
  }
`;

const SpeakerName = styled.p`
  font-size: clamp(18px, 4vw, 24px);
  font-weight: 500;
  margin: 0;
  text-align: center;
`;

// Replace ParticipantsBar with a grid:
const ParticipantsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
  padding: 20px;
  background-color: #2f3136;
  flex-shrink: 0;
  max-height: 300px;
  overflow-y: auto;

  /* two columns on small screens */
  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Participant = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 10px;
  color: white;
  opacity: ${props => (props.active ? 1 : 0.6)};
`;

const ParticipantAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #7289da;
  overflow: hidden;
  border: ${props => (props.active ? '2px solid white' : 'none')};
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  span {
    font-size: 14px;
    color: white;
  }
`;

const ControlsArea = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: clamp(15px, 3vw, 25px);
  gap: clamp(15px, 8vw, 100px);
  background-color: #23272a; /* Match header */
  border-top: 1px solid #4f545c;
`;

const ControlButton = styled.button`
  width: clamp(50px, 12vw, 70px);
  height: clamp(50px, 12vw, 70px);
  border-radius: 50%;
  background-color: ${props => {
    if (props.danger) return '#f04747'; // Red for leave
    if (props.active) return '#6c6d70'; // Green for mic on
    return '#6c6d70'; // Default grey
  }};
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(20px, 5vw, 28px); /* Icon size */
  transition: background-color 0.2s ease-in-out;

  &:hover {
    filter: brightness(1.2);
  }
`;

const ALL_PARTICIPANTS_PLACEHOLDER = [
  { name: 'Designer', avatarImg: '/img/designer.png' },
  { name: 'Engineer', avatarImg: '/img/engineer.png' },
  { name: 'Finance', avatarImg: '/img/finance.png' },
  { name: 'Professor', avatarImg: '/img/professor.png' },
];

const VoiceMode = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // To potentially get aiPartners

  const [isMicOn, setIsMicOn] = useState(true);
  const [currentSpeaker, setCurrentSpeaker] = useState({ name: 'User', avatarImg: null });
  const [participants, setParticipants] = useState([]);

  const speakerIntervalRef = useRef(null);

  useEffect(() => {
    // Combine user and AI partners for speaker rotation
    const userName = localStorage.getItem('username') || 'You';
    const passedAiPartners = location.state?.aiPartners || [];
    
    let allSpeakers = [
      { name: userName, avatarImg: null }, // User can also be a speaker
      ...passedAiPartners.map(p => ({ name: p.name, avatarImg: `/img/${p.name.toLowerCase()}.png` }))
    ];

    if (allSpeakers.length <= 1 && ALL_PARTICIPANTS_PLACEHOLDER.length > 0) { // Fallback if no partners
        allSpeakers = ALL_PARTICIPANTS_PLACEHOLDER;
    }
    if (allSpeakers.length === 0) { // Absolute fallback
        allSpeakers = [{name: "Speaker", avatarImg: null}];
    }

    setParticipants(allSpeakers);

    if (allSpeakers.length > 0) {
      setCurrentSpeaker(allSpeakers[Math.floor(Math.random() * allSpeakers.length)]);
    }
    
  }, [location.state]);


  useEffect(() => {
    if (participants.length > 0) {
      speakerIntervalRef.current = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * participants.length);
        setCurrentSpeaker(participants[randomIndex]);
      }, 3000); // Change speaker every 3 seconds
    }

    return () => {
      if (speakerIntervalRef.current) {
        clearInterval(speakerIntervalRef.current);
      }
    };
  }, [participants]);

  const toggleMic = () => {
    setIsMicOn(prev => !prev);
  };

  const navigateToChat = () => {
    navigate(`/room/${roomId}`, { state: location.state }); // Pass along state like aiPartners
  };

  const navigateToHome = () => {
    navigate('/');
  };

  return (
    <VoiceModeContainer>
      <Header>
        <RoomTitle>Room {roomId} - Voice Mode</RoomTitle>
      </Header>

      <SpeakerArea>
        <SpeakerAvatar>
          {currentSpeaker.avatarImg ? (
            <img src={currentSpeaker.avatarImg} alt={currentSpeaker.name} />
          ) : (
            <span>{currentSpeaker.name?.charAt(0).toUpperCase()}</span>
          )}
        </SpeakerAvatar>
        <SpeakerName>{currentSpeaker.name}</SpeakerName>
      </SpeakerArea>

      {/* ← switch to grid layout: */}
      <ParticipantsGrid>
        {participants.map(p => {
          const isActive = p.name === currentSpeaker.name;
          return (
            <Participant key={p.name} active={isActive}>
              <ParticipantAvatar active={isActive}>
                {p.avatarImg
                  ? <img src={p.avatarImg} alt={p.name}/>
                  : <span>{p.name.charAt(0).toUpperCase()}</span>
                }
              </ParticipantAvatar>
              <span>{p.name}</span>
            </Participant>
          );
        })}
      </ParticipantsGrid>

      <ControlsArea>
        <ControlButton
          onClick={toggleMic}
          active={isMicOn}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicOn ? <FiMic /> : <FiMicOff />}
        </ControlButton>
        <ControlButton onClick={navigateToChat} aria-label="Open chat mode">
          <FiX />
        </ControlButton>
        {/* <ControlButton danger onClick={navigateToHome} aria-label="Leave room">
          <FiX />
        </ControlButton> */}
      </ControlsArea>
    </VoiceModeContainer>
  );
};

export default VoiceMode;