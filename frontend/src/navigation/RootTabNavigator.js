import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import AdoptedPlacesScreen from '../screens/AdoptedPlacesScreen';
import AllRecommendScreen from '../screens/AllRecommendScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import HotLocalScreen from '../screens/HotLocalScreen';
import LocalPassScreen from '../screens/LocalPassScreen';
import LoginScreen from '../screens/LoginScreen';
import MainScreen from '../screens/MainScreen';
import MapScreen from '../screens/MapScreen';
import NotificationScreen from '../screens/NotificationScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PassHistoryScreen from '../screens/PassHistoryScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import ResidentVerificationScreen from '../screens/ResidentVerificationScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TermsScreen from '../screens/TermsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const MAIN_GREEN = '#2D5C44';
const TEXT_MUTED = '#999999';

const VISIBLE_TAB_NAMES = ['Main', 'Map', 'ChatRoom', 'LocalPass'];
const GUEST_RESTRICTED_TAB_NAMES = ['ChatRoom', 'LocalPass'];
const guestRestrictedMessages = {
  ChatRoom: '소통방은 로그인 후 이용할 수 있어요.',
  LocalPass: '내 로컬패스는 로그인 후 이용할 수 있어요.',
};

const tabIcons = {
  Main: {
    active: 'home',
    inactive: 'home-outline',
  },
  Map: {
    active: 'map',
    inactive: 'map-outline',
  },
  ChatRoom: {
    active: 'chatbubbles',
    inactive: 'chatbubbles-outline',
  },
  LocalPass: {
    active: 'ticket',
    inactive: 'ticket-outline',
  },
};

function TabIcon({ routeName, focused }) {
  if (!tabIcons[routeName]) {
    return null;
  }

  return (
    <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
      <Ionicons
        name={focused ? tabIcons[routeName].active : tabIcons[routeName].inactive}
        size={24}
        color={focused ? MAIN_GREEN : TEXT_MUTED}
      />
    </View>
  );
}

function LocalPickTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { exitGuestMode, isGuest } = useAuth();
  const visibleRoutes = state.routes.filter((route) => VISIBLE_TAB_NAMES.includes(route.name));
  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View style={[styles.tabBarShell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.tabBar}>
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const focused = activeRouteName === route.name;

          const handlePress = () => {
            if (isGuest && GUEST_RESTRICTED_TAB_NAMES.includes(route.name)) {
              Alert.alert(
                '로그인이 필요해요',
                guestRestrictedMessages[route.name],
                [
                  { text: '취소', style: 'cancel' },
                  { text: '로그인하기', onPress: exitGuestMode },
                ],
              );
              return;
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={handlePress}
            >
              <TabIcon routeName={route.name} focused={focused} />
              <Text style={[styles.label, focused ? styles.activeLabel : styles.inactiveLabel]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <LocalPickTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Main" component={MainScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: '지도' }} />
      <Tab.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: '소통방' }} />
      <Tab.Screen name="LocalPass" component={LocalPassScreen} options={{ title: '내 로컬패스' }} />
      <Tab.Screen
        name="HotLocalScreen"
        component={HotLocalScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthGate() {
  const { isGuest, isInitializing, isLoggedIn, isOnboarded } = useAuth();
  const shouldShowLogin = !isLoggedIn && !isGuest;
  const shouldShowOnboarding = isLoggedIn && isOnboarded === false;

  if (isInitializing) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={MAIN_GREEN} />
      </View>
    );
  }

  if (shouldShowLogin) {
    return <LoginScreen />;
  }

  if (shouldShowOnboarding) {
    return <OnboardingScreen />;
  }

  return (
    <MainTabs />
  );
}

function SettingsRoute({ navigation }) {
  const { isGuest, isLoggedIn } = useAuth();

  if (!isLoggedIn || isGuest) {
    return <LoginScreen navigation={navigation} />;
  }

  return <SettingsScreen navigation={navigation} />;
}

export default function RootTabNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthGate" component={AuthGate} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Settings" component={SettingsRoute} />
      <Stack.Screen name="AdoptedPlaces" component={AdoptedPlacesScreen} />
      <Stack.Screen name="Notification" component={NotificationScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="AllRecommend" component={AllRecommendScreen} />
      <Stack.Screen name="PassHistory" component={PassHistoryScreen} />
      <Stack.Screen name="ResidentVerification" component={ResidentVerificationScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#F8F6F1',
    flex: 1,
    justifyContent: 'center',
  },
  tabBarShell: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 16,
    flexDirection: 'row',
    height: 76,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#101810',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 56,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 44,
  },
  activeIconContainer: {
    backgroundColor: '#E7EFE9',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    marginTop: 2,
    textAlign: 'center',
  },
  activeLabel: {
    color: MAIN_GREEN,
  },
  inactiveLabel: {
    color: TEXT_MUTED,
  },
});
