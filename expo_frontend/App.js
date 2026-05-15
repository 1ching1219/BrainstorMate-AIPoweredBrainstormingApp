import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Home from './src/screens/Home';
import CreateRoom from './src/screens/CreateRoom';
import JoinRoom from './src/screens/JoinRoom';
import SelectAIPartners from './src/screens/SelectAIPartners';
import VoiceMode from './src/screens/VoiceMode';
import AddAI from './src/screens/AddAI';
import ChatRoom from './src/screens/ChatRoom';
// import VideoRoom from './src/screens/VideoRoom';
import { useFonts } from 'expo-font';
import { fontConfig } from './src/config/fonts';
import { View, ActivityIndicator } from 'react-native';

const Stack = createStackNavigator();

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
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={Home} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CreateRoom" 
          component={CreateRoom} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="JoinRoom" 
          component={JoinRoom} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SelectAIPartners" 
          component={SelectAIPartners} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AddAI" 
          component={AddAI} 
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChatRoom" 
          component={ChatRoom} 
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VoiceMode" 
          component={VoiceMode} 
          options={{ headerShown: false }}
        />
        {/* <Stack.Screen 
          name="VideoRoom" 
          component={VideoRoom} 
          options={{ headerShown: false }}
        /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
