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
import { updateAIAgent, deleteAIAgent } from '../services/api';
import { fonts } from '../config/fonts';

const EditAI = ({ navigation, route }) => {
  const { agent, roomId, isNewRoom } = route.params;

  const [role, setRole] = useState(agent.role || '');
  const [description, setDescription] = useState(agent.description || '');
  // avatar holds a local file URI if the user picks a new image, otherwise null (keep existing)
  const [avatar, setAvatar] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const existingAvatarUri = agent.avatar_url || null;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!role.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setIsSaving(true);
    try {
      await updateAIAgent(agent.id, role.trim(), description.trim(), avatar);
      navigation.navigate('SelectAIPartners', { roomId, isNewRoom });
    } catch (error) {
      Alert.alert('Error', 'Failed to update AI partner. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete AI Partner',
      `Are you sure you want to delete "${agent.role}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAIAgent(agent.id);
              navigation.navigate('SelectAIPartners', { roomId, isNewRoom });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete AI partner. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const previewSource = avatar
    ? { uri: avatar }
    : existingAvatarUri
      ? { uri: existingAvatarUri }
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit AI Partner</Text>
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.imageContainer}>
          <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
            {previewSource ? (
              <Image source={previewSource} style={styles.image} />
            ) : (
              <Text style={styles.imagePlaceholderText}>+</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.imageLabel}>
            {avatar ? 'New image selected' : 'Tap to change avatar'}
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Role</Text>
          <TextInput
            style={styles.input}
            value={role}
            onChangeText={setRole}
            placeholder="Enter AI partner role"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter AI partner description"
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.disabledButton]}
          onPress={handleSave}
          disabled={isSaving || isDeleting}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.disabledButton]}
          onPress={handleDelete}
          disabled={isSaving || isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete AI Partner</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
    fontSize: 24,
    fontFamily: fonts.jaro.regular,
  },
  form: { flex: 1, padding: 20 },
  imageContainer: { alignItems: 'center', marginBottom: 20 },
  imagePlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', borderRadius: 60 },
  imagePlaceholderText: { fontSize: 40, color: '#999' },
  imageLabel: {
    fontSize: 14,
    fontFamily: fonts.inriaSans.regular,
    color: '#666',
  },
  inputGroup: { marginBottom: 20 },
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
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: 'gray',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
  deleteButton: {
    backgroundColor: '#c0392b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
  disabledButton: { opacity: 0.5 },
});

export default EditAI;
