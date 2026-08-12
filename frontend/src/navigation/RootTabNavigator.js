import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import ChatRoomScreen from '../screens/ChatRoomScreen';
import LocalPassScreen from '../screens/LocalPassScreen';
import MainScreen from '../screens/MainScreen';
import MapScreen from '../screens/MapScreen';
import { colors } from '../constants/colors';

const Tab = createBottomTabNavigator();

export default function RootTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen name="Main" component={MainScreen} options={{ title: '메인' }} />
      <Tab.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: '소통방' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: '지도' }} />
      <Tab.Screen name="LocalPass" component={LocalPassScreen} options={{ title: '내 로컬패스' }} />
    </Tab.Navigator>
  );
}
