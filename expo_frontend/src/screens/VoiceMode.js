import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getParticipants } from '../services/api';

// Use the correct path to your images
const getImageSource = (name) => {
  // Add a null check to prevent the TypeError
  if (!name) return null;
  
  switch (name.toLowerCase()) {
    case 'designer': return require('../../assets/ai/designer.png');
    case 'engineer': return require('../../assets/ai/engineer.png');
    case 'finance': return require('../../assets/ai/finance.png');
    case 'professor': return require('../../assets/ai/professor.png');
    default: return null;
  }
};

// Update placeholders to use the images
const ALL_PARTICIPANTS_PLACEHOLDER = [
  { name: 'Designer', color: '#4287f5', avatarImg: require('../../assets/ai/designer.png') },
  { name: 'Engineer', color: '#f54242', avatarImg: require('../../assets/ai/engineer.png') },
  { name: 'Finance', color: '#42f560', avatarImg: require('../../assets/ai/finance.png') },
  { name: 'Professor', color: '#f5a442', avatarImg: require('../../assets/ai/professor.png') },
];

const VoiceMode = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const roomId = route.params?.roomId;

  const [isMicOn, setIsMicOn] = useState(true);
  const [currentSpeaker, setCurrentSpeaker] = useState({ name: 'User', color: '#7289da' });
  const [participants, setParticipants] = useState([]);

  const speakerIntervalRef = useRef(null);

  useEffect(() => {
    console.log("VoiceMode received params:", route.params);
    // Combine user and AI partners for speaker rotation
    const userName = route.params?.username;               // no fallback
    const passedAiPartners = route.params?.aiPartners || [];

    const allSpeakers = [
      { name: userName, color: '#7289da', avatarImg: null },
      ...passedAiPartners.map(p => ({
        name: p.name,                                     // use p.name
        color: getRandomColor(),
        avatarImg: getImageSource(p.name)
      }))
    ];

    setParticipants(allSpeakers);
    setCurrentSpeaker(allSpeakers[
      Math.floor(Math.random() * allSpeakers.length)
    ]);

  }, [route.params]);

  // Function to generate random hex colors
  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  useEffect(() => {
    if (participants.length > 0) {
      speakerIntervalRef.current = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * participants.length);
        setCurrentSpeaker(participants[randomIndex]);
      }, 3000); // Change speaker every 3 seconds
    }

    return () => {
      if (speakerIntervalRef.current) {
        clearInterval(speakerIntervalRef.current);
      }
    };
  }, [participants]);

  const toggleMic = () => {
    setIsMicOn(prev => !prev);
  };

  const navigateToChat = () => {
    // Update the screen name to match your route configuration - 'ChatRoom' instead of 'Room'
    navigation.navigate('ChatRoom', { 
      roomId, 
      aiPartners: route.params?.aiPartners,
      username: route.params?.username // Pass username back
    });
  };

  const navigateToHome = () => {
    navigation.navigate('Home');
  };

  // Get first letter for avatar placeholder
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.roomTitle}>Room {roomId} - Voice Mode</Text>
      </View>

      <View style={styles.speakerArea}>
        <View style={[
          styles.speakerAvatar, 
          !currentSpeaker.avatarImg && { backgroundColor: currentSpeaker.color || '#7289da' }
        ]}>
          {currentSpeaker.avatarImg ? (
            <Image 
              source={currentSpeaker.avatarImg} 
              style={styles.avatarImage} 
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarInitial}>
              {getInitial(currentSpeaker.name)}
            </Text>
          )}
        </View>
        <Text style={styles.speakerName}>{currentSpeaker.name}</Text>
      </View>

      <View style={styles.controlsArea}>
        <TouchableOpacity 
          style={[styles.controlButton, isMicOn ? styles.activeButton : {}]} 
          onPress={toggleMic}
          activeOpacity={0.7}
        >
          <Feather 
            name={isMicOn ? "mic" : "mic-off"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={navigateToChat}
          activeOpacity={0.7}
        >
          <Feather name="x" size={24} color="white" />
        </TouchableOpacity>
        
        {/* <TouchableOpacity 
          style={[styles.controlButton, styles.dangerButton]} 
          onPress={navigateToHome}
          activeOpacity={0.7}
        >
          <Feather name="x" size={24} color="white" />
        </TouchableOpacity> */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2f33',
  },
  header: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#4f545c',
    backgroundColor: '#23272a',
  },
  roomTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  speakerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    marginBottom: 20,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 60,
    fontWeight: 'bold',
    color: 'white',
  },
  speakerName: {
    fontSize: 22,
    fontWeight: '500',
    color: 'white',
    textAlign: 'center',
  },
  controlsArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    marginHorizontal: 20,
  },
  activeButton: {
    backgroundColor: '#43b581', // Green for active mic
  },
  dangerButton: {
    backgroundColor: '#f04747', // Red for leave
  },
});

export default VoiceMode;
