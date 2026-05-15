import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { createRoom } from '../services/api';
import { fonts } from '../config/fonts';

const CreateRoom = ({ navigation }) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  const handleCreate = async () => {
    setError('');
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const response = await createRoom(`${name}'s Room`);
      console.log('Room creation response:', response);
      
      if (!response.room_id) {
        throw new Error('Room ID is missing from response');
      }
      
      navigation.navigate('SelectAIPartners', {
        roomId: response.room_id,
        isNewRoom: true
      });
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room. Please try again later.');
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
      </View> */}
      
      <View style={styles.content}>
        <Text style={styles.title}>Create a New Room</Text>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
        />
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        
        <TouchableOpacity
          style={[styles.button, isCreating && styles.disabledButton]}
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
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 24,
    marginRight: 16,
    fontFamily: fonts.inriaSans.bold,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.jaro.regular,
    color: '#000',
    marginBottom: 24,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: fonts.inriaSans.regular,
    marginBottom: 20,
  },
  button: {
    backgroundColor: 'gray',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
  errorContainer: {
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    fontFamily: fonts.inriaSans.regular,
  },
});

export default CreateRoom; 