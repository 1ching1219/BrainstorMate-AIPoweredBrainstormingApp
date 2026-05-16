import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { FiImage, FiCheck } from 'react-icons/fi';
import { API_BASE_URL, API_ORIGIN, updateAIAgent } from '../services/api';

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

const AvatarWrapper = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
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
  overflow: hidden;
`;

const AvatarPreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const Input = styled.input`
  flex: 1;
  padding: 8px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Label = styled.label`
  font-size: 14px;
  margin-bottom: 8px;
  display: block;
  font-weight: 500;
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
  &:hover { background-color: #bbb; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DeleteButton = styled.button`
  padding: 12px;
  font-size: 16px;
  background-color: #c0392b;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover { background-color: #a93226; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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
    flex-shrink: 0;
  }
`;

const EditAI = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { agent, roomId, isNewRoom } = location.state || {};

  const [role, setRole] = useState(agent?.role || '');
  const [description, setDescription] = useState(agent?.description || '');
  const [avatarFile, setAvatarFile] = useState(null);   // new file chosen by user
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  if (!agent) {
    navigate('/');
    return null;
  }

  const existingAvatarUrl = agent.avatar_url
    ? agent.avatar_url
    : agent.avatar
      ? (agent.avatar.startsWith('http') ? agent.avatar : `${API_ORIGIN}${agent.avatar}`)
      : null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!role.trim()) errs.role = 'Role is required.';
    if (!description.trim()) errs.description = 'Description is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await updateAIAgent(agent.id, role.trim(), description.trim(), avatarFile);
      navigate('/select-partners', { state: { roomId, isNewRoom } });
    } catch (err) {
      setErrors({ general: 'Failed to save changes. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/select-partners', { state: { roomId, isNewRoom } });
  };

  const avatarPreviewUrl = avatarFile ? URL.createObjectURL(avatarFile) : existingAvatarUrl;

  return (
    <Container>
      <Header>
        <BackButton onClick={handleBack}>←</BackButton>
        <Title>Edit <br />AI partner</Title>
      </Header>

      <Form>
        <FormRow>
          <InputRow>
            <AvatarWrapper>
              <ImagePlaceholder onClick={() => document.getElementById('editFileInput').click()}>
                {avatarPreviewUrl ? (
                  <AvatarPreview src={avatarPreviewUrl} alt="avatar" />
                ) : avatarFile ? (
                  <FiCheck size={40} />
                ) : (
                  <FiImage size={40} />
                )}
              </ImagePlaceholder>
              <HiddenFileInput
                id="editFileInput"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </AvatarWrapper>

            <FormGroup>
              <Input
                type="text"
                placeholder="Name the Role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  if (e.target.value.trim()) setErrors(p => ({ ...p, role: undefined }));
                }}
              />
            </FormGroup>
          </InputRow>
          {errors.role && <ErrorMessage>{errors.role}</ErrorMessage>}
        </FormRow>

        <FormGroup>
          <Label>Specialize</Label>
          <TextArea
            placeholder="This AI is going to be... For example: Gender/Tone/Character..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (e.target.value.trim()) setErrors(p => ({ ...p, description: undefined }));
            }}
          />
          {errors.description && <ErrorMessage>{errors.description}</ErrorMessage>}
        </FormGroup>

        {errors.general && <ErrorMessage>{errors.general}</ErrorMessage>}

        <SaveButton onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save Changes'}
        </SaveButton>
      </Form>
    </Container>
  );
};

export default EditAI;
