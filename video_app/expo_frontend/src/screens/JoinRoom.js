import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { addParticipant } from '../utils/database';
import { fonts } from '../config/fonts';

const JoinRoom = ({ navigation }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    if (!roomId) {
      Alert.alert('Error', 'Please enter a room ID');
      return;
    }
    
    setIsJoining(true);
    
    try {
      // Check if room exists
      const response = await axios.get(`http://localhost:8000/api/rooms/${roomId}/participants`);
      
      // Add user as a participant in the local database
      await addParticipant(roomId, name, false);
      
      // Navigate to AI partner selection with isNewRoom flag
      navigation.navigate('SelectAIPartners', { roomId, isNewRoom: false });
    } catch (error) {
      console.error("Error verifying room:", error);
      if (error.response && error.response.status === 404) {
        Alert.alert('Error', 'Room not found. Please check the room ID and try again.');
      } else {
        Alert.alert('Error', 'Failed to join room. Please try again later.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Join a Room</Text>
          <Text style={styles.subtitle}>Connect with your team</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Room ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter room ID to join"
              value={roomId}
              onChangeText={setRoomId}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isJoining && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={!name || !roomId || isJoining}
          >
            {isJoining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Join Room</Text>
            )}
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.jaro.regular,
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.inriaSans.regular,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputGroup: {
    marginBottom: 24,
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: fonts.inriaSans.bold,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    fontSize: 16,
    fontFamily: fonts.inriaSans.regular,
    backgroundColor: '#f5f5f5',
  },
  button: {
    backgroundColor: 'gray',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
});

export default JoinRoom; 