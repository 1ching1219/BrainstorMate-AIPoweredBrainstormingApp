import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiMic, FiMicOff, FiX, FiVideo, FiVideoOff } from 'react-icons/fi';
import { API_ORIGIN } from '../services/api';

const VoiceModeContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: #2c2f33;
  color: white;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: clamp(12px, 3vw, 20px);
  border-bottom: 1px solid #4f545c;
  min-height: 50px;
  background-color: #23272a;
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
  gap: 12px;
`;

const SpeakerAvatar = styled.div`
  width: clamp(100px, 20vw, 150px);
  height: clamp(100px, 20vw, 150px);
  border-radius: 50%;
  background-color: #7289da;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border: 3px solid ${props => props.$speaking ? '#43b581' : 'white'};
  box-shadow: 0 0 ${props => props.$speaking ? '22px rgba(67, 181, 129, 0.65)' : '15px rgba(255, 255, 255, 0.3)'};
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  span {
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

const SpeakingIndicator = styled.div`
  font-size: 12px;
  color: #43b581;
  text-align: center;
  min-height: 18px;
`;

/* Live transcript shown while in voice mode */
const TranscriptPanel = styled.div`
  background: rgba(0, 0, 0, 0.35);
  border-radius: 10px;
  padding: 10px 16px;
  margin: 0 20px 12px;
  max-height: 90px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.6;
  color: #ccc;
`;

const InterimText = styled.span`
  color: #888;
  font-style: italic;
`;

const TranscriptHint = styled.p`
  color: #666;
  font-style: italic;
  margin: 0;
  font-size: 12px;
`;

/* PIP camera preview */
const LocalVideo = styled.video`
  position: fixed;
  bottom: 110px;
  right: 20px;
  width: 150px;
  height: 112px;
  border-radius: 10px;
  object-fit: cover;
  border: 2px solid #7289da;
  background: #000;
  z-index: 10;
  transform: scaleX(-1); /* mirror */
`;

const ParticipantsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
  padding: 20px;
  background-color: #2f3136;
  flex-shrink: 0;
  max-height: 300px;
  overflow-y: auto;

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
  gap: clamp(15px, 8vw, 80px);
  background-color: #23272a;
  border-top: 1px solid #4f545c;
`;

const ControlButton = styled.button`
  width: clamp(50px, 12vw, 70px);
  height: clamp(50px, 12vw, 70px);
  border-radius: 50%;
  background-color: ${props => (props.danger ? '#f04747' : '#6c6d70')};
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(20px, 5vw, 28px);
  transition: background-color 0.2s ease-in-out, filter 0.2s;

  &:hover {
    filter: brightness(1.2);
  }
`;

const ALL_PARTICIPANTS_PLACEHOLDER = [
  { name: 'Designer', avatarImg: `${API_ORIGIN}/media/avatars/designer.png`, isUser: false },
  { name: 'Engineer', avatarImg: `${API_ORIGIN}/media/avatars/engineer.png`, isUser: false },
  { name: 'Finance',  avatarImg: `${API_ORIGIN}/media/avatars/finance.png`,  isUser: false },
  { name: 'Professor', avatarImg: `${API_ORIGIN}/media/avatars/professor.png`, isUser: false },
];

const VoiceMode = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState({ name: 'Voice', avatarImg: null, isUser: false });
  const [participants, setParticipants] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [displayTranscript, setDisplayTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [hasRecognitionSupport, setHasRecognitionSupport] = useState(true);

  // Refs — mutated without triggering re-renders
  const speakerIntervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');   // authoritative value passed to ChatRoom
  const audioStreamRef = useRef(null);
  const videoStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const aiParticipantsRef = useRef([]);
  const userParticipantRef = useRef(null);
  const isMicOnRef = useRef(true);    // sync ref so recognition.onend can read current value

  // ── AI rotation helpers ──────────────────────────────────────────────────

  const stopAiRotation = useCallback(() => {
    if (speakerIntervalRef.current) {
      clearInterval(speakerIntervalRef.current);
      speakerIntervalRef.current = null;
    }
  }, []);

  const startAiRotation = useCallback(() => {
    stopAiRotation();
    const aiList = aiParticipantsRef.current;
    if (aiList.length === 0) return;
    speakerIntervalRef.current = setInterval(() => {
      const idx = Math.floor(Math.random() * aiList.length);
      setCurrentSpeaker(aiList[idx]);
    }, 3000);
  }, [stopAiRotation]);

  // ── Build participant list ───────────────────────────────────────────────

  useEffect(() => {
    const userName = localStorage.getItem('username') || 'You';
    const passedAiPartners = location.state?.aiPartners || [];

    const userParticipant = { name: userName, avatarImg: null, isUser: true };
    userParticipantRef.current = userParticipant;

    let aiList = passedAiPartners.map(p => ({
      name: p.name,
      avatarImg: `${API_ORIGIN}/media/avatars/${p.name.toLowerCase()}.png`,
      isUser: false,
    }));

    if (aiList.length === 0) {
      aiList = ALL_PARTICIPANTS_PLACEHOLDER;
    }
    aiParticipantsRef.current = aiList;

    setParticipants([userParticipant, ...aiList]);
    // Start with a random AI highlighted as speaker
    setCurrentSpeaker(aiList[Math.floor(Math.random() * aiList.length)]);
  }, [location.state]);

  // ── Start AI rotation once participants are ready ────────────────────────

  useEffect(() => {
    if (participants.length > 0) startAiRotation();
    return stopAiRotation;
  }, [participants, startAiRotation, stopAiRotation]);

  // ── Real microphone access ───────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
      } catch (err) {
        console.warn('Mic access denied or unavailable:', err);
        setIsMicOn(false);
        isMicOnRef.current = false;
      }
    })();

    return () => {
      audioStreamRef.current?.getTracks().forEach(t => t.stop());
      videoStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Browser speech recognition (auto-transcription) ──────────────────────

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasRecognitionSupport(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onspeechstart = () => {
      setIsSpeaking(true);
      stopAiRotation();
      if (userParticipantRef.current) {
        setCurrentSpeaker(userParticipantRef.current);
      }
    };

    recognition.onspeechend = () => {
      setIsSpeaking(false);
      setLiveTranscript('');
      startAiRotation();
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          const text = res[0].transcript;
          transcriptRef.current += text + ' ';
          setDisplayTranscript(prev => prev + text + ' ');
        } else {
          interim += res[0].transcript;
        }
      }
      setLiveTranscript(interim);
    };

    // Chrome stops recognition after a pause — restart while mic is on
    recognition.onend = () => {
      if (isMicOnRef.current) {
        try { recognition.start(); } catch (_) { /* already running */ }
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('Speech recognition error:', e.error);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { console.warn(e); }

    return () => {
      recognition.onend = null; // prevent auto-restart during cleanup
      try { recognition.stop(); } catch (_) {}
    };
  }, [startAiRotation, stopAiRotation]);

  // ── Controls ─────────────────────────────────────────────────────────────

  const toggleMic = () => {
    const next = !isMicOn;
    isMicOnRef.current = next;
    setIsMicOn(next);

    // Enable/disable the real audio track
    audioStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = next; });

    if (recognitionRef.current) {
      if (next) {
        try { recognitionRef.current.start(); } catch (_) {}
      } else {
        try { recognitionRef.current.stop(); } catch (_) {}
        setIsSpeaking(false);
        setLiveTranscript('');
        startAiRotation();
      }
    }
  };

  const toggleCamera = async () => {
    const next = !isCameraOn;
    setIsCameraOn(next);

    if (next) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera access denied:', err);
        setIsCameraOn(false);
      }
    } else {
      videoStreamRef.current?.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    }
  };

  // Stop everything and carry the transcript back to ChatRoom via router state
  const navigateToChat = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    videoStreamRef.current?.getTracks().forEach(t => t.stop());
    stopAiRotation();

    navigate(`/room/${roomId}`, {
      state: {
        ...location.state,
        voiceTranscript: transcriptRef.current.trim() || null,
      },
    });
  };

  const isUserSpeaker = isSpeaking && currentSpeaker?.isUser;

  return (
    <VoiceModeContainer>
      <Header>
        <RoomTitle>Room {roomId} — Voice Mode</RoomTitle>
      </Header>

      <SpeakerArea>
        <SpeakerAvatar $speaking={isUserSpeaker}>
          {currentSpeaker.avatarImg ? (
            <img src={currentSpeaker.avatarImg} alt={currentSpeaker.name} />
          ) : (
            <span>{currentSpeaker.name?.charAt(0).toUpperCase()}</span>
          )}
        </SpeakerAvatar>
        <SpeakerName>{currentSpeaker.name}</SpeakerName>
        <SpeakingIndicator>{isSpeaking ? '● Speaking' : ''}</SpeakingIndicator>
      </SpeakerArea>

      {/* Live transcript panel */}
      <TranscriptPanel>
        {displayTranscript || liveTranscript ? (
          <>
            {displayTranscript}
            <InterimText>{liveTranscript}</InterimText>
          </>
        ) : (
          <TranscriptHint>
            {hasRecognitionSupport
              ? 'Start speaking — your words will be sent to chat when you return'
              : 'Speech recognition not supported in this browser (try Chrome)'}
          </TranscriptHint>
        )}
      </TranscriptPanel>

      <ParticipantsGrid>
        {participants.map(p => {
          const isActive = p.name === currentSpeaker.name;
          return (
            <Participant key={p.name} active={isActive}>
              <ParticipantAvatar active={isActive}>
                {p.avatarImg
                  ? <img src={p.avatarImg} alt={p.name} />
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
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicOn ? <FiMic /> : <FiMicOff />}
        </ControlButton>

        <ControlButton
          onClick={toggleCamera}
          aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraOn ? <FiVideo /> : <FiVideoOff />}
        </ControlButton>

        <ControlButton onClick={navigateToChat} aria-label="Back to chat">
          <FiX />
        </ControlButton>
      </ControlsArea>

      {/* PIP local video preview (mirrored) */}
      {isCameraOn && (
        <LocalVideo ref={localVideoRef} autoPlay muted playsInline />
      )}
    </VoiceModeContainer>
  );
};

export default VoiceMode;
