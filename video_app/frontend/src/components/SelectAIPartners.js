// export default SelectAIPartners;
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  height: 100vh;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 24px;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  font-size: 35px;
  cursor: pointer;
`;

const Title = styled.h1`
  font-size: 35px;
  margin-left: 0px;
`;

const AIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 2 columns for smaller screen */
  gap: 16px;
  margin-bottom: 24px;
`;

const AIOption = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  border-radius: 10px;
`;

const AIAvatar = styled.div`
  width: 80px;
  height: 80px;
  background-color: #e0e0e0;
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  border: ${props => props.selected ? '3px solid rgb(197, 152, 54)' : 'none'};
`;

const AIImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AIRole = styled.div`
  font-size: 14px;
  font-weight: bold;
  text-align: center;
`;

const AddButton = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80px;
  height: 80px;
  background-color: #f0f0f0;
  border: 2px dashed #aaa;
  border-radius: 10px;
  cursor: pointer;
  font-size: 24px;
`;

const StartButton = styled.button`
  padding: 12px 24px;
  font-size: 16px;
  background-color: #e0e0e0;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  align-self: center;
  margin-top: auto;

  &:hover {
    background-color: #d0d0d0;
  }
`;

const LoadingSpinner = styled.div`
  margin-left: 10px;
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top: 2px solid #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SelectAIPartners = () => {
  const [aiAgents, setAiAgents] = useState([
    { id: 1, role: 'Designer', avatar: '/img/designer.png' },
    { id: 2, role: 'Engineer', avatar: '/img/engineer.png' },
    { id: 3, role: 'Finance', avatar: '/img/finance.png' },
    { id: 4, role: 'Professor', avatar: '/img/professor.png' }
  ]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();
  const roomId = location.state?.roomId;
  const isNewRoom = location.state?.isNewRoom;
  
  useEffect(() => {
    // Redirect if this is not a new room or if room ID is missing
    if (!roomId) {
      console.error('Room ID is missing');
      navigate('/');
      return;
    }
    
    if (!isNewRoom) {
      // If someone tries to access this page directly for an existing room,
      // redirect them to join the room directly
      navigate(`/room/${roomId}`);
      return;
    }
    
    // Fetch AI agents from backend
    const fetchAIAgents = async () => {
      try {
        const response = await axios.get('/api/ai-agents/');
        if (response.data.length > 0) {
          setAiAgents(response.data);
        }
      } catch (error) {
        console.error('Error fetching AI agents:', error);
      } finally {
        setLoadingPage(false);
      }
    };
    
    fetchAIAgents();
  }, [roomId, isNewRoom, navigate]);
  
  const toggleAgent = (agent) => {
    if (selectedAgents.find(a => a.id === agent.id)) {
      setSelectedAgents(selectedAgents.filter(a => a.id !== agent.id));
    } else {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };
  
  const handleStart = async () => {
    if (!roomId) {
      console.error('Room ID is missing');
      alert('Cannot create room, missing room ID');
      return;
    }
    
    const username = localStorage.getItem('username') || localStorage.getItem('userName');
    
    if (!username) {
      console.error('Username not found in localStorage');
      alert('Please set your username first');
      navigate('/');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`Setting up room ${roomId} with selected AI partners`);
      
      // First, join the room as a human participant
      await axios.post(`/api/rooms/${roomId}/join/`, {
        name: username,
        is_ai: false
      });

      // Then, for each selected AI agent, create a room participant
      for (const agent of selectedAgents) {
        await axios.post(`/api/rooms/${roomId}/join/`, {
          name: agent.role,
          is_ai: true,
          ai_agent: agent.id,
          role: agent.role
        });
      }
      
      // Save the selected AI partners to the room's ai_partners field
      await axios.post(`/api/rooms/${roomId}/ai-partners/`, {
        aiPartners: selectedAgents.map(agent => ({
          id: agent.id,
          name: agent.role,
          role: agent.role,
          avatar: agent.avatar
        }))
      });
      
      // Navigate to the room with AI partners as state
      navigate(`/room/${roomId}`, {
        state: {
          aiPartners: selectedAgents.map(agent => ({
            id: agent.id,
            name: agent.role,
            role: agent.role,
            avatar: agent.avatar
          }))
        }
      });
    } catch (error) {
      console.error('Error saving AI partners or starting room:', error);
      alert('Error while saving AI partners or joining room. Please try again later.');
      setIsLoading(false);
    }
  };
  
  const handleMockupStart = () => {
    // For mockup purposes, just navigate to the chat room
    navigate('/chat-mockup', { state: { roomId, aiPartners: selectedAgents } });
  }

  if (loadingPage) {
    return (
      <Container>
        <Header>
          <BackButton onClick={() => navigate('/')}>←</BackButton>
          <br />
          <Title>Loading AI partners...</Title>
        </Header>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
          <LoadingSpinner />
        </div>
      </Container>
    );
  }
  
  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate('/')}>←</BackButton>
        {/* Breakline */}
        <Title>Select <br /> AI partners for your room</Title>
      </Header>
      
      <AIGrid>
        {aiAgents.map((agent) => (
          <AIOption 
            key={agent.id} 
            selected={selectedAgents.some(a => a.id === agent.id)}
            onClick={() => toggleAgent(agent)}
          >
            <AIAvatar selected={selectedAgents.some(a => a.id === agent.id)}>
            <AIImage src={agent.avatar ? `http://localhost:8001${agent.avatar}` : `/placeholder-${agent.role.toLowerCase()}.png`} alt={agent.role} />

            </AIAvatar>
            <AIRole>{agent.role}</AIRole>
          </AIOption>
        ))}
        <AIOption
          onClick={() => navigate('/add-ai', { state: { roomId, isNewRoom } })}
        >
          <AddButton>+</AddButton>
        </AIOption>
      </AIGrid>
      
      <StartButton 
        onClick={handleStart} 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            Setting up room... <LoadingSpinner />
          </>
        ) : 'Enter Room'}
      </StartButton>
    </Container>
  );
};

export default SelectAIPartners;