import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { fonts } from '../config/fonts';

const AddAI = ({ navigation, route }) => {
  const [aiRole, setAiRole] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [aiAvatar, setAiAvatar] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  // const { roomId, isNewRoom } = route.params;
  const roomId = '1234567890';
  const isNewRoom = true;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAiAvatar(result.assets[0].uri);
    }
  };

  const validateFields = () => {
    if (!aiRole.trim()) {
      Alert.alert('Error', 'AI Role is required.');
      return false;
    }
    if (!aiDescription.trim()) {
      Alert.alert('Error', 'AI Description is required.');
      return false;
    }
    if (!aiAvatar) {
      Alert.alert('Error', 'AI Avatar is required.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateFields()) return;

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('role', aiRole);
      formData.append('description', aiDescription);
      
      // Convert the image URI to a blob
      const response = await fetch(aiAvatar);
      const blob = await response.blob();
      formData.append('avatar', blob, 'avatar.jpg');

      const saveResponse = await axios.post('http://localhost:8000/api/save-ai/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (saveResponse.status === 200) {
        Alert.alert('Success', 'AI agent created successfully!');
        navigation.navigate('SelectAIPartners', { roomId, isNewRoom });
      }
    } catch (error) {
      console.error('Error saving AI:', error);
      Alert.alert('Error', 'Failed to save AI agent. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigation.navigate('SelectAIPartners', { roomId, isNewRoom });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add new AI partner</Text>
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.imageContainer}>
          <TouchableOpacity 
            style={styles.imagePlaceholder}
            onPress={pickImage}
          >
            {aiAvatar ? (
              <Image source={{ uri: aiAvatar }} style={styles.image} />
            ) : (
              <Text style={styles.imagePlaceholderText}>+</Text>
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Name the Role"
            value={aiRole}
            onChangeText={setAiRole}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Specialize</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="This AI is going to be... For example: Gender/Tone/Character..."
            value={aiDescription}
            onChangeText={setAiDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.disabledButton]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 12,
    marginBottom: 24,
  },
  backButton: {
    fontSize: 35,
    fontFamily: fonts.inriaSans.bold,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.jaro.regular,
  },
  form: {
    padding: 12,
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  imagePlaceholderText: {
    fontSize: 24,
    fontFamily: fonts.inriaSans.bold,
    color: '#888',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    fontSize: 16,
    fontFamily: fonts.inriaSans.regular,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: fonts.inriaSans.bold,
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: 'gray',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
});

export default AddAI; 