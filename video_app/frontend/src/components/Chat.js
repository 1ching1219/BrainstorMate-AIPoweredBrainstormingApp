// frontend/src/components/Chat.js
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const ChatContainer = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 350px;
  height: 650px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100;
`;

const ChatHeader = styled.div`
  padding: 10px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Message = styled.div`
  padding: 8px 12px;
  border-radius: 15px;
  max-width: 70%;
  word-break: break-word;
  
  background-color: ${props => props.isFromUser ? '#dcf8c6' : '#f0f0f0'};
  align-self: ${props => props.isFromUser ? 'flex-end' : 'flex-start'};
`;

const MessageSender = styled.div`
  font-size: 12px;
  margin-bottom: 2px;
  color: #666;
`;

const InputArea = styled.div`
  display: flex;
  padding: 10px;
  border-top: 1px solid #e0e0e0;
`;

const Input = styled.input`
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
`;

const SendButton = styled.button`
  margin-left: 10px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
`;
const Chat = ({ roomId, socket, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch messages when component mounts or roomId changes
  // useEffect(() => {
  //   if (!roomId) {
  //     console.error("Invalid roomId");
  //     return;
  //   }

  //   const fetchMessages = async () => {
  //     try {
  //       const response = await axios.get(`/api/rooms/${roomId}/messages/`);
  //       setMessages(response.data);
  //     } catch (error) {
  //       console.error('Error fetching messages:', error);
  //     }
  //   };
    
  //   fetchMessages();
    
  //   // WebSocket message listener
  //   if (socket) {
  //     const messageHandler = (event) => {
  //       const data = JSON.parse(event.data);
  //       if (data.type === 'message') {
  //         setMessages(prev => [
  //           ...prev, 
  //           {
  //             id: Date.now(),
  //             sender: data.sender,
  //             content: data.message,
  //             is_ai: data.is_ai,
  //             created_at: new Date().toISOString()
  //           }
  //         ]);
  //       }
  //     };
      
  //     socket.addEventListener('message', messageHandler);

  //     return () => {
  //       socket.removeEventListener('message', messageHandler);
  //     };
  //   }
  // }, [roomId, socket]);
  // Fetch messages when roomId changes
  useEffect(() => {
    if (!roomId) {
      console.log("Socket is null");
      return;
    }
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/rooms/${roomId}/messages/`);
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [roomId]);

// Only run WebSocket listener when socket is available
  useEffect(() => {
    if (!socket) {
      console.log("Socket is null");
      return;
    }
    const messageHandler = (event) => {
      console.log("Received event:", event.data);
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: data.sender,
            content: data.message,
            is_ai: data.is_ai,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    };

    socket.addEventListener('message', messageHandler);

    return () => {
      socket.removeEventListener('message', messageHandler);
    };
  }, [socket]);


  // Scroll to the bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message
  const sendMessage = () => {
    if (!inputMessage.trim() || !socket) {
      console.log("Socket is null");
      return;
    }
    const username = localStorage.getItem('username');
    
    console.log({socket});
    console.log(inputMessage.trim());
    socket.send(JSON.stringify({
      type: 'message',
      message: inputMessage,
      sender: username,
      is_ai: false
    }));

    setMessages(prev => [
      ...prev, 
      {
        id: Date.now(),
        sender: username,
        content: inputMessage,
        is_ai: false,
        created_at: new Date().toISOString()
      }
    ]);

    setInputMessage('');
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <span>Chat</span>
        <CloseButton onClick={onClose}>×</CloseButton>
      </ChatHeader>
      
      <MessagesContainer>
        {messages.map((message, index) => {
          const username = localStorage.getItem('username');
          const isFromUser = message.sender === username;
          
          return (
            <Message key={message.id || index} isFromUser={isFromUser}>
              {!isFromUser && <MessageSender>{message.sender}</MessageSender>}
              {message.content}
            </Message>
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
        />
        <SendButton onClick={sendMessage}>➤</SendButton>
      </InputArea>
    </ChatContainer>
  );
};

export default Chat;
