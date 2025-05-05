import { initDatabase } from './database';

// Initialize the database when the app starts
const initializeAppDatabase = async () => {
  try {
    await initDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export default initializeAppDatabase; 