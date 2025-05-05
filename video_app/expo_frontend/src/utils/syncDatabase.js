import axios from 'axios';
import {
  addRoom,
  getRoom,
  addParticipant,
  getParticipants,
  addMessage,
  getMessages,
  addAIAgent,
  getAIAgents,
  clearDatabase
} from './database';

const API_BASE_URL = 'http://localhost:8000/api';

// Sync rooms from backend to frontend
const syncRooms = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/rooms/`);
    const rooms = response.data;

    // Clear existing rooms and sync new ones
    for (const room of rooms) {
      await addRoom(room.id, room.name);
    }

    return rooms;
  } catch (error) {
    console.error('Error syncing rooms:', error);
    throw error;
  }
};

// Sync participants for a specific room
const syncParticipants = async (roomId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/rooms/${roomId}/participants/`);
    const participants = response.data;

    // Clear existing participants and sync new ones
    for (const participant of participants) {
      await addParticipant(
        roomId,
        participant.name,
        participant.is_ai
      );
    }

    return participants;
  } catch (error) {
    console.error('Error syncing participants:', error);
    throw error;
  }
};

// Sync messages for a specific room
const syncMessages = async (roomId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/rooms/${roomId}/messages/`);
    const messages = response.data;

    // Clear existing messages and sync new ones
    for (const message of messages) {
      await addMessage(
        roomId,
        message.sender,
        message.content,
        message.is_ai
      );
    }

    return messages;
  } catch (error) {
    console.error('Error syncing messages:', error);
    throw error;
  }
};

// Sync AI agents from backend to frontend
const syncAIAgents = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/ai-agents/`);
    const agents = response.data;

    // Clear existing agents and sync new ones
    for (const agent of agents) {
      await addAIAgent(
        agent.name,
        agent.role,
        agent.avatar,
        agent.description
      );
    }

    return agents;
  } catch (error) {
    console.error('Error syncing AI agents:', error);
    throw error;
  }
};

// Full database synchronization
export const syncFullDatabase = async () => {
  try {
    console.log('Starting full database synchronization...');
    
    // Sync AI agents first (they're independent)
    await syncAIAgents();
    console.log('AI agents synced successfully');

    // Sync rooms
    const rooms = await syncRooms();
    console.log('Rooms synced successfully');

    // For each room, sync participants and messages
    for (const room of rooms) {
      await syncParticipants(room.id);
      await syncMessages(room.id);
      console.log(`Room ${room.id} participants and messages synced successfully`);
    }

    console.log('Full database synchronization completed');
    return true;
  } catch (error) {
    console.error('Error during full database synchronization:', error);
    throw error;
  }
};

// Partial synchronization for a specific room
export const syncRoomData = async (roomId) => {
  try {
    console.log(`Starting synchronization for room ${roomId}...`);
    
    // Sync room details
    await syncRooms();
    
    // Sync participants and messages for this room
    await syncParticipants(roomId);
    await syncMessages(roomId);
    
    console.log(`Room ${roomId} synchronization completed`);
    return true;
  } catch (error) {
    console.error(`Error syncing room ${roomId}:`, error);
    throw error;
  }
};

// Sync AI agents only
export const syncAIAgentsOnly = async () => {
  try {
    console.log('Starting AI agents synchronization...');
    await syncAIAgents();
    console.log('AI agents synchronization completed');
    return true;
  } catch (error) {
    console.error('Error syncing AI agents:', error);
    throw error;
  }
};

// Clear and resync everything
export const resetAndSyncDatabase = async () => {
  try {
    console.log('Starting database reset and sync...');
    
    // Clear all local data
    await clearDatabase();
    console.log('Local database cleared');
    
    // Perform full sync
    await syncFullDatabase();
    console.log('Database reset and sync completed');
    
    return true;
  } catch (error) {
    console.error('Error during database reset and sync:', error);
    throw error;
  }
}; 