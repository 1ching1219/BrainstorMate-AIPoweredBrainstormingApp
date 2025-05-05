import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import { fonts } from '../config/fonts';

const Home = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BrainstorMate</Text>
        <Text style={styles.subtitle}>Your AI-powered creativity partner.</Text>
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateRoom')}
        >
          <Text style={styles.actionButtonText}>Create a New Room</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('JoinRoom')}
        >
          <Text style={styles.secondaryButtonText}>Join Existing Room</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 35,
    fontFamily: fonts.jaro.regular,
    marginBottom: 40,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontFamily: fonts.inriaSans.regular,
    marginBottom: 32,
    textAlign: 'center',
    color: '#555',
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'column',
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'gray',
    borderRadius: 8,
    marginBottom: 16,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontFamily: fonts.inriaSans.bold,
  },
});

export default Home; 