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
  font-size: 32px;
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
    border-color: #007aff;
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

/**
 * CreateRoom component - Form to create a new room
 */
const CreateRoom = () => {
  const [name, setName] = useState(localStorage.getItem('username') || '');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    
    // Save user name to local storage
    if (name) {
      localStorage.setItem('username', name);
    } else {
      setError("Please enter your name");
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Create a new room
      const response = await axios.post('http://localhost:8000/api/rooms/create/', {
        name: `${name}'s Room`
      });
      
      const newRoomId = response.data.room_id;
      
      // Navigate to AI partner selection with the new room ID
      navigate(`/select-partners`, { state: { roomId: newRoomId, isNewRoom: true } });
    } catch (error) {
      console.error("Error creating room:", error);
      setError("Failed to create room. Please try again later.");
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Container>
      <Title>Create a New Room</Title>
      <SubTitle>Start your brainstorming session</SubTitle>
      
      <Form onSubmit={handleCreate}>
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
        
        {error && (
          <ErrorMessage role="alert">
            {error}
          </ErrorMessage>
        )}
        
        <Button 
          type="submit"
          disabled={!name || isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Room'}
        </Button>
      </Form>
      
      <BackLink to="/">
        &larr; Back to Home
      </BackLink>
    </Container>
  );
};

export default CreateRoom;