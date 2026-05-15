import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { triggerAIResponse } from '../services/api';

const getImageSource = (name) => {
  if (!name) return null;

  switch (name.toLowerCase()) {
    case 'designer': return require('../../assets/ai/designer.png');
    case 'engineer': return require('../../assets/ai/engineer.png');
    case 'finance': return require('../../assets/ai/finance.png');
    case 'professor': return require('../../assets/ai/default.png');
    default: return null;
  }
};

const VoiceModeAI = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const roomId = route.params?.roomId;
  const userName = route.params?.username || 'User';
  const passedAiPartners = route.params?.aiPartners || [];

  const [isMicOn, setIsMicOn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState({ name: userName, color: '#7289da' });
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [aiResponseText, setAIResponseText] = useState('');
  const [statusText, setStatusText] = useState('Ready');

  const recognitionRef = useRef(null);
  const recognitionSupported = useMemo(() => {
    if (Platform.OS !== 'web') return false;
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    const allSpeakers = [
      { name: userName, color: '#7289da', avatarImg: null, isAI: false },
      ...passedAiPartners.map((partner) => ({
        name: partner.name,
        color: getRandomColor(),
        avatarImg: getImageSource(partner.name),
        isAI: true,
        role: partner.role,
        id: partner.id
      }))
    ];

    setParticipants(allSpeakers);
    setCurrentSpeaker(allSpeakers[0]);

    return () => {
      stopRecognition();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [userName]);

  const getRandomColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : '?');

  const stopRecognition = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch (error) {
        console.warn('Recognition stop failed:', error);
      }
    }
    recognitionRef.current = null;
    setIsListening(false);
  };

  const speakResponse = (text) => {
    if (!text) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setIsAISpeaking(true);
      utterance.onend = () => setIsAISpeaking(false);
      utterance.onerror = () => setIsAISpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return;
    }

    setIsAISpeaking(true);
    setTimeout(() => setIsAISpeaking(false), 4000);
  };

  const handleTranscript = async (transcript) => {
    const text = transcript.trim();
    if (!text) return;

    setCurrentTranscript(text);
    setIsProcessing(true);
    setStatusText('Thinking...');

    try {
      const response = await triggerAIResponse(roomId, {
        content: text,
        sender: userName
      }, 'voice');

      const aiMessages = Array.isArray(response) ? response : response?.responses;
      const aiMessage = Array.isArray(aiMessages) ? aiMessages[0] : null;

      const speakerName = aiMessage?.sender || passedAiPartners[0]?.name || 'AI';
      const responseText = aiMessage?.content || aiMessage?.message || 'I have an idea to add here.';

      const aiParticipant = participants.find((participant) => participant.name === speakerName) || participants[1] || participants[0];
      if (aiParticipant) {
        setCurrentSpeaker(aiParticipant);
      }

      setAIResponseText(responseText);
      setStatusText(`${speakerName} responding`);
      speakResponse(responseText);

      setTimeout(() => {
        setCurrentSpeaker(participants[0] || { name: userName, color: '#7289da' });
        setStatusText('Ready');
      }, Platform.OS === 'web' ? 1000 : 4000);
    } catch (error) {
      console.error('Error triggering AI voice response:', error);
      Alert.alert('Error', 'Failed to get AI response.');
      setStatusText('Ready');
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecognition = () => {
    if (!recognitionSupported) {
      Alert.alert(
        'Voice Input Not Available',
        'This device does not support live voice recognition in this app yet.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Test Mode',
            onPress: () => handleTranscript('This is a test message for voice mode')
          }
        ]
      );
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
      setIsMicOn(true);
      setStatusText('Listening...');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setCurrentTranscript((finalTranscript || interimTranscript).trim());
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopRecognition();
      setStatusText('Ready');
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsMicOn(false);
      const transcript = finalTranscript.trim();
      if (transcript) {
        handleTranscript(transcript);
      } else {
        setStatusText('Ready');
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      stopRecognition();
      setStatusText('Ready');
    }
  };

  const toggleMic = () => {
    if (isProcessing || isAISpeaking) {
      return;
    }

    if (isListening) {
      stopRecognition();
      setStatusText('Ready');
      return;
    }

    startRecognition();
  };

  const navigateToChat = () => {
    navigation.navigate('ChatRoomAI', {
      roomId,
      aiPartners: passedAiPartners,
      username: userName
    });
  };

  const navigateToHome = () => {
    stopRecognition();
    navigation.navigate('Home');
  };

  const renderParticipant = ({ item }) => {
    const isActive = item.name === currentSpeaker.name;

    return (
      <View style={styles.participantItem}>
        <View
          style={[
            styles.participantAvatar,
            {
              backgroundColor: item.avatarImg ? 'transparent' : (item.color || '#7289da'),
              borderColor: isActive ? 'white' : 'transparent',
              borderWidth: isActive ? 2 : 0,
              opacity: isActive ? 1 : 0.6
            }
          ]}
        >
          {item.avatarImg ? (
            <Image source={item.avatarImg} style={styles.participantAvatarImage} resizeMode="cover" />
          ) : (
            <Text style={styles.participantAvatarInitial}>{getInitial(item.name)}</Text>
          )}
        </View>
        <Text style={[styles.participantName, { opacity: isActive ? 1 : 0.6 }]}>{item.name}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: isProcessing ? '#ffa726' : isListening ? '#4CAF50' : '#9E9E9E' }]} />
          <Text style={styles.roomTitle}>Room {roomId} - Voice AI</Text>
        </View>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      <View style={styles.speakerArea}>
        <View style={[
          styles.speakerAvatar,
          !currentSpeaker.avatarImg && { backgroundColor: currentSpeaker.color || '#7289da' },
          (isAISpeaking || isListening) && styles.speakingAnimation
        ]}>
          {currentSpeaker.avatarImg ? (
            <Image source={currentSpeaker.avatarImg} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <Text style={styles.avatarInitial}>{getInitial(currentSpeaker.name)}</Text>
          )}
        </View>

        <Text style={styles.speakerName}>{currentSpeaker.name}</Text>

        {!!currentTranscript && <Text style={styles.transcript}>"{currentTranscript}"</Text>}
        {!!aiResponseText && <Text style={styles.aiResponse}>AI: "{aiResponseText}"</Text>}
      </View>

      <View style={styles.participantsContainer}>
        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.name}
          numColumns={2}
          contentContainerStyle={styles.participantsGrid}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.controlsArea}>
        <TouchableOpacity
          style={[styles.controlButton, isMicOn ? styles.activeButton : {}, (isProcessing || isAISpeaking) && styles.disabledButton]}
          onPress={toggleMic}
          activeOpacity={0.7}
          disabled={isProcessing || isAISpeaking}
        >
          <Feather name={isMicOn ? 'mic' : 'mic-off'} size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, styles.chatButton]} onPress={navigateToChat} activeOpacity={0.7}>
          <Feather name="message-square" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, styles.dangerButton]} onPress={navigateToHome} activeOpacity={0.7}>
          <Feather name="x" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2f33'
  },
  header: {
    height: 60,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#4f545c',
    backgroundColor: '#23272a'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8
  },
  roomTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8
  },
  speakerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  speakerAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
    overflow: 'hidden',
    marginBottom: 20
  },
  speakingAnimation: {
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  avatarInitial: {
    fontSize: 60,
    fontWeight: 'bold',
    color: 'white'
  },
  speakerName: {
    fontSize: 22,
    fontWeight: '500',
    color: 'white',
    textAlign: 'center'
  },
  transcript: {
    color: 'white',
    marginTop: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20
  },
  aiResponse: {
    color: '#90caf9',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20
  },
  participantsContainer: {
    backgroundColor: '#2f3136',
    maxHeight: 200,
    paddingVertical: 15
  },
  participantsGrid: {
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  participantItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 8
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 5
  },
  participantAvatarImage: {
    width: '100%',
    height: '100%'
  },
  participantAvatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white'
  },
  participantName: {
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500'
  },
  controlsArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#23272a',
    borderTopWidth: 1,
    borderTopColor: '#4f545c'
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6c6d70',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20
  },
  activeButton: {
    backgroundColor: '#4CAF50'
  },
  chatButton: {
    backgroundColor: '#2a70e0'
  },
  dangerButton: {
    backgroundColor: '#f04747'
  },
  disabledButton: {
    opacity: 0.5
  }
});

export default VoiceModeAI;