import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { useFonts } from 'expo-font';
import { fontConfig } from './src/config/fonts';
import { View, ActivityIndicator } from 'react-native';

export default function App() {
  const [fontsLoaded, error] = useFonts(fontConfig);

  if (error) {
    console.error('Error loading fonts:', error);
  }

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
