// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   KeyboardAvoidingView,
//   Platform,
//   SafeAreaView
// } from 'react-native';
// import axios from 'axios';
// import { Feather } from '@expo/vector-icons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import API_CONFIG from '../config/config';

// const Chat = ({ messages: initialMessages = [], onSendMessage, onClose, roomId, socket: initialSocket }) => {
//   const [messages, setMessages] = useState(initialMessages);
//   const [inputMessage, setInputMessage] = useState('');
//   const [socket, setSocket] = useState(initialSocket);
//   const [isConnected, setIsConnected] = useState(!!initialSocket && initialSocket.readyState === 1);
//   const [currentUser, setCurrentUser] = useState('');
//   const flatListRef = useRef(null);
//   const reconnectTimeoutRef = useRef(null);
//   const reconnectAttempts = useRef(0);
//   const maxReconnectAttempts = 5;

//   // Get current user info
//   useEffect(() => {
//     const fetchUsername = async () => {
//       try {
//         // Get username from AsyncStorage
//         const username = await AsyncStorage.getItem('userName');
//         if (username) {
//           setCurrentUser(username);
//           console.log('Current user:', username);
//         } else {
//           console.warn('Username not found');
//         }
//       } catch (error) {
//         console.error('Error fetching username:', error);
//       }
//     };

//     fetchUsername();
//   }, []);

//   // Create or reconnect WebSocket
//   const connectWebSocket = () => {
//     if (reconnectAttempts.current >= API_CONFIG.RECONNECTION.MAX_ATTEMPTS) {
//       setMessages(prev => [
//         ...prev,
//         {
//           id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//           content: "Unable to connect to server. Please refresh the page and try again.",
//           is_system: true,
//           created_at: new Date().toISOString()
//         }
//       ]);
//       return;
//     }

//     // Clear any existing reconnect timeout
//     if (reconnectTimeoutRef.current) {
//       clearTimeout(reconnectTimeoutRef.current);
//     }

//     // Close existing WebSocket connection
//     if (socket && socket.readyState !== WebSocket.CLOSED) {
//       socket.close();
//     }

//     // Create new WebSocket connection
//     try {
//       const wsUrl = `${API_CONFIG.WS_BASE_URL}${API_CONFIG.WS_ENDPOINTS.CHAT(roomId)}`;
//       console.log(`Attempting to connect to ${wsUrl}`);
      
//       const newSocket = new WebSocket(wsUrl);
      
//       newSocket.onopen = () => {
//         console.log('WebSocket connection opened');
//         setIsConnected(true);
//         reconnectAttempts.current = 0;
//         setMessages(prev => [
//           ...prev,
//           {
//             id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//             content: "Connected to chat server",
//             is_system: true,
//             created_at: new Date().toISOString()
//           }
//         ]);
//       };
      
//       newSocket.onclose = () => {
//         console.log('WebSocket connection closed');
//         setIsConnected(false);
        
//         // Plan to reconnect
//         const delay = Math.min(
//           API_CONFIG.RECONNECTION.INITIAL_DELAY * Math.pow(2, reconnectAttempts.current),
//           API_CONFIG.RECONNECTION.MAX_DELAY
//         );
//         reconnectAttempts.current++;
        
//         setMessages(prev => [
//           ...prev,
//           {
//             id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//             content: `Connection lost. Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`,
//             is_system: true,
//             created_at: new Date().toISOString()
//           }
//         ]);
        
//         reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
//       };
      
//       newSocket.onerror = (error) => {
//         console.error('WebSocket error:', error);
//       };
      
//       setSocket(newSocket);
//     } catch (error) {
//       console.error('Error creating WebSocket connection:', error);
      
//       // If connection fails, try to reconnect
//       const delay = Math.min(
//         API_CONFIG.RECONNECTION.INITIAL_DELAY * Math.pow(2, reconnectAttempts.current),
//         API_CONFIG.RECONNECTION.MAX_DELAY
//       );
//       reconnectAttempts.current++;
//       reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
//     }
//   };

//   // Initial setup and cleanup
//   useEffect(() => {
//     if (!roomId) {
//       console.log("Invalid roomId");
//       return;
//     }

//     // If no socket is provided or the socket is closed, create a new connection
//     if (!initialSocket || initialSocket.readyState !== 1) {
//       connectWebSocket();
//     } else {
//       setSocket(initialSocket);
//       setIsConnected(true);
//     }

//     // Cleanup function
//     return () => {
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//       }
//       // Don't close the socket here as it might be used by other components
//     };
//   }, [roomId, initialSocket]);

//   // Check socket status
//   useEffect(() => {
//     if (socket) {
//       setIsConnected(socket.readyState === 1);
//     } else {
//       setIsConnected(false);
//     }
//   }, [socket]);

//   // Message handling
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

//   // Fetch message history
//   useEffect(() => {
//     if (!roomId) {
//       return;
//     }

//     const fetchMessages = async () => {
//       try {
//         const response = await axios.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROOMS.MESSAGES(roomId)}`);
//         setMessages(response.data);
//       } catch (error) {
//         console.error('Error fetching messages:', error);
//       }
//     };

//     fetchMessages();
//   }, [roomId]);

//   // Scroll to bottom when messages change
//   useEffect(() => {
//     if (flatListRef.current && messages.length > 0) {
//       flatListRef.current.scrollToEnd({ animated: true });
//     }
//   }, [messages]);

//   // Send message
//   const sendMessage = () => {
//     if (!inputMessage.trim()) {
//       return;
//     }

//     if (!socket || socket.readyState !== 1) {
//       setMessages(prev => [
//         ...prev,
//         {
//           id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//           content: "Unable to send message: Not connected to server",
//           is_system: true,
//           created_at: new Date().toISOString()
//         }
//       ]);
      
//       // Try to reconnect
//       connectWebSocket();
//       return;
//     }

//     // Make sure we have a username
//     const username = currentUser || AsyncStorage.getItem('userName');
//     if (!username) {
//       console.error('Cannot send message: Username not found');
//       return;
//     }
    
//     try {
//       // Create message object to send
//       const messageObj = {
//         type: 'message',
//         message: inputMessage,
//         sender: username,
//         is_ai: false,
//         message_type: 'chat'
//       };
      
//       // Send message to server
//       socket.send(JSON.stringify(messageObj));
      
//       // Also use the provided onSendMessage function if available
//       if (onSendMessage) {
//         onSendMessage(inputMessage);
//       }
      
//       // Clear input
//       setInputMessage('');
      
//       console.log('Message sent:', messageObj);
//     } catch (error) {
//       console.error('Error sending message:', error);
//       setMessages(prev => [
//         ...prev,
//         {
//           id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//           content: "Failed to send message",
//           is_system: true,
//           created_at: new Date().toISOString()
//         }
//       ]);
      
//       // If sending fails, try to reconnect
//       connectWebSocket();
//     }
//   };

//   // Check if message is from current user
//   const isMessageFromCurrentUser = (messageSender) => {
//     return messageSender === currentUser;
//   };

//   // Render message item
//   const renderMessageItem = ({ item }) => {
//     // Handle system message
//     if (item.is_system) {
//       return <Text style={styles.systemMessage}>{item.content}</Text>;
//     }
    
//     // Determine if message is from current user
//     const isFromUser = isMessageFromCurrentUser(item.sender);
    
//     return (
//       <View style={[
//         styles.messageContainer,
//         isFromUser ? styles.userMessageContainer : styles.otherMessageContainer
//       ]}>
//         {!isFromUser && <Text style={styles.messageSender}>{item.sender}</Text>}
//         <View style={[
//           styles.messageBubble,
//           isFromUser ? styles.userMessageBubble : styles.otherMessageBubble
//         ]}>
//           <Text style={styles.messageText}>{item.content}</Text>
//         </View>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <View style={styles.headerLeft}>
//           <View style={[styles.statusIndicator, { backgroundColor: isConnected ? 'green' : 'red' }]} />
//           <Text style={styles.headerTitle}>Chat ({currentUser})</Text>
//         </View>
//         <TouchableOpacity onPress={onClose} style={styles.closeButton}>
//           <Feather name="x" size={24} color="#333" />
//         </TouchableOpacity>
//       </View>

//       <FlatList
//         ref={flatListRef}
//         data={messages}
//         renderItem={renderMessageItem}
//         keyExtractor={(item, index) => item.id || `msg-${index}`}
//         style={styles.messagesContainer}
//         contentContainerStyle={styles.messagesList}
//         onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
//         onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
//       />

//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         keyboardVerticalOffset={100}
//         style={styles.inputArea}
//       >
//         <TextInput
//           style={styles.input}
//           value={inputMessage}
//           onChangeText={setInputMessage}
//           placeholder="Type a message..."
//           placeholderTextColor="#999"
//           editable={isConnected}
//           onSubmitEditing={sendMessage}
//           returnKeyType="send"
//         />
//         <TouchableOpacity 
//           style={[styles.sendButton, !isConnected || !inputMessage.trim() ? styles.disabledButton : {}]} 
//           onPress={sendMessage}
//           disabled={!isConnected || !inputMessage.trim()}
//         >
//           <Feather name="send" size={20} color={!isConnected || !inputMessage.trim() ? "#999" : "#2a70e0"} />
//         </TouchableOpacity>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e0e0e0',
//   },
//   headerLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   statusIndicator: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     marginRight: 8,
//   },
//   headerTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   closeButton: {
//     padding: 4,
//   },
//   messagesContainer: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   messagesList: {
//     padding: 10,
//   },
//   messageContainer: {
//     marginBottom: 10,
//     maxWidth: '80%',
//   },
//   userMessageContainer: {
//     alignSelf: 'flex-end',
//   },
//   otherMessageContainer: {
//     alignSelf: 'flex-start',
//   },
//   messageSender: {
//     fontSize: 12,
//     color: '#666',
//     marginBottom: 2,
//     marginLeft: 10,
//   },
//   messageBubble: {
//     borderRadius: 18,
//     padding: 10,
//     paddingVertical: 8,
//   },
//   userMessageBubble: {
//     backgroundColor: '#dcf8c6',
//   },
//   otherMessageBubble: {
//     backgroundColor: '#fff',
//   },
//   messageText: {
//     fontSize: 14,
//   },
//   systemMessage: {
//     textAlign: 'center',
//     color: '#666',
//     fontSize: 12,
//     margin: 10,
//   },
//   inputArea: {
//     flexDirection: 'row',
//     padding: 10,
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderTopColor: '#e0e0e0',
//   },
//   input: {
//     flex: 1,
//     backgroundColor: '#f0f0f0',
//     borderRadius: 20,
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     marginRight: 10,
//     fontSize: 14,
//   },
//   sendButton: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#f0f0f0',
//   },
//   disabledButton: {
//     opacity: 0.5,
//   },
// });

// export default Chat;