// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   FlatList,
//   SafeAreaView,
//   KeyboardAvoidingView,
//   Platform,
//   Dimensions,
//   ScrollView,
//   Image
// } from 'react-native';
// import { useRoute, useNavigation } from '@react-navigation/native';
// import { RTCPeerConnection, RTCView, mediaDevices } from 'react-native-webrtc';
// import { Feather } from '@expo/vector-icons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import Chat from './Chat'; // You'll need to create this component

// const { width, height } = Dimensions.get('window');

// const VideoRoom = () => {
//   const route = useRoute();
//   const navigation = useNavigation();
  
//   // Extract params from route
//   const roomId = route.params?.roomId;
//   const aiPartners = route.params?.aiPartners || [];
  
//   // State variables
//   const [userName, setUserName] = useState('You');
//   const [peers, setPeers] = useState([]);
//   const [participants, setParticipants] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [aiFeedback, setAiFeedback] = useState([]);
//   const [showChat, setShowChat] = useState(false);
//   const [videoEnabled, setVideoEnabled] = useState(true);
//   const [audioEnabled, setAudioEnabled] = useState(true);
  
//   // Pagination state
//   const [currentPage, setCurrentPage] = useState(1);
//   const participantsPerPage = 4;
  
//   // Refs
//   const localStream = useRef(null);
//   const socketRef = useRef(null);
//   const peersRef = useRef([]);
//   const peerConnections = useRef({});
  
//   // Put current user first, then other participants
//   const humanParticipants = [{ id: userName, isCurrentUser: true }, ...peers];
//   const totalPages = Math.ceil(humanParticipants.length / participantsPerPage);
  
//   // Get current participants for the page
//   const indexOfLastParticipant = currentPage * participantsPerPage;
//   const indexOfFirstParticipant = indexOfLastParticipant - participantsPerPage;
//   const currentParticipants = humanParticipants.slice(
//     indexOfFirstParticipant,
//     indexOfLastParticipant
//   );

//   useEffect(() => {
//     const initAsync = async () => {
//       // Get username from AsyncStorage
//       const storedUserName = await AsyncStorage.getItem('userName');
//       if (storedUserName) {
//         setUserName(storedUserName);
//       }

//       // Set up WebRTC
//       setupMediaDevices();
      
//       // Connect to WebSocket
//       connectToWebSocket();
      
//       // Fetch participants and messages
//       fetchParticipants();
//       fetchMessages();
//     };
    
//     initAsync();
    
//     return () => {
//       // Clean up
//       if (localStream.current) {
//         localStream.current.getTracks().forEach(track => track.stop());
//       }
      
//       if (socketRef.current) {
//         socketRef.current.close();
//       }
      
//       // Clean up peer connections
//       Object.values(peerConnections.current).forEach(pc => {
//         pc.close();
//       });
//     };
//   }, [roomId]);
  
//   useEffect(() => {
//     if (aiPartners.length > 0) {
//       // Add delay to avoid frequent triggering
//       const timeout = setTimeout(() => {
//         generateAIFeedback();
//       }, 5000); // 5 seconds delay before AI feedback appears
  
//       return () => clearTimeout(timeout);
//     }
//   }, [aiPartners]);
  
//   const setupMediaDevices = async () => {
//     try {
//       const constraints = { audio: true, video: { facingMode: 'user' } };
//       const stream = await mediaDevices.getUserMedia(constraints);
      
//       localStream.current = stream;
      
//       // Join room after media setup
//       joinRoom();
//     } catch (error) {
//       console.error("Error accessing media devices:", error);
//       alert("Could not access camera or microphone. Please check permissions.");
//     }
//   };
  
//   const connectToWebSocket = () => {
//     socketRef.current = new WebSocket(`ws://your-backend-url.com/ws/chat/${roomId}/`);
    
//     socketRef.current.onopen = () => {
//       console.log("WebSocket connection established");
      
//       // Signal to other participants that we've joined
//       socketRef.current.send(JSON.stringify({
//         type: 'signal',
//         signal: { type: 'new-participant' },
//         caller_id: userName
//       }));
//     };
    
//     socketRef.current.onmessage = (event) => {
//       const data = JSON.parse(event.data);
      
//       if (data.type === 'message') {
//         setMessages(prevMessages => [...prevMessages, {
//           sender: data.sender,
//           content: data.message,
//           is_ai: data.is_ai
//         }]);
        
//         // If AI message contains feedback, add it to feedback section
//         if (data.is_ai && data.message_type === 'feedback') {
//           setAiFeedback(prev => [...prev, {
//             agent: data.sender,
//             content: data.message
//           }]);
//         }
//       } else if (data.type === 'signal') {
//         handleSignal(data);
//       }
//     };
    
//     socketRef.current.onerror = (error) => {
//       console.error("WebSocket error:", error);
//     };
    
//     socketRef.current.onclose = () => {
//       console.log("WebSocket connection closed");
//     };
//   };
  
//   const joinRoom = async () => {
//     try {
//       // Register participant in the room
//       await axios.post(`/api/rooms/${roomId}/join/`, {
//         name: userName,
//         is_ai: false
//       });
      
//       // Register AI partners in the room
//       for (const agent of aiPartners) {
//         await axios.post(`/api/rooms/${roomId}/join/`, {
//           name: agent.name,
//           is_ai: true,
//           ai_agent: agent.id
//         });
//       }
//     } catch (error) {
//       console.error("Error joining room:", error);
//     }
//   };
  
//   const handleSignal = (data) => {
//     const { signal, caller_id, receiver_id } = data;
    
//     // If signal is for a new participant
//     if (signal.type === 'new-participant' && caller_id !== userName) {
//       createPeerConnection(caller_id);
      
//       socketRef.current.send(JSON.stringify({
//         type: 'signal',
//         signal: { type: 'participant-ready' },
//         caller_id: userName,
//         receiver_id: caller_id
//       }));
//     }
    
//     // If signal is from a participant who is ready to connect
//     else if (signal.type === 'participant-ready' && receiver_id === userName) {
//       createPeerConnection(caller_id, true);
//     }
    
//     // Handle WebRTC signaling
//     else if ((signal.sdp || signal.candidate) && peerConnections.current[caller_id]) {
//       handleWebRTCSignal(signal, caller_id);
//     }
//   };
  
//   const createPeerConnection = (participantId, isInitiator = false) => {
//     const pc = new RTCPeerConnection({
//       iceServers: [
//         { urls: 'stun:stun.l.google.com:19302' },
//         { urls: 'stun:stun1.l.google.com:19302' },
//       ]
//     });
    
//     // Add local stream to peer connection
//     if (localStream.current) {
//       localStream.current.getTracks().forEach(track => {
//         pc.addTrack(track, localStream.current);
//       });
//     }
    
//     // Handle ICE candidates
//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         socketRef.current.send(JSON.stringify({
//           type: 'signal',
//           signal: { candidate: event.candidate },
//           caller_id: userName,
//           receiver_id: participantId
//         }));
//       }
//     };
    
//     // Handle incoming streams
//     pc.ontrack = (event) => {
//       // Check if this peer is already in our peers list
//       const peerExists = peers.find(p => p.id === participantId);
      
//       if (!peerExists && event.streams[0]) {
//         setPeers(prevPeers => [
//           ...prevPeers,
//           {
//             id: participantId,
//             stream: event.streams[0]
//           }
//         ]);
//       }
//     };
    
//     // Store the peer connection
//     peerConnections.current[participantId] = pc;
    
//     // If we're the initiator, create and send an offer
//     if (isInitiator) {
//       pc.createOffer()
//         .then(offer => pc.setLocalDescription(offer))
//         .then(() => {
//           socketRef.current.send(JSON.stringify({
//             type: 'signal',
//             signal: { sdp: pc.localDescription },
//             caller_id: userName,
//             receiver_id: participantId
//           }));
//         })
//         .catch(error => console.error("Error creating offer:", error));
//     }
    
//     return pc;
//   };
  
//   const handleWebRTCSignal = (signal, participantId) => {
//     const pc = peerConnections.current[participantId];
    
//     if (!pc) return;
    
//     // Handle SDP (offer or answer)
//     if (signal.sdp) {
//       pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
//         .then(() => {
//           // If we received an offer, we need to create an answer
//           if (signal.sdp.type === 'offer') {
//             pc.createAnswer()
//               .then(answer => pc.setLocalDescription(answer))
//               .then(() => {
//                 socketRef.current.send(JSON.stringify({
//                   type: 'signal',
//                   signal: { sdp: pc.localDescription },
//                   caller_id: userName,
//                   receiver_id: participantId
//                 }));
//               })
//               .catch(error => console.error("Error creating answer:", error));
//           }
//         })
//         .catch(error => console.error("Error setting remote description:", error));
//     }
    
//     // Handle ICE candidate
//     else if (signal.candidate) {
//       pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
//         .catch(error => console.error("Error adding ICE candidate:", error));
//     }
//   };
  
//   const fetchParticipants = async () => {
//     try {
//       const response = await axios.get(`/api/rooms/${roomId}/participants/`);
//       setParticipants(response.data);
//     } catch (error) {
//       console.error("Error fetching participants:", error);
//     }
//   };
  
//   const fetchMessages = async () => {
//     try {
//       const response = await axios.get(`/api/rooms/${roomId}/messages/`);
//       setMessages(response.data);
//     } catch (error) {
//       console.error("Error fetching messages:", error);
//     }
//   };
  
//   const generateAIFeedback = () => {
//     // Simulated AI feedback for demonstration
//     // In a real application, this would come from an AI service
//     const initialFeedback = aiPartners.map(agent => ({
//       agent: agent.name,
//       content: `Hello, I'm ${agent.name}, your ${agent.role} AI assistant. I'm here to help with the meeting.`
//     }));
    
//     setAiFeedback(initialFeedback);
    
//     // Simulate AI sending periodic feedback
//     const feedbackInterval = setInterval(() => {
//       const randomAgent = aiPartners[Math.floor(Math.random() * aiPartners.length)];
//       if (randomAgent) {
//         const feedback = {
//           agent: randomAgent.name,
//           content: generateRandomFeedback(randomAgent.role)
//         };
        
//         setAiFeedback(prev => [...prev, feedback]);
        
//         // Also send to chat
//         if (socketRef.current) {
//           if (socketRef.current.readyState === WebSocket.OPEN) {
//             try {
//               socketRef.current.send(JSON.stringify({
//                 type: 'message',
//                 message: feedback.content,
//                 sender: feedback.agent,
//                 is_ai: true,
//                 message_type: 'feedback'
//               }));
//             } catch (error) {
//               console.log("Error sending message:", error);
//             }
//           } else {
//             console.log("WebSocket is not open. ReadyState:", socketRef.current.readyState);
//           }
//         }
//       }
//     }, 15000); // Every 15 seconds
    
//     return () => clearInterval(feedbackInterval);
//   };
  
//   const generateRandomFeedback = (role) => {
//     const feedbackOptions = {
//       'Designer': [
//         "I notice the UI elements could be more consistent. Consider a unified color scheme.",
//         "The user flow seems to have some friction points. We should simplify the navigation.",
//         "Visual hierarchy could be improved to guide users more effectively.",
//         "Have you considered accessibility in this design? Some elements may need better contrast."
//       ],
//       'Engineer': [
//         "The current architecture might have scaling issues with high user loads.",
//         "We should consider optimizing the database queries for better performance.",
//         "This would be a good opportunity to implement caching to reduce server load.",
//         "The current solution works, but we might want to refactor for better maintainability."
//       ],
//       'Finance': [
//         "Based on our projections, we should allocate more resources to marketing.",
//         "The ROI on this feature seems promising based on current metrics.",
//         "We need to consider the cost implications of this infrastructure change.",
//         "From a financial perspective, we should prioritize features with higher revenue potential."
//       ],
//       'Professor': [
//         "This approach aligns with recent research in the field.",
//         "Consider the theoretical implications of this decision framework.",
//         "We should examine some case studies that have implemented similar solutions.",
//         "The methodology needs more rigorous validation before proceeding."
//       ]
//     };
    
//     const options = feedbackOptions[role] || ["I have some insights to share about this discussion."];
//     return options[Math.floor(Math.random() * options.length)];
//   };
  
//   const toggleVideo = () => {
//     if (localStream.current) {
//       localStream.current.getVideoTracks().forEach(track => {
//         track.enabled = !videoEnabled;
//       });
//       setVideoEnabled(!videoEnabled);
//     }
//   };
  
//   const toggleAudio = () => {
//     if (localStream.current) {
//       localStream.current.getAudioTracks().forEach(track => {
//         track.enabled = !audioEnabled;
//       });
//       setAudioEnabled(!audioEnabled);
//     }
//   };
  
//   const leaveRoom = () => {
//     navigation.navigate('Home'); // Navigate to home screen
//   };
  
//   const sendMessage = (message) => {
//     if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
//       socketRef.current.send(JSON.stringify({
//         type: 'message',
//         message: message,
//         sender: userName,
//         is_ai: false
//       }));
//     }
//   };

//   // Pagination controls
//   const nextPage = () => {
//     if (currentPage < totalPages) {
//       setCurrentPage(currentPage + 1);
//     }
//   };

//   const prevPage = () => {
//     if (currentPage > 1) {
//       setCurrentPage(currentPage - 1);
//     }
//   };

//   const goToPage = (pageNumber) => {
//     setCurrentPage(pageNumber);
//   };
  
//   // Render each participant's video
//   const renderParticipantVideo = (participant, index) => {
//     if (participant.isCurrentUser) {
//       // Current user's video
//       return (
//         <View key={`user-${participant.id}`} style={styles.videoContainer}>
//           {videoEnabled && localStream.current ? (
//             <RTCView
//               streamURL={localStream.current.toURL()}
//               style={styles.rtcView}
//               mirror={true}
//               objectFit="cover"
//             />
//           ) : (
//             <View style={styles.avatarPlaceholder}>
//               <Text style={styles.avatarText}>{participant.id.charAt(0).toUpperCase()}</Text>
//             </View>
//           )}
//           <View style={styles.nameTag}>
//             <Text style={styles.nameText}>{userName} (You)</Text>
//           </View>
//         </View>
//       );
//     } else {
//       // Peer videos
//       return (
//         <View key={`peer-${participant.id}`} style={styles.videoContainer}>
//           {participant.stream ? (
//             <RTCView
//               streamURL={participant.stream.toURL()}
//               style={styles.rtcView}
//               objectFit="cover"
//             />
//           ) : (
//             <View style={styles.avatarPlaceholder}>
//               <Text style={styles.avatarText}>{participant.id.charAt(0).toUpperCase()}</Text>
//             </View>
//           )}
//           <View style={styles.nameTag}>
//             <Text style={styles.nameText}>{participant.id}</Text>
//           </View>
//         </View>
//       );
//     }
//   };
  
//   // Render empty video slots
//   const renderEmptySlot = (index) => (
//     <View key={`empty-${index}`} style={[styles.videoContainer, styles.emptySlot]}>
//       <Text style={styles.emptySlotText}>Empty Slot</Text>
//     </View>
//   );
  
//   // Render AI feedback item
//   const renderFeedbackItem = ({ item, index }) => (
//     <View style={styles.feedbackItem}>
//       <View style={styles.avatar}>
//         <Image 
//           source={{ uri: `https://your-domain.com/img/${item.agent.toLowerCase()}.png` }}
//           style={styles.avatarImage}
//           defaultSource={require('../assets/default-avatar.png')} // You'll need a default avatar
//         />
//       </View>
//       <View style={styles.feedbackContent}>
//         <Text style={styles.agentName}>{item.agent}</Text>
//         <Text style={styles.feedbackText}>{item.content}</Text>
//       </View>
//     </View>
//   );
  
//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Text style={styles.roomTitle}>Room {roomId}</Text>
//       </View>
      
//       {/* Main Content */}
//       <View style={styles.contentContainer}>
//         {/* AI Feedback Section */}
//         <View style={styles.feedbackSection}>
//           <Text style={styles.feedbackHeader}>AI Partner Feedback</Text>
//           <FlatList
//             data={aiFeedback}
//             renderItem={renderFeedbackItem}
//             keyExtractor={(item, index) => `feedback-${index}`}
//             contentContainerStyle={styles.feedbackList}
//           />
//         </View>
        
//         {/* Human Video Section */}
//         <View style={styles.videoSection}>
//           <View style={styles.videoGrid}>
//             {/* Render current participants */}
//             {currentParticipants.map(renderParticipantVideo)}
            
//             {/* Fill empty slots */}
//             {Array.from(
//               { length: Math.max(0, participantsPerPage - currentParticipants.length) },
//               (_, index) => renderEmptySlot(index)
//             )}
//           </View>
          
//           {/* Pagination controls - only show if totalPages > 1 */}
//           {totalPages > 1 && (
//             <View style={styles.paginationControls}>
//               <TouchableOpacity 
//                 style={[styles.navButton, currentPage === 1 && styles.disabledButton]}
//                 onPress={prevPage}
//                 disabled={currentPage === 1}
//               >
//                 <Text style={styles.navButtonText}>&lt;</Text>
//               </TouchableOpacity>
              
//               {Array.from({ length: totalPages }).map((_, i) => (
//                 <TouchableOpacity 
//                   key={`page-${i+1}`}
//                   style={[
//                     styles.pageButton, 
//                     i+1 === currentPage && styles.activePageButton
//                   ]}
//                   onPress={() => goToPage(i+1)}
//                 >
//                   <Text style={i+1 === currentPage ? styles.activePageText : styles.pageText}>
//                     {i+1}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
              
//               <TouchableOpacity 
//                 style={[styles.navButton, currentPage === totalPages && styles.disabledButton]}
//                 onPress={nextPage}
//                 disabled={currentPage === totalPages}
//               >
//                 <Text style={styles.navButtonText}>&gt;</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </View>
//       </View>
      
//       {/* Control Bar */}
//       <View style={styles.controlBar}>
//         <TouchableOpacity style={styles.chatButton} onPress={() => setShowChat(!showChat)}>
//           <Feather name="message-square" size={24} color="#333" />
//         </TouchableOpacity>
        
//         <TouchableOpacity style={styles.controlButton} onPress={toggleAudio}>
//           <Feather name={audioEnabled ? "mic" : "mic-off"} size={24} color="#333" />
//         </TouchableOpacity>
        
//         <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
//           <Feather name={videoEnabled ? "video" : "video-off"} size={24} color="#333" />
//         </TouchableOpacity>
        
//         <TouchableOpacity style={styles.dangerButton} onPress={leaveRoom}>
//           <Feather name="x" size={24} color="white" />
//         </TouchableOpacity>
//       </View>
      
//       {/* Chat Panel */}
//       {showChat && (
//         <KeyboardAvoidingView
//           behavior={Platform.OS === "ios" ? "padding" : "height"}
//           style={styles.chatPanelContainer}
//         >
//           <Chat
//             messages={messages}
//             onSendMessage={sendMessage}
//             onClose={() => setShowChat(false)}
//             roomId={roomId}
//             socket={socketRef.current}
//           />
//         </KeyboardAvoidingView>
//       )}
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
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e0e0e0',
//     minHeight: 48,
//   },
//   roomTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//   },
//   contentContainer: {
//     flex: 1,
//     flexDirection: 'column',
//   },
//   // On tablet/larger screens, we can use horizontal layout
//   '@media (min-width: 768)': {
//     contentContainer: {
//       flexDirection: 'row',
//     },
//   },
//   feedbackSection: {
//     flex: 1,
//     backgroundColor: '#fff',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderBottomWidth: 2,
//     borderBottomColor: '#2a70e0',
//   },
//   '@media (min-width: 768)': {
//     feedbackSection: {
//       width: '50%',
//       borderBottomWidth: 0,
//       borderRightWidth: 2,
//       borderRightColor: '#2a70e0',
//     },
//   },
//   feedbackHeader: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 16,
//     color: '#2a70e0',
//   },
//   feedbackList: {
//     paddingBottom: 16,
//   },
//   feedbackItem: {
//     flexDirection: 'row',
//     marginBottom: 16,
//   },
//   avatar: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#e0e0e0',
//     marginRight: 12,
//     overflow: 'hidden',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   avatarImage: {
//     width: '100%',
//     height: '100%',
//   },
//   feedbackContent: {
//     flex: 1,
//   },
//   agentName: {
//     fontWeight: '600',
//     fontSize: 14,
//     marginBottom: 4,
//   },
//   feedbackText: {
//     fontSize: 14,
//   },
//   videoSection: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//     padding: 16,
//     justifyContent: 'center',
//   },
//   '@media (min-width: 768)': {
//     videoSection: {
//       width: '50%',
//     },
//   },
//   videoGrid: {
//     flex: 1,
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   videoContainer: {
//     width: '48%',  // Almost half width to account for gap
//     aspectRatio: 4/3,
//     backgroundColor: '#000',
//     borderRadius: 8,
//     overflow: 'hidden',
//     marginBottom: 16,
//     justifyContent: 'center',
//     alignItems: 'center',
//     position: 'relative',
//   },
//   rtcView: {
//     flex: 1,
//     width: '100%',
//     height: '100%',
//   },
//   nameTag: {
//     position: 'absolute',
//     bottom: 10,
//     left: 10,
//     backgroundColor: 'rgba(0, 0, 0, 0.6)',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//   },
//   nameText: {
//     color: 'white',
//     fontSize: 12,
//   },
//   avatarPlaceholder: {
//     width: '100%',
//     height: '100%',
//     backgroundColor: '#333',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   avatarText: {
//     color: 'white',
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
//   emptySlot: {
//     backgroundColor: '#f0f0f0',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   emptySlotText: {
//     color: '#999',
//     fontSize: 14,
//   },
//   paginationControls: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginTop: 10,
//   },
//   navButton: {
//     backgroundColor: '#f0f0f0',
//     borderRadius: 15,
//     width: 30,
//     height: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginHorizontal: 5,
//   },
//   navButtonText: {
//     fontSize: 16,
//   },
//   disabledButton: {
//     opacity: 0.5,
//   },
//   pageButton: {
//     backgroundColor: '#f0f0f0',
//     borderRadius: 15,
//     width: 30,
//     height: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginHorizontal: 5,
//   },
//   activePageButton: {
//     backgroundColor: '#2a70e0',
//   },
//   pageText: {
//     color: '#333',
//     fontSize: 14,
//   },
//   activePageText: {
//     color: 'white',
//     fontSize: 14,
//   },
//   controlBar: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     padding: 16,
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderTopColor: '#e0e0e0',
//     minHeight: 64,
//   },
//   chatButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#f0f0f0',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 16,
//   },
//   controlButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#f0f0f0',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginHorizontal: 8,
//   },
//   dangerButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#ff4d4f',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginHorizontal: 8,
//   },
//   chatPanelContainer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: height * 0.7,
//     backgroundColor: 'white',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     shadowColor: "#000",
//     shadowOffset: {
//       width: 0,
//       height: -3,
//     },
//     shadowOpacity: 0.27,
//     shadowRadius: 4.65,
//     elevation: 6,
//   },
// });

//a basic page write text "Video Room"
import React from 'react';
import { View, Text } from 'react-native';

const VideoRoom = () => {
  return (
    <View>
      <Text>Video Room</Text>
    </View>
  );
};

export default VideoRoom;
