import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

const getImageSource = (name) => {
  if (!name) return null;
  switch (name.toLowerCase()) {
    case 'designer':  return require('../../assets/ai/designer.png');
    case 'engineer':  return require('../../assets/ai/engineer.png');
    case 'finance':   return require('../../assets/ai/finance.png');
    case 'professor': return require('../../assets/ai/default.png');
    default:          return null;
  }
};

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const ALL_PARTICIPANTS_PLACEHOLDER = [
  { name: 'Designer', color: '#4287f5', avatarImg: require('../../assets/ai/designer.png'), isUser: false },
  { name: 'Engineer', color: '#f54242', avatarImg: require('../../assets/ai/engineer.png'), isUser: false },
  { name: 'Finance',  color: '#42f560', avatarImg: require('../../assets/ai/finance.png'),  isUser: false },
  { name: 'Professor', color: '#f5a442', avatarImg: require('../../assets/ai/default.png'), isUser: false },
];

const VoiceMode = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const roomId = route.params?.roomId;
  const userName = route.params?.username || 'You';
  const passedAiPartners = route.params?.aiPartners || [];

  // ── UI state ────────────────────────────────────────────────────────────
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState({ name: userName, color: '#7289da', isUser: true });
  const [participants, setParticipants] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [displayTranscript, setDisplayTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // ── Refs ─────────────────────────────────────────────────────────────────
  const speakerIntervalRef = useRef(null);
  const transcriptRef = useRef('');       // authoritative value — passed to ChatRoom
  const aiParticipantsRef = useRef([]);
  const userParticipantRef = useRef(null);
  const isMicOnRef = useRef(false);       // sync ref so 'end' handler can read current value

  // ── Stable rotation helpers (only touch refs → no stale closures) ────────

  const stopAiRotation = useCallback(() => {
    if (speakerIntervalRef.current) {
      clearInterval(speakerIntervalRef.current);
      speakerIntervalRef.current = null;
    }
  }, []);

  const startAiRotation = useCallback(() => {
    if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
    const aiList = aiParticipantsRef.current;
    if (!aiList.length) return;
    speakerIntervalRef.current = setInterval(() => {
      setCurrentSpeaker(aiList[Math.floor(Math.random() * aiList.length)]);
    }, 3000);
  }, []);

  // ── Speech recognition events ────────────────────────────────────────────

  useSpeechRecognitionEvent('speechstart', () => {
    setIsSpeaking(true);
    stopAiRotation();
    if (userParticipantRef.current) setCurrentSpeaker(userParticipantRef.current);
  });

  useSpeechRecognitionEvent('speechend', () => {
    setIsSpeaking(false);
    setLiveTranscript('');
    startAiRotation();
  });

  useSpeechRecognitionEvent('result', (event) => {
    let interim = '';
    for (const result of event.results) {
      if (result.isFinal) {
        const text = result.transcript;
        transcriptRef.current += text + ' ';
        setDisplayTranscript(prev => prev + text + ' ');
      } else {
        interim += result.transcript;
      }
    }
    setLiveTranscript(interim);
  });

  // iOS 18+ stops recognition after silence — restart while mic is on
  useSpeechRecognitionEvent('end', () => {
    if (!isMicOnRef.current) return;
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', continuous: true, interimResults: true });
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      console.warn('Speech recognition error:', event.error, event.message);
    }
  });

  // ── Setup participants ────────────────────────────────────────────────────

  useEffect(() => {
    const userParticipant = { name: userName, color: '#7289da', avatarImg: null, isUser: true };
    userParticipantRef.current = userParticipant;

    let aiList = passedAiPartners.map(p => ({
      name: p.name,
      color: getRandomColor(),
      avatarImg: getImageSource(p.name),
      isUser: false,
    }));

    if (aiList.length === 0) aiList = ALL_PARTICIPANTS_PLACEHOLDER;
    aiParticipantsRef.current = aiList;

    setParticipants([userParticipant, ...aiList]);
    setCurrentSpeaker(aiList[Math.floor(Math.random() * aiList.length)]);
  }, []);

  // ── Request mic permission and start recognition ──────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (granted) {
          setHasMicPermission(true);
          isMicOnRef.current = true;
          setIsMicOn(true);
          ExpoSpeechRecognitionModule.start({ lang: 'en-US', continuous: true, interimResults: true });
        } else {
          Alert.alert(
            'Microphone permission required',
            'Please allow microphone access in your device settings to use voice mode.'
          );
        }
      } catch (err) {
        console.warn('Could not request speech recognition permissions:', err);
      }
    })();

    return () => {
      isMicOnRef.current = false;
      ExpoSpeechRecognitionModule.stop();
      stopAiRotation();
    };
  }, [stopAiRotation]);

  // ── Start AI rotation once participants are ready ────────────────────────

  useEffect(() => {
    if (participants.length > 0) startAiRotation();
    return stopAiRotation;
  }, [participants, startAiRotation, stopAiRotation]);

  // ── Controls ─────────────────────────────────────────────────────────────

  const toggleMic = () => {
    const next = !isMicOn;
    isMicOnRef.current = next;
    setIsMicOn(next);

    if (next) {
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', continuous: true, interimResults: true });
    } else {
      ExpoSpeechRecognitionModule.stop();
      setIsSpeaking(false);
      setLiveTranscript('');
      startAiRotation();
    }
  };

  const toggleCamera = async () => {
    if (!isCameraOn) {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          Alert.alert('Camera permission denied', 'Please allow camera access in your device settings.');
          return;
        }
      }
    } else {
      // turning off — nothing else needed, CameraView unmounts
    }
    setIsCameraOn(prev => !prev);
  };

  const navigateToChat = () => {
    isMicOnRef.current = false;
    ExpoSpeechRecognitionModule.stop();
    stopAiRotation();

    const chatRoute = passedAiPartners?.length ? 'ChatRoomAI' : 'ChatRoom';
    navigation.navigate(chatRoute, {
      roomId,
      aiPartners: passedAiPartners,
      username: userName,
      voiceTranscript: transcriptRef.current.trim() || undefined,
    });
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : '?');

  const renderParticipant = ({ item }) => {
    const isActive = item.name === currentSpeaker.name;
    return (
      <View style={[styles.participantItem, { opacity: isActive ? 1 : 0.6 }]}>
        <View style={[
          styles.participantAvatar,
          { backgroundColor: item.avatarImg ? 'transparent' : (item.color || '#7289da') },
          isActive && styles.activeParticipantBorder,
        ]}>
          {item.avatarImg
            ? <Image source={item.avatarImg} style={styles.participantAvatarImage} resizeMode="cover" />
            : <Text style={styles.participantInitial}>{getInitial(item.name)}</Text>
          }
        </View>
        <Text style={styles.participantName}>{item.name}</Text>
      </View>
    );
  };

  const isUserSpeaker = isSpeaking && currentSpeaker?.isUser;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: isMicOn ? '#43b581' : '#9E9E9E' }]} />
          <Text style={styles.roomTitle}>Room {roomId} — Voice Mode</Text>
        </View>
        {isSpeaking && <Text style={styles.speakingBadge}>● Speaking</Text>}
      </View>

      {/* Current speaker spotlight */}
      <View style={styles.speakerArea}>
        <View style={[
          styles.speakerAvatar,
          !currentSpeaker.avatarImg && { backgroundColor: currentSpeaker.color || '#7289da' },
          isUserSpeaker ? styles.speakingAvatar : styles.defaultAvatar,
        ]}>
          {currentSpeaker.avatarImg ? (
            <Image source={currentSpeaker.avatarImg} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <Text style={styles.avatarInitial}>{getInitial(currentSpeaker.name)}</Text>
          )}
        </View>
        <Text style={styles.speakerName}>{currentSpeaker.name}</Text>
      </View>

      {/* Live transcript panel */}
      <View style={styles.transcriptPanel}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {displayTranscript || liveTranscript ? (
            <Text style={styles.transcriptText}>
              {displayTranscript}
              <Text style={styles.interimText}>{liveTranscript}</Text>
            </Text>
          ) : (
            <Text style={styles.transcriptHint}>
              {hasMicPermission
                ? 'Start speaking — your words will be sent to chat when you return'
                : Platform.OS === 'web'
                  ? 'Speech recognition uses your browser\'s built-in API'
                  : 'Microphone permission required for transcription'}
            </Text>
          )}
        </ScrollView>
      </View>

      {/* Participants grid */}
      <View style={styles.participantsContainer}>
        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.name}
          numColumns={4}
          contentContainerStyle={styles.participantsGrid}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      </View>

      {/* Controls */}
      <View style={styles.controlsArea}>
        <TouchableOpacity
          style={[styles.controlButton, isMicOn && styles.micActiveButton]}
          onPress={toggleMic}
          activeOpacity={0.7}
        >
          <Feather name={isMicOn ? 'mic' : 'mic-off'} size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isCameraOn && styles.cameraActiveButton]}
          onPress={toggleCamera}
          activeOpacity={0.7}
        >
          <Feather name={isCameraOn ? 'video' : 'video-off'} size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={navigateToChat}
          activeOpacity={0.7}
        >
          <Feather name="x" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* PIP local camera preview */}
      {isCameraOn && (
        <View style={styles.pipContainer}>
          <CameraView facing="front" style={styles.pipCamera} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2f33',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4f545c',
    backgroundColor: '#23272a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  roomTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  speakingBadge: {
    color: '#43b581',
    fontSize: 12,
  },
  speakerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  speakerAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  defaultAvatar: {
    borderColor: 'white',
    shadowColor: '#fff',
  },
  speakingAvatar: {
    borderColor: '#43b581',
    shadowColor: '#43b581',
    shadowOpacity: 0.8,
    shadowRadius: 22,
    elevation: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 56,
    fontWeight: 'bold',
    color: 'white',
  },
  speakerName: {
    fontSize: 22,
    fontWeight: '500',
    color: 'white',
    textAlign: 'center',
  },
  // Transcript panel
  transcriptPanel: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    maxHeight: 88,
  },
  transcriptText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 20,
  },
  interimText: {
    color: '#888',
    fontStyle: 'italic',
  },
  transcriptHint: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 12,
  },
  // Participants
  participantsContainer: {
    backgroundColor: '#2f3136',
    paddingVertical: 12,
    flexShrink: 0,
  },
  participantsGrid: {
    paddingHorizontal: 12,
  },
  participantItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 6,
    marginVertical: 6,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  activeParticipantBorder: {
    borderWidth: 2,
    borderColor: 'white',
  },
  participantAvatarImage: {
    width: '100%',
    height: '100%',
  },
  participantInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  participantName: {
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
  },
  // Controls
  controlsArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 32,
    backgroundColor: '#23272a',
    borderTopWidth: 1,
    borderTopColor: '#4f545c',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6c6d70',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micActiveButton: {
    backgroundColor: '#43b581',
  },
  cameraActiveButton: {
    backgroundColor: '#2a70e0',
  },
  // PIP camera
  pipContainer: {
    position: 'absolute',
    bottom: 110,
    right: 16,
    width: 120,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#7289da',
    zIndex: 10,
  },
  pipCamera: {
    flex: 1,
  },
});

export default VoiceMode;
