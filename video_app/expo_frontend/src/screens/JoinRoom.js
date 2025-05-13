import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { joinRoom, getAIPartners } from '../services/api';
import { fonts } from '../config/fonts';

/**
 * JoinRoom component - Screen to join an existing room (Expo version)
 */
const JoinRoom = ({ navigation }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  // Load username from AsyncStorage on component mount
  useEffect(() => {
    const loadUsername = async () => {
      try {
        const savedName = await AsyncStorage.getItem('username');
        if (savedName) {
          setName(savedName);
        }
      } catch (error) {
        console.error('Error loading username from storage:', error);
      }
    };

    loadUsername();
  }, []);

  const handleJoin = async () => {
    setError('');
    
    // Save user name to AsyncStorage
    if (name) {
      try {
        await AsyncStorage.setItem('username', name);
      } catch (e) {
        console.error('Error saving username:', e);
      }
    } else {
      setError("Please enter your name");
      return;
    }
    
    if (!roomId) {
      setError("Please enter a room ID");
      return;
    }
    
    setIsJoining(true);
    try {
      // Generate a unique user ID (in a real app, you might want a more robust solution)
      const userId = `user_${Date.now()}`;
      
      // Join the room
      await joinRoom(roomId, name, userId);
      
      // Get AI partners for the room
      const aiResponse = await getAIPartners(roomId);
      const aiPartners = aiResponse.aiPartners || [];
      
      // Navigate to the room screen with AI partners data
      navigation.navigate('VideoRoom', {
        roomId: roomId,
        aiPartners: aiPartners,
        userName: name,
        userId: userId
      });
      
    } catch (error) {
      console.error("Error joining room:", error);
      
      if (error.response) {
        if (error.response.status === 404) {
          setError("Room not found. Please check the room ID and try again.");
        } else if (error.response.status === 400) {
          setError("Failed to join room: " + (error.response.data?.message || JSON.stringify(error.response.data)));
        } else {
          setError("Failed to join room. Please try again later.");
        }
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setIsJoining(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <Text style={styles.title}>Join a Room</Text>
          <Text style={styles.subtitle}>Enter a room ID to join an existing session</Text>
          
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
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
                autoCorrect={false}
              />
            </View>
            
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            <TouchableOpacity
              style={[
                styles.button,
                (!name || !roomId || isJoining) && styles.buttonDisabled
              ]}
              onPress={handleJoin}
              disabled={!name || !roomId || isJoining}
            >
              {isJoining ? (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Joining...</Text>
                  <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
                </View>
              ) : (
                <Text style={styles.buttonText}>Join Room</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.backLink}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.backLinkText}>← Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontFamily: fonts.jaro.regular,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 32,
    fontFamily: fonts.inriaSans.bold,
    textAlign: 'center',
    color: '#666',
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
    fontFamily: fonts.inriaSans.bold,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    padding: 12,
    backgroundColor: 'gray',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
    fontWeight: '500',
  },
  spinner: {
    marginLeft: 8,
  },
  backLink: {
    marginTop: 24,
    alignSelf: 'center',
  },
  backLinkText: {
    color: 'gray',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    flex: 1,
    fontFamily: fonts.inriaSans.bold,
  },
});

export default JoinRoom;