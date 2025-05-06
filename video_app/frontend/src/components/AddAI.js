import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { FiImage, FiCheck } from "react-icons/fi";

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
  flex-direction: column;
  gap: 8px;
`;

const InputRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`;

const FormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
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
  aspect-ratio: 1/1;
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

const ErrorMessage = styled.div`
  color: #d32f2f;
  font-size: 14px;
  padding: 8px 12px;
  margin-top: 4px;
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

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
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
      // Clear error when file is selected
      setErrors(prev => ({ ...prev, aiAvatar: undefined }));
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
        <FormRow>
          <InputRow>
            <ImagePlaceholder onClick={() => document.getElementById('fileInput').click()}>
              {aiAvatar ? <FiCheck size={40} /> : <FiImage size={40} />}
            </ImagePlaceholder>
            <HiddenFileInput
              id="fileInput"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
            <FormGroup>
              <Input
                type="text"
                placeholder="Name the Role"
                value={aiRole}
                onChange={(e) => {
                  setAiRole(e.target.value);
                  if (e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, aiRole: undefined }));
                  }
                }}
              />
            </FormGroup>
          </InputRow>
          {errors.aiAvatar && <ErrorMessage>{errors.aiAvatar}</ErrorMessage>}
          {errors.aiRole && <ErrorMessage>{errors.aiRole}</ErrorMessage>}
        </FormRow>
        
        <FormGroup>
          <Label>Specialize</Label>
          <TextArea
            placeholder="This AI is going to be... For example: Gender/Tone/Character..."
            value={aiDescription}
            onChange={(e) => {
              setAiDescription(e.target.value);
              if (e.target.value.trim()) {
                setErrors(prev => ({ ...prev, aiDescription: undefined }));
              }
            }}
          />
          {errors.aiDescription && <ErrorMessage>{errors.aiDescription}</ErrorMessage>}
        </FormGroup>
        
        <SaveButton onClick={handleSave}>Save</SaveButton>
      </Form>
    </Container>
  );
};

export default AddAI;