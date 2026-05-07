import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen            from './src/screens/HomeScreen';
import RouteComparisonScreen from './src/screens/RouteComparisonScreen';
import SOSScreen             from './src/screens/SOSScreen';
import NavigationScreen      from './src/screens/NavigationScreen';
import IncidentReportScreen  from './src/screens/IncidentReportScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home"            component={HomeScreen} />
          <Stack.Screen name="RouteComparison" component={RouteComparisonScreen} />
          <Stack.Screen name="Navigation"      component={NavigationScreen} />
          <Stack.Screen name="SOS"             component={SOSScreen} />
          <Stack.Screen name="IncidentReport"  component={IncidentReportScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
