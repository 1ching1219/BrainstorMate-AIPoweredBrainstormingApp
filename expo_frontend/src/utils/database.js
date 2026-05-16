import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

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

// Get the database path
const getDatabasePath = () => {
  if (Platform.OS === 'web') {
    return null;
  }
  return `${FileSystem.documentDirectory}SQLite/brainstormmate.db`;
};

// Open database connection
const openDatabase = () => {
  if (Platform.OS === "web") {
    return {
      transaction: () => {
        return {
          executeSql: () => {},
        };
      },
    };
  }

  // Create SQLite directory if it doesn't exist
  const dbPath = getDatabasePath();
  if (dbPath) {
    const dirPath = dbPath.substring(0, dbPath.lastIndexOf('/'));
    FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }

  const db = SQLite.openDatabase("brainstormmate.db");
  return db;
};

// Initialize database tables
export const initDatabase = async () => {
  const db = openDatabase();
  
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Create rooms table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1
        );`
      );

      // Create participants table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id TEXT,
          name TEXT,
          is_ai INTEGER DEFAULT 0,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES rooms (id)
        );`
      );

      // Create messages table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id TEXT,
          sender TEXT,
          content TEXT,
          is_ai INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES rooms (id)
        );`
      );

      // Create ai_agents table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS ai_agents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          role TEXT,
          avatar TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );
    }, 
    (error) => {
      console.error('Error creating database tables:', error);
      reject(error);
    },
    () => {
      console.log('Database tables created successfully');
      resolve();
    });
  });
};

// Room operations
export const addRoom = (roomId, roomName) => {
  const db = openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO rooms (id, name) VALUES (?, ?)',
        [roomId, roomName],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export const getRoom = (roomId) => {
  const db = openDatabase();
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
export const addParticipant = (roomId, name, isAI = false) => {
  const db = openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO participants (room_id, name, is_ai) VALUES (?, ?, ?)',
        [roomId, name, isAI ? 1 : 0],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export const getParticipants = (roomId) => {
  const db = openDatabase();
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
export const addMessage = (roomId, sender, content, isAI = false) => {
  const db = openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO messages (room_id, sender, content, is_ai) VALUES (?, ?, ?, ?)',
        [roomId, sender, content, isAI ? 1 : 0],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export const getMessages = (roomId) => {
  const db = openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC',
        [roomId],
        (_, { rows: { _array } }) => resolve(_array),
        (_, error) => reject(error)
      );
    });
  });
};

// AI Agent operations
export const addAIAgent = (name, role, avatar, description) => {
  const db = openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO ai_agents (name, role, avatar, description) VALUES (?, ?, ?, ?)',
        [name, role, avatar, description],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export const getAIAgents = () => {
  const db = openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM ai_agents',
        [],
        (_, { rows: { _array } }) => resolve(_array),
        (_, error) => reject(error)
      );
    });
  });
};

// Cleanup operations
export const clearDatabase = () => {
  const db = openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM messages');
      tx.executeSql('DELETE FROM participants');
      tx.executeSql('DELETE FROM rooms');
      tx.executeSql('DELETE FROM ai_agents');
    }, reject, resolve);
  });
}; 