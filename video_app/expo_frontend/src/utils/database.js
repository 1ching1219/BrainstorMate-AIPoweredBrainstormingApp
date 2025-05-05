import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

// Function to copy the existing database
const copyDatabase = async () => {
  const dbName = 'brainstormmate.db';
  const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;
  
  // Create SQLite directory if it doesn't exist
  const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}SQLite`);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}SQLite`, { intermediates: true });
  }

  // Check if the database already exists
  const dbExists = await FileSystem.getInfoAsync(dbPath);
  
  if (!dbExists.exists) {
    try {
      // Load the database from assets
      const asset = Asset.fromModule(require('../assets/db.sqlite3'));
      await asset.downloadAsync();
      
      // Copy the database to the SQLite directory
      await FileSystem.copyAsync({
        from: asset.localUri,
        to: dbPath
      });
      
      console.log('Database copied successfully');
    } catch (error) {
      console.error('Error copying database:', error);
      throw error;
    }
  }
  
  return dbPath;
};

// Open the database
let db;
const initDatabase = async () => {
  try {
    const dbPath = await copyDatabase();
    db = SQLite.openDatabase(dbPath);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Room operations
const createRoom = (name) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO rooms (name) VALUES (?)',
        [name],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      );
    });
  });
};

const getRoom = (roomId) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM rooms WHERE id = ?',
        [roomId],
        (_, { rows: { _array } }) => resolve(_array[0]),
        (_, error) => reject(error)
      );
    });
  });
};

// Participant operations
const addParticipant = (roomId, name, isAi = false) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO participants (room_id, name, is_ai) VALUES (?, ?, ?)',
        [roomId, name, isAi ? 1 : 0],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      );
    });
  });
};

const getParticipants = (roomId) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM participants WHERE room_id = ?',
        [roomId],
        (_, { rows: { _array } }) => resolve(_array),
        (_, error) => reject(error)
      );
    });
  });
};

// Message operations
const addMessage = (roomId, senderId, content) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO messages (room_id, sender_id, content) VALUES (?, ?, ?)',
        [roomId, senderId, content],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      );
    });
  });
};

const getMessages = (roomId) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT m.*, p.name as sender_name 
         FROM messages m 
         JOIN participants p ON m.sender_id = p.id 
         WHERE m.room_id = ? 
         ORDER BY m.created_at ASC`,
        [roomId],
        (_, { rows: { _array } }) => resolve(_array),
        (_, error) => reject(error)
      );
    });
  });
};

export {
  initDatabase,
  createRoom,
  getRoom,
  addParticipant,
  getParticipants,
  addMessage,
  getMessages
}; 