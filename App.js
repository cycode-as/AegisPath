import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Onboarding (shown once, before tabs)
import OnboardingScreen from './src/screens/OnboardingScreen';

// Main tab navigator (Home, Routes, Navigate, Time, Safety)
import MainTabs from './src/navigation/MainTabs';

// Deep-flow screens pushed on top of tabs
import TravelModeScreen      from './src/screens/TravelModeScreen';
import CabVerificationScreen from './src/screens/CabVerificationScreen';
import IncidentReportScreen  from './src/screens/IncidentReportScreen';
import RiskMitigationScreen  from './src/screens/RiskMitigationScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('@aegispath_onboarded').then(val => {
      setInitialRoute(val === 'true' ? 'Main' : 'Onboarding');
    });
  }, []);

  if (initialRoute === null) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {/* ── Pre-auth ── */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />

          {/* ── Main app (tabs) ── */}
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ animation: 'fade' }}
          />

          {/* ── Deep flows pushed on top of tabs ── */}
          <Stack.Screen name="TravelMode"      component={TravelModeScreen} />
          <Stack.Screen name="CabVerification" component={CabVerificationScreen} />
          <Stack.Screen name="IncidentReport"  component={IncidentReportScreen} />
          <Stack.Screen name="RiskMitigation"  component={RiskMitigationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
