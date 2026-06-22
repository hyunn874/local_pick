import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import RootTabNavigator from './src/navigation/RootTabNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <RootTabNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
