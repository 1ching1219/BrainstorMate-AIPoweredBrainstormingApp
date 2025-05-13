// export default VideoRoom;
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'react-native';
import { fonts } from '../config/fonts';

const { width, height } = Dimensions.get('window');

// Predefined static data
const STATIC_AI_PARTNERS = [
  { id: 1, name: 'Finance', role: 'Finance', 
    intro: 'Hello, I\'m Finance, your Finance AI assistant. I\'m here to help with the meeting.' },
  { id: 2, name: 'Engineer', role: 'Engineer',
    intro: 'Hello, I\'m Engineer, your Engineer AI assistant. I\'m here to help with the meeting.' },
  { id: 3, name: 'Designer', role: 'Designer',
    intro: 'Hello, I\'m Designer, your Designer AI assistant. I\'m here to help with the meeting.' }
];

const STATIC_HUMAN_PARTICIPANTS = [
  { id: 'you', name: 'test', isCurrentUser: true },
  { id: 'john', name: 'John Smith' },
  { id: 'sarah', name: 'Sarah Johnson' },
  { id: 'miguel', name: 'Miguel Rodriguez' },
];

// Predefined colors - updated to match the design in image
const PARTICIPANT_COLORS = {
  'you': '#333333',  // Dark gray for current user
  'john': '#f0f0f0',
  'sarah': '#f0f0f0',
  'miguel': '#f0f0f0',
};

// AI colors
const AI_COLORS = {
  'Finance': '#f0f0f0',
  'Engineer': '#f0f0f0',
  'Designer': '#f0f0f0',
};

// Predefined static messages
const STATIC_MESSAGES = [
  { id: 1, sender: 'test', content: 'Hello everyone!', is_ai: false, timestamp: '10:01 AM' },
  { id: 3, sender: 'Finance', content: 'Welcome to the meeting. I can help with financial questions and budgeting concerns.', is_ai: true, timestamp: '10:03 AM' },
  { id: 4, sender: 'test', content: 'Thanks for setting this up!', is_ai: false, timestamp: '10:04 AM' },
  { id: 5, sender: 'Engineer', content: 'I can assist with technical specifications and implementation challenges.', is_ai: true, timestamp: '10:05 AM' },
];

// Predefined AI feedback
const STATIC_AI_FEEDBACK = [
  {
    id: 'feedback-1',
    agent: 'Finance',
    content: 'Hello, I\'m Finance, your Finance AI assistant. I\'m here to help with the meeting.',
    timestamp: '10:05 AM'
  },
  {
    id: 'feedback-2',
    agent: 'Engineer',
    content: 'Hello, I\'m Engineer, your Engineer AI assistant. I\'m here to help with the meeting.',
    timestamp: '10:10 AM'
  },
];

const VideoRoom = ({ route, navigation }) => {
  // Static room ID
  const roomId = '123';
  
  // State variables - all initialized with predefined static data
  const [messages, setMessages] = useState(STATIC_MESSAGES);
  const [showChat, setShowChat] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Pagination settings
  const participantsPerPage = 4;
  const totalPages = 1; // Fixed as 1 page for the shown design
  
  // Current page participants
  const currentParticipants = STATIC_HUMAN_PARTICIPANTS.slice(0, 1);
  
  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
  };
  
  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };
  
  const leaveRoom = () => {
    
    navigation.navigate('Home');
    return;
  };
  
  const sendMessage = () => {
    if (currentMessage.trim() === '') return;
    
    const newMessage = {
      id: Date.now(),
      sender: 'test',
      content: currentMessage,
      is_ai: false,
      timestamp: '10:30 AM' // Fixed timestamp
    };
    
    setMessages([...messages, newMessage]);
    setCurrentMessage('');
    
    // Add fixed AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        sender: 'Finance',
        content: 'Thanks for your message. As a finance advisor, I suggest we consider all perspectives before making a decision.',
        is_ai: true,
        timestamp: '10:31 AM'
      };
      
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  // Pagination control
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  // Render participant video
  const renderParticipantVideo = (participant) => {
    const isCurrentUser = participant.isCurrentUser;
    const showVideo = videoEnabled || !isCurrentUser;
    const backgroundColor = PARTICIPANT_COLORS[participant.id] || '#f0f0f0';
    
    return (
      <View key={`participant-${participant.id}`} style={styles.videoContainer}>
        {showVideo ? (
          <View style={[styles.mockVideo, { backgroundColor }]}>
            <Text style={styles.avatarText}>
              {participant.name === 'test' ? 'Y' : participant.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Feather name="video-off" size={24} color="white" />
            <Text style={styles.avatarText}>{participant.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.nameTag}>
          <Text style={styles.nameText}>
            {participant.name === 'test' ? 'test(You)' : participant.name}
            {!isCurrentUser && !audioEnabled && ' 🔇'}
          </Text>
        </View>
      </View>
    );
  };
  
  // Render empty slot
  const renderEmptySlot = (index) => (
    <View key={`empty-${index}`} style={[styles.videoContainer, styles.emptySlot]}>
      <Text style={styles.emptySlotText}>Empty Slot</Text>
    </View>
  );
  const agentAvatars = {
    Designer: require('../../assets/ai/designer.png'),
    Engineer: require('../../assets/ai/engineer.png'),
    Finance: require('../../assets/ai/finance.png'),
    Professor: require('../../assets/ai/professor.png'),
  };
  
  const renderFeedbackItem = ({ item }) => {
    const agentColor = AI_COLORS[item.agent] || '#f0f0f0';
    const avatarSource = agentAvatars[item.agent];
  
    return (
      <View style={styles.feedbackItem}>
        <View style={[styles.avatarCircle, { backgroundColor: agentColor }]}>
          {avatarSource && (
            <Image source={avatarSource}  style={styles.avatarImage} resizeMode="cover" />
          )}
        </View>
        <View style={styles.feedbackContent}>
          <Text style={styles.agentName}>{item.agent}</Text>
          <Text style={styles.feedbackText}>{item.content}</Text>
        </View>
      </View>
    );
  };
  
  
  
  
  // Render chat message
  const renderChatMessage = ({ item }) => (
    <View style={[
      styles.chatMessage, 
      item.is_ai ? styles.aiMessage : styles.userMessage
    ]}>
      <Text style={styles.messageSender}>{item.sender}</Text>
      <Text style={styles.messageContent}>{item.content}</Text>
      <Text style={styles.messageTime}>{item.timestamp}</Text>
    </View>
  );
  
  // Chat component
  const Chat = () => (
    <View style={styles.chatContainer}>
      <View style={styles.chatHeader}>
        <Text style={styles.chatTitle}>Chat</Text>
        <TouchableOpacity onPress={() => setShowChat(false)}>
          <Feather name="x" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={messages}
        renderItem={renderChatMessage}
        keyExtractor={(item) => String(item.id)}
        style={styles.chatMessages}
      />
      
      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder="Type a message..."
          value={currentMessage}
          onChangeText={setCurrentMessage}
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={currentMessage.trim() === ''}
        >
          <Feather name="send" size={24} color={currentMessage.trim() === '' ? '#ccc' : '#2a70e0'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.roomTitle}>Room {roomId}</Text>
      </View>
      
      {/* Main content */}
      <View style={styles.contentContainer}>
        {/* AI feedback section */}
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackHeader}>AI Partner Feedback</Text>
          <FlatList
            data={STATIC_AI_FEEDBACK}
            renderItem={renderFeedbackItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.feedbackList}
          />
        </View>
        
        {/* Human video section */}
        <View style={styles.videoSection}>
          <View style={styles.videoGrid}>
            {/* Render current participants */}
            {renderParticipantVideo(currentParticipants[0])}
            
            {/* Fill empty slots */}
            {Array.from(
              { length: 3 },
              (_, index) => renderEmptySlot(index)
            )}
          </View>
        </View>
      </View>
      
      {/* Control bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity style={styles.chatButton} onPress={() => setShowChat(!showChat)}>
          <Feather name="message-square" size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleAudio}>
          <Feather name={audioEnabled ? "mic" : "mic-off"} size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
          <Feather name={videoEnabled ? "video" : "video-off"} size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.dangerButton} onPress={leaveRoom}>
          <Feather name="x" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Chat panel */}
      {showChat && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.chatPanelContainer}
        >
          <Chat />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 48,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    fontFamily: fonts.jaro.regular,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  feedbackSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  feedbackHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: 'rgb(42, 112, 224)',
  },
  feedbackList: {
    paddingBottom: 8,
  },
  feedbackItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingLeft: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 5,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  avatarText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  feedbackContent: {
    flex: 1,
  },
  agentName: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  videoSection: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    justifyContent: 'center',
  },
  videoGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  videoContainer: {
    width: '48%',  // Almost half width to leave gap
    aspectRatio: 3.5/3,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mockVideo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  nameText: {
    color: 'white',
    fontSize: 12,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlot: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    height:'50%',
  },
  emptySlotText: {
    color: '#999',
    fontSize: 14,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    minHeight: 64,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  dangerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f03e3e', // Red color for end call
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  chatPanelContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 0,
    height: height*0.95 ,
    width: width*0.95 ,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  chatContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  chatMessage: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e1f5fe',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f5',
  },
  messageSender: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 14,
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  
});

export default VideoRoom;