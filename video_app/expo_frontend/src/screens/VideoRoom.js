import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Camera } from 'expo-camera';
import axios from 'axios';
import { addParticipant } from '../utils/database';
import { fonts } from '../config/fonts';

const VideoRoom = ({ navigation, route }) => {
  const { roomId } = route.params;
  const [aiPartners, setAiPartners] = useState([]);
  const [userName, setUserName] = useState('You');
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [aiFeedback, setAiFeedback] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [permission, setPermission] = useState(null);

  const cameraRef = useRef();
  const socketRef = useRef();
  const messagesEndRef = useRef();

  useEffect(() => {
    const initializeRoom = async () => {
      try {
        // Request camera permission
        const { status } = await Camera.requestCameraPermissionsAsync();
        setPermission(status === 'granted');

        if (status !== 'granted') {
          Alert.alert('Error', 'Camera permission is required');
          navigation.navigate('Home');
          return;
        }

        // Get AI partners for the room
        const response = await axios.get(`http://localhost:8000/api/rooms/${roomId}/ai-partners`);
        setAiPartners(response.data.aiPartners || []);

        // Connect to WebSocket
        socketRef.current = new WebSocket(`ws://localhost:8002/ws/chat/${roomId}/`);
        setupWebSocket();

        // Join room
        await joinRoom();

        // Get initial messages
        await fetchMessages();

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing room:', error);
        Alert.alert('Error', 'Failed to initialize room. Please try again.');
        navigation.navigate('Home');
      }
    };

    initializeRoom();

    return () => {
      // Cleanup
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [roomId]);

  const setupWebSocket = () => {
    socketRef.current.onopen = () => {
      console.log('WebSocket connection established');
      socketRef.current.send(JSON.stringify({
        type: 'signal',
        signal: { type: 'new-participant' },
        caller_id: userName
      }));
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message') {
        setMessages(prev => [...prev, {
          sender: data.sender,
          content: data.message,
          is_ai: data.is_ai
        }]);

        if (data.is_ai && data.message_type === 'feedback') {
          setAiFeedback(prev => [...prev, {
            agent: data.sender,
            content: data.message
          }]);
        }
      }
    };
  };

  const joinRoom = async () => {
    try {
      // Register participant in the room
      await axios.post(`http://localhost:8000/api/rooms/${roomId}/join/`, {
        name: userName,
        is_ai: false
      });

      // Register AI partners in the room
      for (const agent of aiPartners) {
        await axios.post(`http://localhost:8000/api/rooms/${roomId}/join/`, {
          name: agent.name,
          is_ai: true,
          ai_agent: agent.id
        });
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/rooms/${roomId}/messages/`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    socketRef.current.send(JSON.stringify({
      type: 'message',
      message: newMessage,
      sender: userName,
      is_ai: false
    }));

    setNewMessage('');
  };

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  const leaveRoom = () => {
    navigation.navigate('Home');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Initializing room...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.roomTitle}>Room {roomId}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={toggleChat} style={styles.chatButton}>
            <Text style={styles.chatButtonText}>{showChat ? 'Hide Chat' : 'Show Chat'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={leaveRoom}>
            <Text style={styles.leaveButton}>Leave</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* AI Feedback Section */}
        <ScrollView style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>AI Partner Feedback</Text>
          {aiFeedback.map((feedback, index) => (
            <View key={`feedback-${index}`} style={styles.feedbackItem}>
              <Text style={styles.agentName}>{feedback.agent}</Text>
              <Text style={styles.feedbackText}>{feedback.content}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Video Section */}
        <View style={styles.videoSection}>
          <Camera
            style={styles.video}
            type={Camera.Constants.Type.front}
            ref={cameraRef}
          />
        </View>

        {/* Chat Section */}
        {showChat && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.chatSection}
          >
            <ScrollView
              ref={messagesEndRef}
              onContentSizeChange={() => messagesEndRef.current?.scrollToEnd()}
              style={styles.messagesContainer}
            >
              {messages.map((message, index) => (
                <View
                  key={`message-${index}`}
                  style={[
                    styles.message,
                    message.sender === userName ? styles.myMessage : styles.otherMessage
                  ]}
                >
                  <Text style={styles.messageSender}>{message.sender}</Text>
                  <Text style={styles.messageContent}>{message.content}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#666"
              />
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, !videoEnabled && styles.controlButtonDisabled]}
            onPress={toggleVideo}
          >
            <Text style={styles.controlButtonText}>
              {videoEnabled ? 'Video On' : 'Video Off'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, !audioEnabled && styles.controlButtonDisabled]}
            onPress={toggleAudio}
          >
            <Text style={styles.controlButtonText}>
              {audioEnabled ? 'Audio On' : 'Audio Off'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: fonts.inriaSans.regular,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  roomTitle: {
    fontSize: 18,
    fontFamily: fonts.jaro.regular,
  },
  leaveButton: {
    color: '#ff3b30',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
  content: {
    flex: 1,
  },
  feedbackSection: {
    flex: 1,
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2a70e0',
  },
  feedbackTitle: {
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
    color: '#2a70e0',
    marginBottom: 16,
  },
  feedbackItem: {
    marginBottom: 16,
  },
  agentName: {
    fontSize: 14,
    fontFamily: fonts.inriaSans.bold,
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    fontFamily: fonts.inriaSans.regular,
    color: '#333',
  },
  videoSection: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  controlButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007aff',
  },
  controlButtonDisabled: {
    backgroundColor: '#ccc',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButton: {
    marginRight: 16,
    padding: 8,
    backgroundColor: '#007aff',
    borderRadius: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.inriaSans.bold,
  },
  chatSection: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  message: {
    maxWidth: '80%',
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007aff',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e0e0',
  },
  messageSender: {
    fontSize: 12,
    fontFamily: fonts.inriaSans.bold,
    color: '#666',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 16,
    fontFamily: fonts.inriaSans.regular,
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginRight: 8,
    fontFamily: fonts.inriaSans.regular,
  },
  sendButton: {
    padding: 8,
    backgroundColor: '#007aff',
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
});

export default VideoRoom; 