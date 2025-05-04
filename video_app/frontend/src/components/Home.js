// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import styled from 'styled-components';
// import axios from 'axios';

// const HomeContainer = styled.div`
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   justify-content: center;
//   height: 100vh;
//   padding: 0 20px;
// `;

// const Title = styled.h1`
//   font-size: 24px;
//   margin-bottom: 40px;
//   text-align: center;
// `;

// const Form = styled.form`
//   width: 100%;
//   max-width: 400px;
//   display: flex;
//   flex-direction: column;
// `;

// const InputGroup = styled.div`
//   margin-bottom: 24px;
//   width: 100%;
// `;

// const Label = styled.label`
//   font-size: 14px;
//   margin-bottom: 8px;
//   display: block;
//   font-weight: 500;
// `;

// const Input = styled.input`
//   width: 100%;
//   padding: 12px 16px;
//   border: 1px solid #e0e0e0;
//   border-radius: 8px;
//   font-size: 16px;
  
//   &:focus {
//     outline: none;
//     border-color: #007aff;
//   }
// `;

// const ButtonContainer = styled.div`
//   display: flex;
//   justify-content: space-between;
//   margin-top: 16px;
// `;

// const Button = styled.button`
//   padding: 12px 24px;
//   background-color: #007aff;
//   color: white;
//   border: none;
//   border-radius: 8px;
//   font-size: 16px;
//   font-weight: 500;
//   cursor: pointer;
//   flex: ${props => props.fullWidth ? '1' : 'initial'};
  
//   &:hover {
//     background-color: #0062cc;
//   }
  
//   &:disabled {
//     background-color: #cccccc;
//     cursor: default;
//   }
// `;

// const SecondaryButton = styled(Button)`
//   background-color: #f5f5f5;
//   color: #333;
//   margin-right: 16px;
  
//   &:hover {
//     background-color: #e0e0e0;
//   }
// `;

// const ErrorMessage = styled.div`
//   color: #d32f2f;
//   font-size: 14px;
//   padding: 12px;
//   margin-bottom: 16px;
//   background-color: rgba(211, 47, 47, 0.08);
//   border-radius: 8px;
//   display: flex;
//   align-items: center;
  
//   &:before {
//     content: "!";
//     display: inline-flex;
//     align-items: center;
//     justify-content: center;
//     width: 20px;
//     height: 20px;
//     border-radius: 50%;
//     background-color: #d32f2f;
//     color: white;
//     font-weight: bold;
//     margin-right: 8px;
//   }
// `;

// const Home = () => {
//   const [name, setName] = useState(localStorage.getItem('username') || '');
//   const [roomId, setRoomId] = useState('');
//   const [isCreatingRoom, setIsCreatingRoom] = useState(false);
//   const [isJoiningRoom, setIsJoiningRoom] = useState(false);
//   const [error, setError] = useState('');
//   const navigate = useNavigate();
  
//   const handleJoin = async (e) => {
//     e.preventDefault();
//     setError('');
    
//     // Save user name to local storage
//     if (name) {
//       localStorage.setItem('username', name);
//     }
    
//     if (!roomId) {
//       setError("Please enter a room ID");
//       return;
//     }
    
//     setIsJoiningRoom(true);
    
//     try {
//       // Check if room exists by trying to fetch room details
//       const response = await axios.get(`http://localhost:8001/api/rooms/${roomId}/participants`);
      
//       // If we get here, the room exists
//       navigate(`/select-partners`, { state: { roomId } });
//     } catch (error) {
//       console.error("Error verifying room:", error);
//       if (error.response && error.response.status === 404) {
//         setError("Room not found. Please check the room ID and try again.");
//       } else {
//         setError("Failed to join room. Please try again later.");
//       }
//     } finally {
//       setIsJoiningRoom(false);
//     }
//   };
  
//   const handleCreate = async () => {
//     setError('');
//     setIsCreatingRoom(true);
    
//     try {
//       // Save user name to local storage
//       if (name) {
//         localStorage.setItem('username', name);
//       }
      
//       // Create a new room
//       const response = await axios.post('http://localhost:8001/api/rooms/create/', {
//         name: `${name}'s Room`
//       });
      
//       const newRoomId = response.data.room_id;
      
//       // Navigate to AI partner selection with the new room ID
//       navigate(`/select-partners`, { state: { roomId: newRoomId } });
//     } catch (error) {
//       console.error("Error creating room:", error);
//       setError("Failed to create room. Please try again later.");
//     } finally {
//       setIsCreatingRoom(false);
//     }
//   };
  
//   return (
//     <HomeContainer>
//       <Title>BrainstorMate</Title>
      
//       <Form onSubmit={handleJoin}>
//         <InputGroup>
//           <Label htmlFor="name">Your Name</Label>
//           <Input
//             id="name"
//             type="text"
//             placeholder="Enter your name"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             required
//           />
//         </InputGroup>
        
//         <InputGroup>
//           <Label htmlFor="roomId">Room ID</Label>
//           <Input
//             id="roomId"
//             type="text"
//             placeholder="Enter room ID to join"
//             value={roomId}
//             onChange={(e) => setRoomId(e.target.value)}
//             required
//           />
//         </InputGroup>
        
//         {error && (
//           <ErrorMessage role="alert">
//             {error}
//           </ErrorMessage>
//         )}
        
//         <ButtonContainer>
//           <SecondaryButton
//             type="button"
//             onClick={handleCreate}
//             disabled={!name || isCreatingRoom || isJoiningRoom}
//           >
//             {isCreatingRoom ? 'Creating...' : 'Create Room'}
//           </SecondaryButton>
          
//           <Button 
//             type="submit"
//             disabled={!name || !roomId || isCreatingRoom || isJoiningRoom}
//           >
//             {isJoiningRoom ? 'Joining...' : 'Join Room'}
//           </Button>
//         </ButtonContainer>
//       </Form>
//     </HomeContainer>
//   );
// };

// export default Home;
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