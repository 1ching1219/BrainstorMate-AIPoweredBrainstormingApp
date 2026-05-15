import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { FiMessageSquare, FiX } from "react-icons/fi";
import { RiVoiceprintLine } from "react-icons/ri";
import { RxExit } from "react-icons/rx";

const ChatRoomContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
  background-color: #f9f9f9;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(8px, 2vw, 16px);
  border-bottom: 1px solid #e0e0e0;
  min-height: 48px;
  background-color: white;
`;

const RoomTitle = styled.h2`
  margin: 0;
  font-size: clamp(14px, 4vw, 18px);
  font-weight: 600;
`;

const ControlButton = styled.button`
  width: 42px; /* MODIFIED: Set fixed width */
  height: 42px; /* MODIFIED: Set fixed height */
  border-radius: 50%;
  background-color: ${props => props.danger ? 'white' : '#f0f0f0'};
  color: ${props => props.danger ? 'black' : 'black'};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: ${props => props.danger ? '#ff7875' : '#d9d9d9'};
  }
`;

const ChatSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  overflow: hidden;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const MessageWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: ${props => props.isFromUser ? 'flex-end' : 'flex-start'};
  margin-bottom: 8px;
  gap: 8px; /* MODIFIED: Use a constant gap */
`;

const Message = styled.div`
  padding: 12px 16px;
  border-radius: 15px;
  max-width: 70%;
  word-break: break-word;
  position: relative;
  
  background-color: ${props => {
    if (props.isAi) return '#f0f0f0';
    if (props.isFromUser) return '#dcf8c6';
    return '#e3f2fd';
  }};
`;

const MessageSender = styled.div`
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  color: ${props => props.isAi ? '#4a72d4' : '#666'};
  display: flex;
  align-items: center;
`;

const AvatarSpace = styled.div`
  width: 40px; // AvatarSpace will only be rendered when an avatar is shown
  // No margin-right needed, MessageWrapper's 'gap' will handle spacing
  // No conditional display needed, it's either rendered or not
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #e0e0e0;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const SystemMessage = styled.div`
  padding: 8px 12px;
  text-align: center;
  color: #666;
  font-size: 12px;
  margin: 8px 0;
  background-color: #f9f9f9;
  border-radius: 12px;
  align-self: center;
`;

const InputArea = styled.div`
  display: flex;
  padding: 16px 10px;
  background-color: transparent;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 24px;
  outline: none;
  font-size: 14px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  
  &:focus {
    border-color: #2a70e0;
  }
`;

const SendButton = styled.button`
  margin-left: 10px;
  background-color: ${props => 
    props.isEmptyInputBehavior ? '#363434' : /* Grey for navigate-to-home behavior */
    '#2a70e0' /* Default active blue */
  };
  color: white;
  border: none;
  height: 42px;
  width: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px; /* This was for the '➤' icon, FiBarChart2 will use its size prop */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &:hover {
    background-color: ${props => 
      props.isEmptyInputBehavior ? '#a0a0a0' : /* Darker grey for hover */
      '#1a60d0' /* Default hover blue */
    };
  }
  
  &:disabled { /* This will now primarily be for the !isConnected case */
    background-color: #d3d3d3 !important; /* A slightly different grey to distinguish from isEmptyInputBehavior, ensure override */
    cursor: not-allowed !important;
  }
`;

const StatusIndicator = styled.span`
  height: 8px;
  width: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
  background-color: ${props => props.connected ? 'green' : 'red'};
`;

const ChatRoom = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [aiPartners, setAiPartners] = useState(location.state?.aiPartners || []);
  const [userName, setUserName] = useState(localStorage.getItem('username') || 'You');
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Initialize and handle WebSocket connection
  useEffect(() => {
    if (!roomId) {
      console.log("Invalid roomId");
      return;
    }
    
    // First check if we're already in the room to prevent duplicates
    const checkExistingParticipation = async () => {
      try {
        const response = await axios.get(`/api/rooms/${roomId}/participants/`);
        const participants = response.data;
        
        // Check if current user is already in the room
        const userExists = participants.some(p => p.name === userName);
        
        // Get existing AI participants
        const existingAIs = participants.filter(p => p.is_ai);
        
        if (!userExists) {
          // Only join if we aren't already in the room
          await joinRoom();
        } else {
          console.log("User already in room, not rejoining");
        }
        
        // Update AI partners based on existing participants if none were passed
        if (!location.state?.aiPartners || location.state.aiPartners.length === 0) {
          setAiPartners(existingAIs.map(ai => ({
            name: ai.name,
            id: ai.ai_agent,
            role: ai.role || 'Assistant'
          })));
        }
        
        // Set the participant list
        setParticipants(participants);
      } catch (error) {
        console.error("Error checking existing participation:", error);
        // If fetch fails, proceed with normal join
        await joinRoom();
      }
    };
    
    // Connect websocket
    connectWebSocket();
    
    // Check existing participation and join if needed
    checkExistingParticipation();
    
    // Fetch messages
    fetchMessages();
    
    return () => {
      // Clean up
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [roomId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Add AI participants to the room
  useEffect(() => {
    if (aiPartners.length > 0 && roomId) {
      // Initialize AI feedback generation
      const feedbackInterval = setInterval(() => {
        generateAIFeedback();
      }, 5000); // Generate AI feedback every 15 seconds
      return () => clearInterval(feedbackInterval);
    }
  }, [aiPartners, roomId]);
  
  const connectWebSocket = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: "Unable to connect to server. Please refresh the page and try again.",
        is_system: true,
        created_at: new Date().toISOString()
      }]);
      return;
    }
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Close existing WebSocket connection if it exists and is not already closed
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      // Set a flag to prevent the onclose handler from triggering reconnect
      socketRef.current.isIntentionalClose = true;
      socketRef.current.close();
    }
    
    // Create new WebSocket connection
    try {
      const wsUrl = `ws://localhost:8002/ws/chat/${roomId}/`;
      console.log(`Attempting to connect to ${wsUrl}`);
      
      const newSocket = new WebSocket(wsUrl);
      
      newSocket.onopen = () => {
        console.log('WebSocket connection opened');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        setMessages(prev => [...prev, {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: "Connected to chat server",
          is_system: true,
          created_at: new Date().toISOString()
        }]);
      };
      
      newSocket.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        setIsConnected(false);
        
        // Only reconnect if the closure wasn't intentional
        if (!newSocket.isIntentionalClose) {
          // Plan to reconnect
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          
          setMessages(prev => [...prev, {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: `Connection lost. Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`,
            is_system: true,
            created_at: new Date().toISOString()
          }]);
          
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        }
      };
      
      newSocket.onmessage = (event) => {
        console.log("Received message:", event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message') {
            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                sender: data.sender,
                content: data.message,
                is_ai: data.is_ai,
                created_at: new Date().toISOString(),
              },
            ]);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't immediately reconnect on error - let the onclose handle it
      };
      
      socketRef.current = newSocket;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      
      // If connection fails, try to reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
    }
  };
  
  const joinRoom = async () => {
    try {
      console.log("Joining room with user:", userName);
      
      // Register user in the room
      await axios.post(`/api/rooms/${roomId}/join/`, {
        name: userName,
        is_ai: false
      });
      
      // Register AI partners in the room
      if (aiPartners && aiPartners.length > 0) {
        console.log("Adding AI partners:", aiPartners);
        
        // Get existing participants to check for duplicates
        const response = await axios.get(`/api/rooms/${roomId}/participants/`);
        const existingParticipants = response.data;
        
        for (const agent of aiPartners) {
          // Check if this AI agent is already in the room
          const alreadyExists = existingParticipants.some(p => 
            p.name === agent.name && p.is_ai === true
          );
          
          if (!alreadyExists) {
            console.log(`Adding AI partner ${agent.name}`);
            await axios.post(`/api/rooms/${roomId}/join/`, {
              name: agent.name,
              is_ai: true,
              ai_agent: agent.id,
              role: agent.role || 'Assistant'
            });
          } else {
            console.log(`AI partner ${agent.name} already exists, skipping`);
          }
        }
      }
      
      // Fetch updated participants list
      await fetchParticipants();
      
      // Add system message
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: `You joined Room ${roomId}`,
        is_system: true,
        created_at: new Date().toISOString()
      }]);
      
    } catch (error) {
      console.error("Error joining room:", error);
    }
  };
  
  const fetchParticipants = async () => {
    try {
      const response = await axios.get(`/api/rooms/${roomId}/participants/`);
      
      // The key here is to ensure we don't duplicate participants on refresh
      // Just set the participants directly from the API response
      setParticipants(response.data);
      
      // Also update the AI partners list if needed
      const aiPartners = response.data.filter(p => p.is_ai).map(ai => ({
        name: ai.name,
        id: ai.ai_agent,
        role: ai.role || 'Assistant'
      }));
      
      // Only update if we need to
      if (aiPartners.length > 0) {
        setAiPartners(aiPartners);
      }
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
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const navigateToVoice = () => {
    navigate(`/voice-mode/${roomId}`, { state: location.state });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: "Unable to send message: Not connected to server",
        is_system: true,
        created_at: new Date().toISOString()
      }]);
      
      connectWebSocket();
      return;
    }
    
    try {
      // First send the user's message
      const messageObj = {
        type: 'message',
        message: inputMessage,
        sender: userName,
        is_ai: false,
        message_type: 'chat'
      };
      
      socketRef.current.send(JSON.stringify(messageObj));
      
      // Add user's message to the chat immediately
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: userName,
        content: inputMessage,
        is_ai: false,
        created_at: new Date().toISOString()
      }]);
      
      // Clear input immediately for better UX
      setInputMessage('');
      
      // Then get AI responses
      const res = await axios.post(`/api/rooms/${roomId}/ai_respond/`, {
        message: {
          sender: userName,
          content: inputMessage
        }
      });
      
      // Add all AI responses to chat
      if (res.data && Array.isArray(res.data)) {
        res.data.forEach(aiResponse => {
          setMessages(prev => [...prev, {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sender: aiResponse.sender,
            content: aiResponse.message,
            is_ai: true,
            created_at: new Date().toISOString()
          }]);
        });
      }
      
    } catch (err) {
      console.error("Error in sendMessage:", err);
      let errorMessage = "Error getting AI responses";
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 404) {
          errorMessage = "Room not found. Please refresh the page.";
        } else if (err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      }
      
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: errorMessage,
        is_system: true,
        created_at: new Date().toISOString()
      }]);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };
  
  const generateAIFeedback = () => {
    if (!aiPartners.length || !isConnected) return;
    
    // Select a random AI agent to give feedback
    const randomAgent = aiPartners[Math.floor(Math.random() * aiPartners.length)];
    if (randomAgent) {
      const feedback = generateRandomFeedback(randomAgent.role);
      
      // Send the feedback through WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify({
            type: 'message',
            message: feedback,
            sender: randomAgent.name,
            is_ai: true,
            message_type: 'feedback'
          }));
        } catch (error) {
          console.error("Error sending AI feedback:", error);
        }
      }
    }
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
  
  const leaveRoom = () => {
    navigate('/'); // Navigate to home page
  };
  
  // Check if a message is from the current user
  const isMessageFromCurrentUser = (messageSender) => {
    return messageSender === userName;
  };
  
  // Check if a message is from an AI agent
  const isMessageFromAI = (messageSender) => {
    return aiPartners.some(agent => agent.name === messageSender);
  };
  
  // Find the AI agent by name
  const findAIAgent = (name) => {
    return aiPartners.find(agent => agent.name === name);
  };
  
  // Group messages by sender for avatar display
  const shouldShowAvatar = (message, index) => {
    if (index === 0) return true;
    if (messages[index - 1].sender !== message.sender) return true;
    return false;
  };

  const isInputEmpty = !inputMessage.trim();

  return (
    <ChatRoomContainer>
      <Header>
        <RoomTitle>
          <StatusIndicator connected={isConnected} />
          Room {roomId}
        </RoomTitle>
        <ControlButton danger onClick={leaveRoom} style={{ marginLeft: '10px' }}> {/* Added marginLeft for spacing */}
            <RxExit size={`clamp(16px, 4vw, 20px)`} />
        </ControlButton>
      </Header>
      
      <ChatSection>
        <MessagesContainer>
          {messages.map((message, index) => {
            // Handle system messages
            if (message.is_system) {
              return <SystemMessage key={message.id || `system-${index}`}>{message.content}</SystemMessage>;
            }
            
            // Determine if message is from current user or AI
            const isFromUser = isMessageFromCurrentUser(message.sender);
            const isFromAI = isMessageFromAI(message.sender);
            const showAvatar = !isFromUser && shouldShowAvatar(message, index); // This determines if the Avatar visual is shown
            
            return (
              <MessageWrapper key={message.id || `msg-${index}`} isFromUser={isFromUser}> {/* REMOVED: showAvatar prop from MessageWrapper */}
                {!isFromUser && ( // For non-user messages, always include AvatarSpace
                  <AvatarSpace>
                    {showAvatar && ( // Conditionally render the Avatar *inside* AvatarSpace
                      <Avatar>
                        {isFromAI ? (
                          <img 
                            src={`/img/${message.sender.toLowerCase()}.png`} 
                            alt={message.sender} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            backgroundColor: '#4a72d4',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            {message.sender.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Avatar>
                    )}
                  </AvatarSpace>
                )}
                <Message 
                  isFromUser={isFromUser}
                  isAi={isFromAI}
                >
                  {!isFromUser && (
                    <MessageSender isAi={isFromAI}>
                      {message.sender}
                    </MessageSender>
                  )}
                  {message.content}
                </Message>
              </MessageWrapper>
            );
          })}
          <div ref={messagesEndRef} />
        </MessagesContainer>
        
        <InputArea>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
          />
          <SendButton 
            onClick={isInputEmpty ? navigateToVoice : sendMessage}
            isEmptyInputBehavior={isInputEmpty}
            disabled={!isConnected} // Button is truly disabled only if not connected
          >
            {isInputEmpty ? <RiVoiceprintLine size={18} /> : '➤'}
          </SendButton>
        </InputArea>
      </ChatSection>
    </ChatRoomContainer>
  );
};

export default ChatRoom;