// import React, { useState, useEffect, useRef } from 'react';
// import styled from 'styled-components';
// import axios from 'axios';

// const ChatContainer = styled.div`
//   position: absolute;
//   bottom: 10px;
//   right: 10px;
//   width: 350px;
//   height: 650px;
//   background-color: white;
//   border-radius: 10px;
//   box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
//   display: flex;
//   flex-direction: column;
//   overflow: hidden;
//   z-index: 100;
// `;

// const ChatHeader = styled.div`
//   padding: 10px;
//   background-color: #f5f5f5;
//   border-bottom: 1px solid #e0e0e0;
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
// `;

// const StatusIndicator = styled.span`
//   height: 10px;
//   width: 10px;
//   border-radius: 50%;
//   display: inline-block;
//   margin-right: 5px;
//   background-color: ${props => props.connected ? 'green' : 'red'};
// `;

// const CloseButton = styled.button`
//   background: none;
//   border: none;
//   font-size: 18px;
//   cursor: pointer;
// `;

// const MessagesContainer = styled.div`
//   flex: 1;
//   padding: 10px;
//   overflow-y: auto;
//   display: flex;
//   flex-direction: column;
//   gap: 10px;
// `;

// const Message = styled.div`
//   padding: 8px 12px;
//   border-radius: 15px;
//   max-width: 70%;
//   word-break: break-word;
  
//   background-color: ${props => props.isFromUser ? '#dcf8c6' : '#f0f0f0'};
//   align-self: ${props => props.isFromUser ? 'flex-end' : 'flex-start'};
// `;

// const MessageSender = styled.div`
//   font-size: 12px;
//   margin-bottom: 2px;
//   color: #666;
// `;

// const InputArea = styled.div`
//   display: flex;
//   padding: 10px;
//   border-top: 1px solid #e0e0e0;
// `;

// const Input = styled.input`
//   flex: 1;
//   padding: 8px;
//   border: 1px solid #ddd;
//   border-radius: 20px;
//   outline: none;
// `;

// const SendButton = styled.button`
//   margin-left: 10px;
//   background: none;
//   border: none;
//   font-size: 20px;
//   cursor: pointer;
//   opacity: ${props => props.disabled ? 0.5 : 1};
// `;

// const SystemMessage = styled.div`
//   padding: 5px 10px;
//   text-align: center;
//   color: #666;
//   font-size: 12px;
//   margin: 5px 0;
// `;

// const Chat = ({ roomId, socket: initialSocket, onClose }) => {
//   const [messages, setMessages] = useState([]);
//   const [inputMessage, setInputMessage] = useState('');
//   const [socket, setSocket] = useState(initialSocket);
//   const [isConnected, setIsConnected] = useState(!!initialSocket && initialSocket.readyState === WebSocket.OPEN);
//   const [currentUser, setCurrentUser] = useState('');
//   const messagesEndRef = useRef(null);
//   const reconnectTimeoutRef = useRef(null);
//   const reconnectAttempts = useRef(0);
//   const maxReconnectAttempts = 5;

//   // 獲取當前用戶資訊
//   useEffect(() => {
//     // 從localStorage獲取用戶名
//     const username = localStorage.getItem('username');
//     if (username) {
//       setCurrentUser(username);
//       console.log('Current user:', username);
//     } else {
//       console.warn('Username not found');
//       // 可能需要處理未登入的情況
//     }
//   }, []);

//   // 創建或重新連接WebSocket
//   const connectWebSocket = () => {
//     if (reconnectAttempts.current >= maxReconnectAttempts) {
//       setMessages(prev => [...prev, {
//         id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//         content: "Unable to connect to server. Please refresh the page and try again.",
//         is_system: true,
//         created_at: new Date().toISOString()
//       }]);
//       return;
//     }

//     // 清除任何現有的重連超時
//     if (reconnectTimeoutRef.current) {
//       clearTimeout(reconnectTimeoutRef.current);
//     }

//     // 關閉現有的WebSocket連接
//     if (socket && socket.readyState !== WebSocket.CLOSED) {
//       socket.close();
//     }

//     // 創建新的WebSocket連接
//     try {
//       const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
//       const wsUrl = `${protocol}//${window.location.host}/ws/chat/${roomId}/`;
//       console.log(`Attempting to connect to ${wsUrl}`);
      
//       const newSocket = new WebSocket(wsUrl);
      
//       newSocket.onopen = () => {
//         console.log('WebSocket connection opened');
//         setIsConnected(true);
//         reconnectAttempts.current = 0;
//         setMessages(prev => [...prev, {
//           id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//           content: "Connected to chat server",
//           is_system: true,
//           created_at: new Date().toISOString()
//         }]);
//       };
      
//       newSocket.onclose = () => {
//         console.log('WebSocket connection closed');
//         setIsConnected(false);
        
//         // 計劃重新連接
//         const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
//         reconnectAttempts.current++;
        
//         setMessages(prev => [...prev, {
//           id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//           content: `Connection lost. Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`,
//           is_system: true,
//           created_at: new Date().toISOString()
//         }]);
        
//         reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
//       };
      
//       newSocket.onerror = (error) => {
//         console.error('WebSocket error:', error);
//       };
      
//       setSocket(newSocket);
//     } catch (error) {
//       console.error('Error creating WebSocket connection:', error);
      
//       // 如果連接失敗，嘗試重新連接
//       const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
//       reconnectAttempts.current++;
//       reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
//     }
//   };

//   // 初始設置和清理
//   useEffect(() => {
//     if (!roomId) {
//       console.log("Invalid roomId");
//       return;
//     }

//     // 如果沒有提供socket或者socket已關閉，則創建新的連接
//     if (!initialSocket || initialSocket.readyState !== WebSocket.OPEN) {
//       connectWebSocket();
//     } else {
//       setSocket(initialSocket);
//       setIsConnected(true);
//     }

//     // 清理函數
//     return () => {
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//       }
//       // 不要在這裡關閉socket，因為它可能正在其他組件中使用
//     };
//   }, [roomId, initialSocket]);

//   // 檢查socket狀態
//   useEffect(() => {
//     if (socket) {
//       setIsConnected(socket.readyState === WebSocket.OPEN);
//     } else {
//       setIsConnected(false);
//     }
//   }, [socket]);

//   // 消息處理
//   useEffect(() => {
//     if (!socket) {
//       return;
//     }

//     const messageHandler = (event) => {
//       console.log("Received event:", event.data);
//       try {
//         const data = JSON.parse(event.data);
//         if (data.type === 'message') {
//           setMessages((prev) => [
//             ...prev,
//             {
//               id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//               sender: data.sender,
//               content: data.message,
//               is_ai: data.is_ai,
//               created_at: new Date().toISOString(),
//             },
//           ]);
//         }
//       } catch (error) {
//         console.error('Error parsing message:', error);
//       }
//     };

//     socket.addEventListener('message', messageHandler);

//     return () => {
//       socket.removeEventListener('message', messageHandler);
//     };
//   }, [socket]);

//   // 獲取歷史消息
//   useEffect(() => {
//     if (!roomId) {
//       return;
//     }

//     const fetchMessages = async () => {
//       try {
//         const response = await axios.get(`/api/rooms/${roomId}/messages/`);
//         setMessages(response.data);
//       } catch (error) {
//         console.error('Error fetching messages:', error);
//       }
//     };

//     fetchMessages();
//   }, [roomId]);

//   // 滾動到底部
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   // 發送消息
//   const sendMessage = () => {
//     if (!inputMessage.trim()) {
//       return;
//     }

//     if (!socket || socket.readyState !== WebSocket.OPEN) {
//       setMessages(prev => [...prev, {
//         id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//         content: "Unable to send message: Not connected to server",
//         is_system: true,
//         created_at: new Date().toISOString()
//       }]);
      
//       // 嘗試重新連接
//       connectWebSocket();
//       return;
//     }else{
//       console.log('socket error');
//     }

//     // 確保我們有用戶名
//     const username = currentUser || localStorage.getItem('username');
//     if (!username) {
//       console.error('Cannot send message: Username not found');
//       return;
//     }
    
//     try {
//       // 建立要發送的消息對象
//       const messageObj = {
//         type: 'message',
//         message: inputMessage,
//         sender: username,
//         is_ai: false,
//         message_type: 'chat'
//       };
      
//       // 發送消息到服務器
//       socket.send(JSON.stringify(messageObj));
      
//       // 在本地也顯示剛發送的消息（不依賴服務器響應）
//       const newMessage = {
//         id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//         sender: username,
//         content: inputMessage,
//         is_ai: false,
//         created_at: new Date().toISOString()
//       };
      
//       // 將新消息添加到消息列表
//       // setMessages(prev => [...prev, newMessage]);
      
//       // 清空輸入框
//       setInputMessage('');
      
//       console.log('Message sent and displayed locally:', newMessage);
//     } catch (error) {
//       console.error('Error sending message:', error);
//       setMessages(prev => [...prev, {
//         id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//         content: "Failed to send message",
//         is_system: true,
//         created_at: new Date().toISOString()
//       }]);
      
//       // 如果發送失敗，嘗試重新連接
//       connectWebSocket();
//     }
//   };

//   // 處理Enter鍵按下
//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter') {
//       sendMessage();
//     }
//   };

//   // 檢查消息是否來自當前用戶
//   const isMessageFromCurrentUser = (messageSender) => {
//     return messageSender === currentUser;
//   };

//   return (
//     <ChatContainer>
//       <ChatHeader>
//         <div>
//           <StatusIndicator connected={isConnected} />
//           <span>Chat ({currentUser})</span>
//         </div>
//         <CloseButton onClick={onClose}>×</CloseButton>
//       </ChatHeader>
      
//       <MessagesContainer>
//         {messages.map((message, index) => {
//           // 處理系統消息
//           if (message.is_system) {
//             return <SystemMessage key={message.id || index}>{message.content}</SystemMessage>;
//           }
          
//           // 確定消息是否來自當前用戶
//           const isFromUser = isMessageFromCurrentUser(message.sender);
          
//           return (
//             <Message key={message.id || index} isFromUser={isFromUser}>
//               {!isFromUser && <MessageSender>{message.sender}</MessageSender>}
//               {message.content}
//             </Message>
//           );
//         })}
//         <div ref={messagesEndRef} />
//       </MessagesContainer>
      
//       <InputArea>
//         <Input
//           value={inputMessage}
//           onChange={(e) => setInputMessage(e.target.value)}
//           onKeyPress={handleKeyPress}
//           placeholder="Type a message..."
//           disabled={!isConnected}
//         />
//         <SendButton onClick={sendMessage} disabled={!isConnected || !inputMessage.trim()}>➤</SendButton>
//       </InputArea>
//     </ChatContainer>
//   );
// };

// export default Chat;