import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';

// an app page that allows users create their own AI agents
// Components needed: Header, AI Role (let user set the Role of their AI agent), AI description(Let user set the description)

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

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ImageInputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ImagePlaceholder = styled.div`
  width: 80px;
  height: 80px;
  background-color: #e0e0e0;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  font-size: 24px;
  color: #888;
  cursor: pointer;
  position: relative;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const Input = styled.input`
  flex: 1;
  padding: 8px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 300px;
  padding: 8px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none;
`;

const SaveButton = styled.button`
  padding: 12px;
  font-size: 16px;
  background-color: #ccc;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: #bbb;
  }
`;

const ErrorText = styled.p`
  color: red;
  font-size: 14px;
  margin: 0;
`;

const Label = styled.label`
  font-size: 14px;
  margin-bottom: 8px;
  display: block;
  font-weight: 500;
`;

const AddAI = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Always declare hooks at the top level
  const [aiRole, setAiRole] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [aiAvatar, setAiAvatar] = useState(null);
  const [errors, setErrors] = useState({});
  const [roomId, setRoomId] = useState(null);
  const [isNewRoom, setIsNewRoom] = useState(false);

  // Use useEffect to handle navigation when roomId is missing
  useEffect(() => {
    const roomIdFromLocation = location.state?.roomId;
    const isNewRoomFromLocation = location.state?.isNewRoom;
    
    if (!roomIdFromLocation) {
      console.error('Room ID is missing');
      navigate('/');
    } else {
      setRoomId(roomIdFromLocation);
      setIsNewRoom(isNewRoomFromLocation || false);
    }
  }, [location, navigate]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAiAvatar(file);
    }
  };

  const validateFields = () => {
    const newErrors = {};
    if (!aiRole.trim()) newErrors.aiRole = 'AI Role is required.';
    if (!aiDescription.trim()) newErrors.aiDescription = 'AI Description is required.';
    if (!aiAvatar) newErrors.aiAvatar = 'AI Avatar is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateFields()) return;

    console.log('AI Role:', aiRole);
    console.log('AI Description:', aiDescription);
    console.log('AI Avatar:', aiAvatar);

    const formData = new FormData();
    formData.append('role', aiRole);
    formData.append('description', aiDescription);
    formData.append('avatar', aiAvatar);

    try {
      const response = await fetch('/api/save-ai/', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        console.log('AI saved successfully!');
        navigate('/select-partners', { state: { roomId, isNewRoom } });
      } else {
        const errorData = await response.json();
        console.error('Failed to save AI:', errorData.message);
      }
    } catch (error) {
      console.error('Error saving AI:', error);
    }
  };

  const handleBackClick = () => {
    if (roomId) {
      navigate('/select-partners', { state: { roomId, isNewRoom } });
    } else {
      navigate('/');
    }
  };

  // If we're still waiting for roomId to be set, we could show a loading indicator
  if (roomId === null) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={handleBackClick}>
          ←
        </BackButton>
        <Title>Add <br />new AI partner</Title>
      </Header>
      <Form>
        <ImageInputContainer>
          <ImagePlaceholder onClick={() => document.getElementById('fileInput').click()}>
            {aiAvatar ? '✔️' : '📷'}
          </ImagePlaceholder>
          <HiddenFileInput
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />
          {errors.aiAvatar && <ErrorText>{errors.aiAvatar}</ErrorText>}
          <Input
            type="text"
            placeholder="Name the Role"
            value={aiRole}
            onChange={(e) => setAiRole(e.target.value)}
          />
          {errors.aiRole && <ErrorText>{errors.aiRole}</ErrorText>}
        </ImageInputContainer>
        <div>
          <Label>Specialize</Label>
          <TextArea
            placeholder="This AI is going to be... For example: Gender/Tone/Character..."
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
          />
          {errors.aiDescription && <ErrorText>{errors.aiDescription}</ErrorText>}
        </div>
        <SaveButton onClick={handleSave}>Save</SaveButton>
      </Form>
    </Container>
  );
};

export default AddAI;