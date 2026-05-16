import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 0 20px;
`;

const Title = styled.h1`
  font-size: 35px;
  margin-bottom: 40px;
  text-align: center;
`;

const SubTitle = styled.h2`
  font-size: 20px;
  margin-bottom: 32px;
  text-align: center;
  font-weight: 500;
  color: #555;
`;

const ButtonsContainer = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ActionButton = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  background-color: gray;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  text-align: center;
  
  &:hover {
    background-color: gray;
  }
`;

const SecondaryButton = styled(ActionButton)`
  background-color: #f5f5f5;
  color: #333;
  
  &:hover {
    background-color: #e0e0e0;
  }
`;

/**
 * Home component - Landing page with options to create or join a room
 */
const Home = () => {
  const navigate = useNavigate();
  
  return (
    <Container>
      <Title>BrainstorMate</Title>
      <SubTitle>Your AI-powered creativity partner.</SubTitle>
      
      <ButtonsContainer>
        <ActionButton to="/create-room">
          Create a New Room
        </ActionButton>
        
        <SecondaryButton to="/join-room">
          Join Existing Room
        </SecondaryButton>
      </ButtonsContainer>
    </Container>
  );
};

export default Home;