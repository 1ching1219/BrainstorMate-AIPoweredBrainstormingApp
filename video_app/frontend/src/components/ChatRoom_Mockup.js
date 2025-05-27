import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMessageSquare, FiX } from "react-icons/fi";
import { RiVoiceprintLine } from "react-icons/ri";
import { RxExit } from "react-icons/rx";

const ChatRoom_Mockup = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [demoStarted, setDemoStarted] = useState(false);
  const messagesEndRef = useRef(null);
  
  const roomId = "Q4ZLSQRV";
  const userName = "Brain";
  const humanPartnerB = "B";
  
  const aiPartners = [
    { name: 'Designer', avatarImg: '../../img/designer.png', role: 'Designer' },
    { name: 'Engineer', avatarImg: '../../img/engineer.png', role: 'Engineer' },
    { name: 'Marketing', avatarImg: '../../img/finance.png', role: 'Marketing' }
  ];

  const mockupConversation = [
    {
      sender: userName,
      content: "I've got an idea—a wearable that detects emotions in real time. But I'm stuck. How do we bring it to life?",
      is_ai: false,
      delay: 3000
    },
    {
      sender: 'Designer',
      content: "Interesting! How should it look and feel? Should it be subtle, like jewelry? Or bold, like a statement piece?",
      is_ai: true,
      delay: 3000
    },
    {
      sender: 'Engineer',
      content: "What kind of sensors are we talking about? Real-time processing means we need low-latency hardware—and maybe machine learning.",
      is_ai: true,
      delay: 3000
    },
    {
      sender: 'Marketing',
      content: "Who's it for? Stressed workers? Athletes? Students? The story changes everything.",
      is_ai: true,
      delay: 3000
    },
    {
      sender: userName,
      content: "Wow—everyone's looking at this from a different angle.",
      is_ai: false,
      delay: 3000
    },
    {
      sender: humanPartnerB,
      content: "And that's exactly what we needed.",
      is_ai: false,
      delay: 3000
    }
  ];

  // Initialize with system message
  useEffect(() => {
    setMessages([{
      id: 'system-1',
      content: "Connected to chat server",
      is_system: true,
      created_at: new Date().toISOString()
    }]);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle the mockup conversation flow
  const startMockupConversation = () => {
    setDemoStarted(true);
    setCurrentStep(0);
    // Start with the first message immediately
    addMessage(mockupConversation[0]);
    
    // Schedule the rest of the messages
    let cumulativeDelay = 0;
    for (let i = 1; i < mockupConversation.length; i++) {
      cumulativeDelay += mockupConversation[i].delay;
      setTimeout(() => {
        addMessage(mockupConversation[i]);
        setCurrentStep(i);
      }, cumulativeDelay);
    }
  };

  const addMessage = (messageData) => {
    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: messageData.sender,
      content: messageData.content,
      is_ai: messageData.is_ai,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    // Add user's message
    addMessage({
      sender: userName,
      content: inputMessage,
      is_ai: false
    });
    
    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const isMessageFromCurrentUser = (messageSender) => {
    return messageSender === userName;
  };

  const isMessageFromAI = (messageSender) => {
    return aiPartners.some(agent => agent.name === messageSender);
  };

  const shouldShowAvatar = (message, index) => {
    if (index === 0) return true;
    if (messages[index - 1].sender !== message.sender) return true;
    return false;
  };

  const isInputEmpty = !inputMessage.trim();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#f9f9f9'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        minHeight: '48px',
        backgroundColor: 'white'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{
            height: '8px',
            width: '8px',
            borderRadius: '50%',
            display: 'inline-block',
            marginRight: '8px',
            backgroundColor: isConnected ? 'green' : 'red'
          }} />
          Room {roomId}
        </h2>
        <button style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: 'white',
          color: 'black',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '10px'
        }}>
          <RxExit size={20} />
        </button>
      </div>
      
      {/* Chat Section */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '900px',
        width: '100%',
        margin: '0 auto',
        padding: '16px',
        overflow: 'hidden'
      }}>
        {/* Messages Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          {messages.map((message, index) => {
            // Handle system messages
            if (message.is_system) {
              return (
                <div key={message.id || `system-${index}`} style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '12px',
                  margin: '8px 0',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '12px',
                  alignSelf: 'center'
                }}>
                  {message.content}
                </div>
              );
            }
            
            const isFromUser = isMessageFromCurrentUser(message.sender);
            const isFromAI = isMessageFromAI(message.sender);
            const showAvatar = !isFromUser && shouldShowAvatar(message, index);
            
            return (
              <div key={message.id || `msg-${index}`} style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: isFromUser ? 'flex-end' : 'flex-start',
                marginBottom: '8px',
                gap: '8px'
              }}>
                {!isFromUser && (
                  <div style={{ width: '40px' }}>
                    {showAvatar && (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#e0e0e0',
                        overflow: 'hidden',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }}>
                        {isFromAI ? (
                          <img 
                            src={aiPartners.find(ai => ai.name === message.sender)?.avatarImg || '/img/default.png'} 
                            alt={message.sender} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#4a72d4',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            {message.sender.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '15px',
                  maxWidth: '70%',
                  wordBreak: 'break-word',
                  position: 'relative',
                  backgroundColor: isFromAI ? '#f0f0f0' : (isFromUser ? '#dcf8c6' : '#e3f2fd')
                }}>
                  {!isFromUser && (
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      marginBottom: '4px',
                      color: isFromAI ? '#4a72d4' : '#666',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {message.sender}
                    </div>
                  )}
                  {message.content}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div style={{
          display: 'flex',
          padding: '16px 10px',
          backgroundColor: 'transparent'
        }}>
          <input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #ddd',
              borderRadius: '24px',
              outline: 'none',
              fontSize: '14px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}
          />
          <button
            onClick={isInputEmpty ? () => navigate('/voice-mockup') : handleSendMessage}
            disabled={!isConnected}
            style={{
              marginLeft: '10px',
              backgroundColor: isInputEmpty ? '#363434' : '#2a70e0',
              color: 'white',
              border: 'none',
              height: '42px',
              width: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            {isInputEmpty ? <RiVoiceprintLine size={18} /> : '➤'}
          </button>
        </div>
      </div>
      
      {/* Demo Control */}
      {!demoStarted && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={startMockupConversation}
            style={{
              backgroundColor: '#2a70e0',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '24px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            Start Demo Conversation
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatRoom_Mockup;