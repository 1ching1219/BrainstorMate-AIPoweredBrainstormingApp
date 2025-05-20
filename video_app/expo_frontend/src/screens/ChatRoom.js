import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { getMessages, getParticipants } from '../services/api';

const ChatRoom = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { roomId, aiPartners = [] } = route.params || {};
  const [userName, setUserName] = useState('You');
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(true); // Simulate connected state
  
  const flatListRef = useRef(null);
  const aiGenerationIntervalRef = useRef(null);

  // Initialize component and fetch data
  useEffect(() => {
    console.log("ChatRoom received params:", route.params);
    if (!roomId) {
      console.log("Invalid roomId");
      return;
    }

    // Add system message for joining room
    setMessages([{
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: `You joined Room ${roomId}`,
      is_system: true,
      created_at: new Date().toISOString()
    }]);

    // Simulate fetching messages
    fetchMessages();
    
    // Simulate fetching participants
    fetchParticipants();

    // Initialize AI feedback generation
    if (aiPartners.length > 0) {
      aiGenerationIntervalRef.current = setInterval(generateAIFeedback, 10000);
    }

    return () => {
      if (aiGenerationIntervalRef.current) {
        clearInterval(aiGenerationIntervalRef.current);
      }
    };
  }, [roomId, aiPartners, route.params]);

  const fetchMessages = async () => {
    try {
      // Simulate API call - in a real app, you'd use the actual API call
      // const response = await getMessages(roomId);
      // setMessages(prev => [...prev, ...response]);
      console.log("Fetched messages");
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };
  
  const fetchParticipants = async () => {
    try {
      // Simulate API call
      // const response = await getParticipants(roomId);
      // setParticipants(response);
      
      // For now, just add AI partners to participants
      setParticipants([
        { id: 'user-1', name: userName, is_ai: false },
        ...aiPartners.map(partner => ({ 
          id: `ai-${partner.id}`, 
          name: partner.name, 
          is_ai: true,
          role: partner.role
        }))
      ]);
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) {
      return;
    }
    
    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: inputMessage.trim(),
      sender: userName,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    
    // Simulate AI response in 1-3 seconds
    if (aiPartners.length > 0) {
      const randomDelay = 1000 + Math.random() * 2000;
      setTimeout(generateAIFeedback, randomDelay);
    }
  };
  
  const generateAIFeedback = () => {
    if (!aiPartners.length) return;
    
    // Select a random AI agent to give feedback
    const randomAgent = aiPartners[Math.floor(Math.random() * aiPartners.length)];
    
    if (randomAgent) {
      const feedback = generateRandomFeedback(randomAgent.role);
      
      const aiMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: feedback,
        sender: randomAgent.name,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    }
  };
  
  const generateRandomFeedback = (role) => {
    const feedbackOptions = {
      'Designer': [
        "I notice the UI elements could be more consistent. Consider a unified color scheme.",
        "The user flow seems to have some friction points. We should simplify the navigation.",
        "Visual hierarchy could be improved to guide users more effectively.",
        "Have you considered accessibility in this design? Some elements may need better contrast."
      ],
      'Engineer': [
        "The current architecture might have scaling issues with high user loads.",
        "We should consider optimizing the database queries for better performance.",
        "This would be a good opportunity to implement caching to reduce server load.",
        "The current solution works, but we might want to refactor for better maintainability."
      ],
      'Finance': [
        "Based on our projections, we should allocate more resources to marketing.",
        "The ROI on this feature seems promising based on current metrics.",
        "We need to consider the cost implications of this infrastructure change.",
        "From a financial perspective, we should prioritize features with higher revenue potential."
      ],
      'Professor': [
        "This approach aligns with recent research in the field.",
        "Consider the theoretical implications of this decision framework.",
        "We should examine some case studies that have implemented similar solutions.",
        "The methodology needs more rigorous validation before proceeding."
      ]
    };
    
    const options = feedbackOptions[role] || ["I have some insights to share about this discussion."];
    return options[Math.floor(Math.random() * options.length)];
  };

  const leaveRoom = () => {
    navigation.navigate('Home');
  };

  const navigateToVoice = () => {
    navigation.navigate('VoiceMode', { 
      roomId, 
      aiPartners,
      username: userName  // Add the username so VoiceMode knows the current user
    });
  };
  
  // Check if a message is from the current user
  const isMessageFromCurrentUser = (messageSender) => {
    return messageSender === userName;
  };
  
  // Check if a message is from an AI agent
  const isMessageFromAI = (messageSender) => {
    return aiPartners.some(agent => agent.name === messageSender);
  };
  
  // Find the AI agent by name
  const findAIAgent = (name) => {
    return aiPartners.find(agent => agent.name === name);
  };
  
  // Group messages by sender for avatar display
  const shouldShowAvatar = (message, index) => {
    // Show avatar if it's the first message or from a different sender than previous message
    if (index === 0) return true;
    if (messages[index - 1].sender !== message.sender) return true;
    return false;
  };
  
  // Render message item for FlatList
  const renderMessage = ({ item, index }) => {
    // Handle system messages
    if (item.is_system) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }
    
    // Determine if message is from current user or AI
    const isFromUser = isMessageFromCurrentUser(item.sender);
    const isFromAI = isMessageFromAI(item.sender);
    const showAvatar = !isFromUser && shouldShowAvatar(item, index);
    
    return (
      <View style={[
        styles.messageWrapper, 
        isFromUser ? styles.userMessageWrapper : styles.otherMessageWrapper
      ]}>
        {!isFromUser && (
          <View style={styles.avatarSpace}>
            {showAvatar && (
              <View style={styles.avatar}>
                {isFromAI ? (
                  <Image 
                    source={{ uri: `https://ui-avatars.com/api/?name=${item.sender}&background=4a72d4&color=fff` }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.textAvatar}>
                    <Text style={styles.textAvatarLetter}>
                      {item.sender.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
        
        <View style={[
          styles.message, 
          isFromUser ? styles.userMessage : isFromAI ? styles.aiMessage : styles.otherMessage
        ]}>
          {!isFromUser && (
            <Text style={[styles.messageSender, isFromAI && styles.aiMessageSender]}>
              {item.sender}
            </Text>
          )}
          <Text style={styles.messageContent}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const isInputEmpty = !inputMessage.trim();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.roomTitleContainer}>
          <View style={[styles.statusIndicator, isConnected ? styles.connectedIndicator : styles.disconnectedIndicator]} />
          <Text style={styles.roomTitle}>Room {roomId}</Text>
        </View>
      </View>
      
      {/* Messages */}
      <View style={styles.chatSection}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id || `msg-${Math.random()}`}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          style={styles.inputAreaContainer}
        >
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              editable={isConnected}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                isInputEmpty ? styles.emptyInputButton : styles.filledInputButton,
                !isConnected && styles.disabledButton
              ]}
              onPress={isInputEmpty ? navigateToVoice : sendMessage}
              disabled={!isConnected}
            >
              {isInputEmpty ? (
                <MaterialIcons name="keyboard-voice" size={22} color="white" />
              ) : (
                <Ionicons name="send" size={22} color="white" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={leaveRoom}
            >
              <Feather name="x" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
    minHeight: 48,
  },
  roomTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    height: 8,
    width: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectedIndicator: {
    backgroundColor: 'green',
  },
  disconnectedIndicator: {
    backgroundColor: 'red',
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatSection: {
    flex: 1,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  messagesContent: {
    padding: 10,
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 8,
  },
  systemMessageText: {
    color: '#666',
    fontSize: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  otherMessageWrapper: {
    justifyContent: 'flex-start',
  },
  avatarSpace: {
    width: 40,
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  textAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4a72d4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textAvatarLetter: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  message: {
    padding: 12,
    borderRadius: 15,
    maxWidth: '70%',
  },
  userMessage: {
    backgroundColor: '#dcf8c6',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#f0f0f0',
  },
  otherMessage: {
    backgroundColor: '#e3f2fd',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    color: '#666',
  },
  aiMessageSender: {
    color: '#4a72d4',
  },
  messageContent: {
    fontSize: 14,
  },
  inputAreaContainer: {
    width: '100%',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  sendButton: {
    marginLeft: 10,
    height: 42,
    width: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  emptyInputButton: {
    backgroundColor: '#363434',
  },
  filledInputButton: {
    backgroundColor: '#2a70e0',
  },
  disabledButton: {
    backgroundColor: '#d3d3d3',
  },
  leaveButton: {
    marginLeft: 10,
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: '#ff4d4f',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
});

export default ChatRoom;
