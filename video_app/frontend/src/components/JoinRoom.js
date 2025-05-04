import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 0 20px;
`;

const Title = styled.h1`
  font-size: 30px;
  margin-bottom: 12px;
  text-align: center;
`;

const SubTitle = styled.h2`
  font-size: 20px;
  margin-bottom: 32px;
  text-align: center;
  font-weight: normal;
  color: #666;
`;

const Form = styled.form`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
`;

const InputGroup = styled.div`
  margin-bottom: 24px;
  width: 100%;
`;

const Label = styled.label`
  font-size: 14px;
  margin-bottom: 8px;
  display: block;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: gray;
  }
`;

const Button = styled.button`
  padding: 12px 24px;
  background-color: gray;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  
  &:hover {
    background-color: darkgray;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: default;
  }
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin-top: 24px;
  color: gray;
  text-decoration: none;
  font-size: 14px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ErrorMessage = styled.div`
  color: #d32f2f;
  font-size: 14px;
  padding: 12px;
  margin-bottom: 16px;
  background-color: rgba(211, 47, 47, 0.08);
  border-radius: 8px;
  display: flex;
  align-items: center;
  
  &:before {
    content: "!";
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #d32f2f;
    color: white;
    font-weight: bold;
    margin-right: 8px;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-left: 8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

/**
 * JoinRoom component - Form to join an existing room
 */
const JoinRoom = () => {
  const [name, setName] = useState(localStorage.getItem('username') || '');
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    
    // Save user name to local storage
    if (name) {
      localStorage.setItem('username', name);
    } else {
      setError("Please enter your name");
      return;
    }
    
    if (!roomId) {
      setError("Please enter a room ID");
      return;
    }
    
    setIsJoining(true);
    try {
        // 發送 POST 請求加入房間
        const response = await axios.post(`http://localhost:8001/api/rooms/${roomId}/join/`, {
          name: name,
          is_ai: false,
          
        });
      
        // 確保加入房間成功後，再獲取 AI 夥伴資料
        const aiResponse = await axios.get(`http://localhost:8001/api/rooms/${roomId}/ai-partners`);
        const aiPartners = aiResponse.data.aiPartners || [];
      
        // 導向房間頁面並帶上 AI 夥伴資料
        navigate(`/room/${roomId}`, {
          state: { aiPartners: aiPartners }
        });
      
      } catch (error) {
        console.error("Error joining room:", error);
        if (error.response && error.response.status === 404) {
          setError("Room not found. Please check the room ID and try again.");
        } else if (error.response && error.response.status === 400) {
          setError("Failed to join room: " + (error.response.data?.message || JSON.stringify(error.response.data)));
        } else {
          setError("Failed to join room. Please try again later.");
        }
      } finally {
        setIsJoining(false);
      }
      
      
    // try {
    //   // Check if room exists and fetch AI partners in one step
    //   const response = await axios.get(`http://localhost:8001/api/rooms/${roomId}/ai-partners`);
      
    //   // If we get here, the room exists
    //   // Retrieve the AI partners that are already associated with this room
    //   const aiPartners = response.data.aiPartners || [];
      
    //   // Navigate directly to the room with the AI partners
    //   navigate(`/room/${roomId}`, {
    //     state: { aiPartners: aiPartners }
    //   });
    // } catch (error) {
    //   console.error("Error joining room:", error);
    //   if (error.response && error.response.status === 404) {
    //     setError("Room not found. Please check the room ID and try again.");
    //   } else {
    //     setError("Failed to join room. Please try again later.");
    //   }
    // } finally {
    //   setIsJoining(false);
    // }
  };
  
  return (
    <Container>
      <Title>Join a Room</Title>
      <SubTitle>Enter a room ID to join an existing session</SubTitle>
      
      <Form onSubmit={handleJoin}>
        <InputGroup>
          <Label htmlFor="name">Your Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </InputGroup>
        
        <InputGroup>
          <Label htmlFor="roomId">Room ID</Label>
          <Input
            id="roomId"
            type="text"
            placeholder="Enter room ID to join"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
          />
        </InputGroup>
        
        {error && (
          <ErrorMessage role="alert">
            {error}
          </ErrorMessage>
        )}
        
        <Button 
          type="submit"
          disabled={!name || !roomId || isJoining}
        >
          {isJoining ? (
            <>
              Joining... <LoadingSpinner />
            </>
          ) : 'Join Room'}
        </Button>
      </Form>
      
      <BackLink to="/">
        &larr; Back to Home
      </BackLink>
    </Container>
  );
};

export default JoinRoom;