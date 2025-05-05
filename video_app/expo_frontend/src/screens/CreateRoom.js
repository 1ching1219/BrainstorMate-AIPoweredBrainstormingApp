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
import { createRoom, addParticipant } from '../utils/database';
import { fonts } from '../config/fonts';

const CreateRoom = ({ navigation }) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsCreating(true);

    try {
      // Create a new room in the backend
      const response = await axios.post('http://localhost:8000/api/rooms/create/', {
        name: `${name}'s Room`
      });
      // const response = await axios.post('http://192.168.105.81:8000/api/rooms/create/', {
      //   name: `${name}'s Room`
      // });

      const newRoomId = response.data.room_id;

      // Create room in local database
      await createRoom(`${name}'s Room`);

      // Add user as a participant
      await addParticipant(newRoomId, name, false);

      // Navigate to AI partner selection with isNewRoom flag
      navigation.navigate('SelectAIPartners', { roomId: newRoomId, isNewRoom: true });
    } catch (error) {
      console.error("Error creating room:", error);
      Alert.alert('Error', 'Failed to create room. Please try again later.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create a New Room</Text>
          <Text style={styles.subtitle}>Start your brainstorming session</Text>
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

          <TouchableOpacity
            style={[styles.button, isCreating && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={!name || isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Room</Text>
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

export default CreateRoom; 