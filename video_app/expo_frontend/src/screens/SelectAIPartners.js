import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import axios from 'axios';
import { addParticipant } from '../utils/database';
import { fonts } from '../config/fonts';

// Import AI avatars
const designerAvatar = require('../../assets/ai/designer.png');
const engineerAvatar = require('../../assets/ai/engineer.png');
const financeAvatar = require('../../assets/ai/finance.png');
const professorAvatar = require('../../assets/ai/professor.png');

const SelectAIPartners = ({ navigation, route }) => {
  const [aiAgents, setAiAgents] = useState([
    { id: 1, role: 'Designer', avatar: designerAvatar },
    { id: 2, role: 'Engineer', avatar: engineerAvatar },
    { id: 3, role: 'Finance', avatar: financeAvatar },
    { id: 4, role: 'Professor', avatar: professorAvatar }
  ]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  
//   const { roomId, isNewRoom } = route.params;
  const roomId = '1234567890';
  const isNewRoom = true;
  
  useEffect(() => {
    // Redirect if room ID is missing
    if (!roomId) {
      console.error('Room ID is missing');
      navigation.navigate('Home');
      return;
    }
    
    // If not a new room, redirect to VideoRoom
    if (!isNewRoom) {
      navigation.navigate('VideoRoom', { roomId });
      return;
    }
    
    // Fetch AI agents from backend
    const fetchAIAgents = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/ai-agents/');
        if (response.data.length > 0) {
          // Map the backend data to include our local avatars
          const updatedAgents = response.data.map(agent => ({
            ...agent,
            avatar: {
              1: designerAvatar,
              2: engineerAvatar,
              3: financeAvatar,
              4: professorAvatar
            }[agent.id] || designerAvatar // fallback to designer avatar if id not found
          }));
          setAiAgents(updatedAgents);
        }
      } catch (error) {
        console.error('Error fetching AI agents:', error);
      } finally {
        setLoadingPage(false);
      }
    };
    
    fetchAIAgents();
  }, [roomId, navigation]);
  
  const toggleAgent = (agent) => {
    if (selectedAgents.find(a => a.id === agent.id)) {
      setSelectedAgents(selectedAgents.filter(a => a.id !== agent.id));
    } else {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };
  
  const handleStart = async () => {
    if (!roomId) {
      console.error('Room ID is missing');
      Alert.alert('Error', 'Cannot create room, missing room ID');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`Setting up room ${roomId} with selected AI partners`);
      
      // Format selected AI partners
      const aiPartners = selectedAgents.map(agent => ({
        id: agent.id,
        name: agent.role,
        role: agent.role,
        avatar: agent.avatar
      }));
      
      // Save the selected AI partners to the database for this room
      await axios.post(`http://localhost:8000/api/rooms/${roomId}/ai-partners/`, {
        aiPartners: aiPartners
      });
      
      // Add AI partners to local database
      for (const partner of aiPartners) {
        await addParticipant(roomId, partner.name, true);
      }
      
      // Navigate to the room with AI partners as params
      navigation.navigate('VideoRoom', {
        roomId,
        aiPartners
      });
    } catch (error) {
      console.error('Error saving AI partners or starting room:', error);
      Alert.alert('Error', 'Error while saving AI partners or joining room. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (loadingPage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Loading AI partners...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007aff" />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select AI partners for your room</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.grid}>
        {aiAgents.map((agent) => (
          <TouchableOpacity
            key={agent.id}
            style={[
              styles.aiOption,
              selectedAgents.some(a => a.id === agent.id) && styles.selectedOption
            ]}
            onPress={() => toggleAgent(agent)}
          >
            <View style={[
              styles.aiAvatar,
              selectedAgents.some(a => a.id === agent.id) && styles.selectedAvatar
            ]}>
              <Image source={agent.avatar} style={styles.aiImage} />
            </View>
            <Text style={styles.aiRole}>{agent.role}</Text>
          </TouchableOpacity>
        ))}
        
        {/* Add AI Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddAI', { roomId, isNewRoom })}
        >
          <View style={styles.addButtonInner}>
            <Text style={styles.addButtonText}>+</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      
      <TouchableOpacity
        style={[styles.startButton, isLoading && styles.disabledButton]}
        onPress={handleStart}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.startButtonText}>Start Room</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
  },
  header: {
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
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8,
  },
  aiOption: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
    borderRadius: 10,
  },
  selectedOption: {
    backgroundColor: 'rgba(197, 152, 54, 0.1)',
  },
  aiAvatar: {
    width: 80,
    height: 80,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAvatar: {
    borderWidth: 3,
    borderColor: 'rgb(197, 152, 54)',
  },
  aiImage: {
    width: '100%',
    height: '100%',
  },
  aiRole: {
    fontSize: 14,
    fontFamily: fonts.inriaSans.bold,
    textAlign: 'center',
  },
  startButton: {
    padding: 12,
    backgroundColor: '#007aff',
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
  addButton: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
  },
  addButtonInner: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#aaa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    fontFamily: fonts.inriaSans.bold,
    color: '#aaa',
  },
});

export default SelectAIPartners; 