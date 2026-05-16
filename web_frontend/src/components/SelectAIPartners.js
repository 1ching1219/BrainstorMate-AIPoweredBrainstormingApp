// export default SelectAIPartners;
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import { API_BASE_URL, API_ORIGIN, deleteAIAgent } from '../services/api';

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

/* Grid cell — layout only, no click handler */
const AIOption = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 5px;
`;

/* Content-sized clickable card — shrinks to avatar+text width */
const AgentCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
  cursor: pointer;
  border-radius: 10px;
  padding: 4px;
  z-index: ${props => props.$menuOpen ? 10 : 'auto'};
`;

/* Positions the ⋯ button and dropdown relative to the avatar box */
const AvatarWrapper = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 8px;
`;

const MenuButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  &:hover { background: #fff; }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 0;
  left: calc(100% + 6px);
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  min-width: 110px;
  z-index: 20;
`;

const DropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 9px 16px;
  background: none;
  border: none;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  color: ${props => props.danger ? '#c0392b' : '#333'};
  &:hover {
    background: ${props => props.danger ? '#fdf0f0' : '#f5f5f5'};
  }
`;

const AIAvatar = styled.div`
  width: 100%;
  height: 100%;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
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

const getAgentAvatarSrc = (agent) => {
  const fallbackByRole = {
    designer: `${API_ORIGIN}/media/avatars/designer.png`,
    engineer: `${API_ORIGIN}/media/avatars/engineer.png`,
    finance:  `${API_ORIGIN}/media/avatars/finance.png`,
    professor: `${API_ORIGIN}/media/avatars/professor.png`,
  };

  if (agent.avatar_url) {
    return agent.avatar_url;
  }

  if (agent.avatar) {
    if (typeof agent.avatar === 'string') {
      try {
        return new URL(agent.avatar, API_BASE_URL).toString();
      } catch (error) {
        return agent.avatar;
      }
    }

    return agent.avatar;
  }

  return fallbackByRole[(agent.role || '').toLowerCase()] || `${API_ORIGIN}/media/avatars/default.png`;
};

const SelectAIPartners = () => {
  const [aiAgents, setAiAgents] = useState([
    { id: 1, role: 'Designer', avatar_url: `${API_ORIGIN}/media/avatars/designer.png` },
    { id: 2, role: 'Engineer', avatar_url: `${API_ORIGIN}/media/avatars/engineer.png` },
    { id: 3, role: 'Finance',  avatar_url: `${API_ORIGIN}/media/avatars/finance.png` },
    { id: 4, role: 'Professor', avatar_url: `${API_ORIGIN}/media/avatars/professor.png` }
  ]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

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
  
  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const toggleAgent = (agent) => {
    if (selectedAgents.find(a => a.id === agent.id)) {
      setSelectedAgents(selectedAgents.filter(a => a.id !== agent.id));
    } else {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };

  const handleEdit = (e, agent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    navigate('/edit-ai', { state: { agent, roomId, isNewRoom } });
  };

  const handleDelete = async (e, agent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const confirmed = window.confirm(
      `Delete "${agent.role}"?\n\nThis will permanently remove the AI partner and its uploaded image. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteAIAgent(agent.id);
      setAiAgents(prev => prev.filter(a => a.id !== agent.id));
      setSelectedAgents(prev => prev.filter(a => a.id !== agent.id));
    } catch (err) {
      alert('Failed to delete AI partner. Please try again.');
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
      
      // Save the selected AI partners to the database for this room
      await axios.post(`${API_BASE_URL}/rooms/${roomId}/ai-partners/`, {
        aiPartners: selectedAgents
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
          <AIOption key={agent.id}>
            <AgentCard
              $menuOpen={openMenuId === agent.id}
              onClick={() => toggleAgent(agent)}
            >
              <AvatarWrapper>
                <AIAvatar selected={selectedAgents.some(a => a.id === agent.id)}>
                  <AIImage src={getAgentAvatarSrc(agent)} alt={agent.role} />
                </AIAvatar>

                {/* ⋯ button: anchored to avatar's top-right corner */}
                <MenuButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === agent.id ? null : agent.id);
                  }}
                  title="More options"
                >
                  ⋯
                </MenuButton>

                {openMenuId === agent.id && (
                  <DropdownMenu ref={menuRef}>
                    <DropdownItem onClick={(e) => handleEdit(e, agent)}>✎ Edit</DropdownItem>
                    <DropdownItem danger onClick={(e) => handleDelete(e, agent)}>🗑 Delete</DropdownItem>
                  </DropdownMenu>
                )}
              </AvatarWrapper>

              <AIRole>{agent.role}</AIRole>
            </AgentCard>
          </AIOption>
        ))}
        <AIOption>
          <AgentCard onClick={() => navigate('/add-ai', { state: { roomId, isNewRoom } })}>
            <AddButton>+</AddButton>
          </AgentCard>
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