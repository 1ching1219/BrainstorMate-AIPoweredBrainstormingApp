import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Home from '../screens/Home';
import CreateRoom from '../screens/CreateRoom';
import JoinRoom from '../screens/JoinRoom';
import SelectAIPartners from '../screens/SelectAIPartners';
import VideoRoom from '../screens/VideoRoom';
import AddAI from '../screens/AddAI';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="CreateRoom" component={CreateRoom} />
      <Stack.Screen name="JoinRoom" component={JoinRoom} />
      <Stack.Screen name="SelectAIPartners" component={SelectAIPartners} />
      <Stack.Screen name="VideoRoom" component={VideoRoom} />
      <Stack.Screen name="AddAI" component={AddAI} />
    </Stack.Navigator>
  );
};

export default AppNavigator; 