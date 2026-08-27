import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import RootTabNavigator from './src/navigation/RootTabNavigator';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { isInitializing } = useAuth();

  useEffect(() => {
    if (!isInitializing) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [isInitializing]);

  if (isInitializing) {
    return null;
  }

  return (
    <NavigationContainer>
      <RootTabNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
