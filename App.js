import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen            from './src/screens/HomeScreen';
import RouteComparisonScreen from './src/screens/RouteComparisonScreen';

// Install navigation:
// npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home"            component={HomeScreen} />
        <Stack.Screen name="RouteComparison" component={RouteComparisonScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}