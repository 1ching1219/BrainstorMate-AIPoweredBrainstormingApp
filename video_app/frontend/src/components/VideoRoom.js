import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Peer from 'simple-peer';
import axios from 'axios';
import Chat from './Chat';

const VideoRoomContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  position: relative;
`;

const Header = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
`;

const RoomTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

// AI Feedback Section
const FeedbackSection = styled.div`
  height: 50%; /* Increased from 40% to 50% */
  overflow-y: auto;
  padding: 16px;
  background-color: #fff;
  border-bottom: 2px solid #2a70e0; // Added visible divider
`;

const FeedbackHeader = styled.h3`
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2a70e0;
`;

const FeedbackItem = styled.div`
  display: flex;
  margin-bottom: 16px;
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: #e0e0e0;
  margin-right: 12px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const FeedbackContent = styled.div`
  flex: 1;
`;

const AgentName = styled.div`
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
`;

const FeedbackText = styled.div`
  font-size: 14px;
`;

// Human Video Section
const VideoSection = styled.div`
  height: 50%; 
  background-color: #f5f5f5;
  position: relative;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;



const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 16px;
  flex: 1;
  position: relative;
`;

const VideoContainer = styled.div`
  position: relative;
  aspect-ratio: 4/3;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ParticipantVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ParticipantName = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
`;

// Navigation buttons for pagination
const PaginationControls = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 10px;
`;

const PageButton = styled.button`
  background-color: ${props => props.active ? '#2a70e0' : '#f0f0f0'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  margin: 0 5px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    background-color: ${props => props.active ? '#2a70e0' : '#d9d9d9'};
  }
`;

const NavButton = styled.button`
  background-color: #f0f0f0;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  margin: 0 5px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    background-color: #d9d9d9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Self video container
const SelfVideoContainer = styled.div`
  position: absolute;
  bottom: 70px; // Position above control bar
  right: 10px;
  width: 180px; // Smaller size
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4/3;
  background-color: #000;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: ${props => props.visible ? 'block' : 'none'}; // Hide when video is off
`;

const ControlBar = styled.div`
  display: flex;
  justify-content: center;
  padding: 16px;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
`;

const ControlButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  margin: 0 8px;
  background-color: ${props => props.danger ? '#ff4d4f' : '#f0f0f0'};
  color: ${props => props.danger ? 'white' : 'black'};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: ${props => props.danger ? '#ff7875' : '#d9d9d9'};
  }
`;

const ChatButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: #f0f0f0;
  border: none;
  cursor: pointer;
  margin-right: 16px;
  
  &:hover {
    background-color: #d9d9d9;
  }
`;

const VideoRoom = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [aiPartners, setAiPartners] = useState(location.state?.aiPartners || []);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'You');
  const [peers, setPeers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [aiFeedback, setAiFeedback] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const participantsPerPage = 4;
  
  const userVideo = useRef();
  const peersRef = useRef([]);
  const socketRef = useRef();
  const streamRef = useRef();
  
  // Put current user first, then other participants
  const humanParticipants = [{ id: userName, isCurrentUser: true }, ...peers];
  const totalPages = Math.ceil(humanParticipants.length / participantsPerPage);
  
  // Get current participants for the page
  const indexOfLastParticipant = currentPage * participantsPerPage;
  const indexOfFirstParticipant = indexOfLastParticipant - participantsPerPage;
  const currentParticipants = humanParticipants.slice(indexOfFirstParticipant, indexOfLastParticipant);
  
  // useEffect(() => {
  //   // Connect to the WebSocket
  //   socketRef.current = new WebSocket(`ws://localhost:8002/ws/chat/${roomId}/`);
    
  //   // Get user media and set up connections
  //   navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  //     .then(stream => {
  //       streamRef.current = stream;
  //       if (userVideo.current) {
  //         userVideo.current.srcObject = stream;
  //       }
        
  //       // Join room
  //       joinRoom();
        
  //       // Set up WebSocket handlers
  //       setupWebSocket();
        
  //       // Get participants and messages
  //       fetchParticipants();
  //       fetchMessages();
        
  //       // Generate AI feedback
  //       if (aiPartners.length > 0) {
  //         generateAIFeedback();
  //       }
  //     })
  //     .catch(error => {
  //       console.error("Error accessing media devices:", error);
  //       alert("Could not access camera or microphone. Please check permissions.");
  //     });
    
  //   return () => {
  //     // Clean up
  //     if (streamRef.current) {
  //       streamRef.current.getTracks().forEach(track => track.stop());
  //     }
  //     if (socketRef.current) {
  //       socketRef.current.close();
  //     }
  //     peersRef.current.forEach(peer => {
  //       if (peer.peer) {
  //         peer.peer.destroy();
  //       }
  //     });
  //   };
  // }, [roomId, aiPartners]);
  useEffect(() => {
    // Connect to the WebSocket
    socketRef.current = new WebSocket(`ws://localhost:8002/ws/chat/${roomId}/`);
  
    // Get user media and set up connections
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
  
        // Join room
        joinRoom();
  
        // Set up WebSocket handlers
        setupWebSocket();
  
        // Get participants and messages
        fetchParticipants();
        fetchMessages();
      })
      .catch(error => {
        console.error("Error accessing media devices:", error);
        alert("Could not access camera or microphone. Please check permissions.");
      });
  
    return () => {
      // Clean up
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
      peersRef.current.forEach(peer => {
        if (peer.peer) {
          peer.peer.destroy();
        }
      });
    };
  }, [roomId]); // ✅ 這裡只依賴 roomId
  
  useEffect(() => {
    if (aiPartners.length > 0) {
      // 加個延遲，避免頻繁觸發
      const timeout = setTimeout(() => {
        generateAIFeedback();
      }, 5000); // 5秒後才出現AI feedback
  
      return () => clearTimeout(timeout);
    }
  }, [aiPartners]); // ✅ 這裡只依賴 aiPartners
  
  
  const joinRoom = async () => {
    try {
      // Register participant in the room
      await axios.post(`/api/rooms/${roomId}/join/`, {
        name: userName,
        is_ai: false
      });
      
      // Register AI partners in the room
      for (const agent of aiPartners) {
        await axios.post(`/api/rooms/${roomId}/join/`, {
          name: agent.name,
          is_ai: true,
          ai_agent: agent.id
        });
      }
    } catch (error) {
      console.error("Error joining room:", error);
    }
  };
  
  const setupWebSocket = () => {
    socketRef.current.onopen = () => {
      console.log("WebSocket connection established");
      
      // Signal to other participants that we've joined
      socketRef.current.send(JSON.stringify({
        type: 'signal',
        signal: { type: 'new-participant' },
        caller_id: userName
      }));
    };
    
    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message') {
        setMessages(prevMessages => [...prevMessages, {
          sender: data.sender,
          content: data.message,
          is_ai: data.is_ai
        }]);
        
        // If AI message contains feedback, add it to feedback section
        if (data.is_ai && data.message_type === 'feedback') {
          setAiFeedback(prev => [...prev, {
            agent: data.sender,
            content: data.message
          }]);
        }
      } else if (data.type === 'signal') {
        handleSignal(data);
      }
    };
    
    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    socketRef.current.onclose = () => {
      console.log("WebSocket connection closed");
    };
  };
  
  const handleSignal = (data) => {
    const { signal, caller_id, receiver_id } = data;
    
    // If signal is for a new participant
    if (signal.type === 'new-participant' && caller_id !== userName) {
      const peer = createPeer(caller_id);
      
      peersRef.current.push({
        peerId: caller_id,
        peer: peer
      });
      
      socketRef.current.send(JSON.stringify({
        type: 'signal',
        signal: { type: 'participant-ready' },
        caller_id: userName,
        receiver_id: caller_id
      }));
    }
    
    // If signal is from a participant who is ready to connect
    else if (signal.type === 'participant-ready' && receiver_id === userName) {
      const peer = addPeer(caller_id, signal);
      
      peersRef.current.push({
        peerId: caller_id,
        peer: peer
      });
    }
    
    // Handle WebRTC signaling
    else if (signal.sdp || signal.candidate) {
      const item = peersRef.current.find(p => p.peerId === caller_id);
      if (item) {
        item.peer.signal(signal);
      }
    }
  };
  
  const createPeer = (participantId) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: streamRef.current
    });
    
    peer.on('signal', signal => {
      socketRef.current.send(JSON.stringify({
        type: 'signal',
        signal: signal,
        caller_id: userName,
        receiver_id: participantId
      }));
    });
    
    peer.on('stream', stream => {
      setPeers(users => [...users, {
        id: participantId,
        stream: stream
      }]);
    });
    
    return peer;
  };
  
  const addPeer = (participantId, incomingSignal) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: streamRef.current
    });
    
    peer.on('signal', signal => {
      socketRef.current.send(JSON.stringify({
        type: 'signal',
        signal: signal,
        caller_id: userName,
        receiver_id: participantId
      }));
    });
    
    peer.on('stream', stream => {
      setPeers(users => [...users, {
        id: participantId,
        stream: stream
      }]);
    });
    
    peer.signal(incomingSignal);
    
    return peer;
  };
  
  const fetchParticipants = async () => {
    try {
      const response = await axios.get(`/api/rooms/${roomId}/participants/`);
      setParticipants(response.data);
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  };
  
  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/api/rooms/${roomId}/messages/`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };
  
  const generateAIFeedback = () => {
    // Simulated AI feedback for demonstration
    // In a real application, this would come from an AI service
    const initialFeedback = aiPartners.map(agent => ({
      agent: agent.name,
      content: `Hello, I'm ${agent.name}, your ${agent.role} AI assistant. I'm here to help with the meeting.`
    }));
    
    setAiFeedback(initialFeedback);
    
    // Simulate AI sending periodic feedback
    const feedbackInterval = setInterval(() => {
      const randomAgent = aiPartners[Math.floor(Math.random() * aiPartners.length)];
      if (randomAgent) {
        const feedback = {
          agent: randomAgent.name,
          content: generateRandomFeedback(randomAgent.role)
        };
        
        setAiFeedback(prev => [...prev, feedback]);
        
        // Also send to chat
        if (socketRef.current) {

          if (socketRef.current.readyState === WebSocket.OPEN) {
            
            try {
              socketRef.current.send(JSON.stringify({
                type: 'message',
                message: feedback.content,
                sender: feedback.agent,
                is_ai: true,
                message_type: 'feedback'
              }));
            } catch (error) {
              console.log('error')
              console.log("Error sending message:", error);
              // Optionally try to reconnect or handle the failure
            }
          } else {
            console.log('error')
            console.log("WebSocket is not open. ReadyState:", socketRef.current.readyState);
            // Optionally handle reconnect logic here
          }
        }
        
      }
    }, 15000); // Every 15 seconds
    
    return () => clearInterval(feedbackInterval);
  };
  
  const generateRandomFeedback = (role) => {
    const feedbackOptions = {
      'Designer': [
        "I notice the UI elements could be more consistent. Consider a unified color scheme.",
        "The user flow seems to have some friction points. We should simplify the navigation.",
        "Visual hierarchy could be improved to guide users more effectively.",
        "Have you considered accessibility in this design? Some elements may need better contrast."
      ],
      'Engineer': [
        "The current architecture might have scaling issues with high user loads.",
        "We should consider optimizing the database queries for better performance.",
        "This would be a good opportunity to implement caching to reduce server load.",
        "The current solution works, but we might want to refactor for better maintainability."
      ],
      'Finance': [
        "Based on our projections, we should allocate more resources to marketing.",
        "The ROI on this feature seems promising based on current metrics.",
        "We need to consider the cost implications of this infrastructure change.",
        "From a financial perspective, we should prioritize features with higher revenue potential."
      ],
      'Professor': [
        "This approach aligns with recent research in the field.",
        "Consider the theoretical implications of this decision framework.",
        "We should examine some case studies that have implemented similar solutions.",
        "The methodology needs more rigorous validation before proceeding."
      ]
    };
    
    const options = feedbackOptions[role] || ["I have some insights to share about this discussion."];
    return options[Math.floor(Math.random() * options.length)];
  };
  
  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };
  
  const toggleAudio = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };
  
  const leaveRoom = () => {
    navigate('/'); // Navigate to home page
  };
  
  const sendMessage = (message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        message: message,
        sender: userName,
        is_ai: false
      }));
    }
  };

  // Pagination controls
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  return (
    <VideoRoomContainer>
      <Header>
        <RoomTitle>Room {roomId}</RoomTitle>
      </Header>
      
      <ContentContainer>
        {/* AI Feedback Section */}
        <FeedbackSection>
          <FeedbackHeader>AI Partner Feedback</FeedbackHeader>
          {aiFeedback.map((feedback, index) => (
            <FeedbackItem key={`feedback-${index}`}>
              <Avatar>
                <img 
                  src={`/img/${feedback.agent.toLowerCase()}.png`} 
                  alt={feedback.agent} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                />
              </Avatar>
              <FeedbackContent>
                <AgentName>{feedback.agent}</AgentName>
                <FeedbackText>{feedback.content}</FeedbackText>
              </FeedbackContent>
            </FeedbackItem>
          ))}
        </FeedbackSection>
        
        {/* Human Video Section */}
        <VideoSection>
          
          <VideoGrid>
            {currentParticipants.map((participant, index) => (
              participant.isCurrentUser ? (
                // Current user's video (always in top-left)
                <VideoContainer key={`user-${participant.id}`}>
                  {videoEnabled ? (
                    <ParticipantVideo 
                      ref={userVideo} 
                      autoPlay 
                      playsInline 
                      muted
                    />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      backgroundColor: '#333',
                      color: 'white',
                      fontSize: '24px',
                      fontWeight: 'bold'
                    }}>
                      {participant.id.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <ParticipantName>{participant.id} (You)</ParticipantName>
                </VideoContainer>
              ) : (
                // Peer videos
                <VideoContainer key={`peer-${participant.id}`}>
                  <ParticipantVideo
                    autoPlay
                    playsInline
                    ref={(element) => {
                      if (element && participant.stream) {
                        element.srcObject = participant.stream;
                      }
                    }}
                  />
                  <ParticipantName>{participant.id}</ParticipantName>
                </VideoContainer>
              )
            ))}

            {/* Fill empty slots with placeholders if fewer than 4 participants */}
            {Array.from({ length: Math.max(0, participantsPerPage - currentParticipants.length) }).map((_, index) => (
              <VideoContainer key={`empty-${index}`} style={{ backgroundColor: '#f0f0f0' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  color: '#999' 
                }}>
                  Empty Slot
                </div>
              </VideoContainer>
            ))}
          </VideoGrid>
          
          {/* Pagination controls - only show if totalPages > 1 */}
          {totalPages > 1 && (
            <PaginationControls>
              <NavButton onClick={prevPage} disabled={currentPage === 1}>
                &lt;
              </NavButton>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <PageButton 
                  key={`page-${pageNum}`} 
                  active={pageNum === currentPage}
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </PageButton>
              ))}
              
              <NavButton onClick={nextPage} disabled={currentPage === totalPages}>
                &gt;
              </NavButton>
            </PaginationControls>
          )}
          
          {/* Removed the floating SelfVideo container as we're showing the user in the grid */}
        </VideoSection>
      </ContentContainer>
      
      <ControlBar>
        <ChatButton onClick={() => setShowChat(!showChat)}>
          <span role="img" aria-label="chat">💬</span>
        </ChatButton>
        
        <ControlButton onClick={toggleAudio}>
          <span role="img" aria-label="microphone">
            {audioEnabled ? '🎙️' : '🔇'}
          </span>
        </ControlButton>
        
        <ControlButton onClick={toggleVideo}>
          <span role="img" aria-label="camera">
            {videoEnabled ? '📹' : '🚫'}
          </span>
        </ControlButton>
        
        <ControlButton danger onClick={leaveRoom}>
          <span role="img" aria-label="hang up">❌</span>
        </ControlButton>
      </ControlBar>
      
      {showChat && (
        <Chat 
          messages={messages} 
          onSendMessage={sendMessage} 
          onClose={() => setShowChat(false)}
          roomId={roomId}
          socket={socketRef.current}
        />
      )}
    </VideoRoomContainer>
  );
};

export default VideoRoom;