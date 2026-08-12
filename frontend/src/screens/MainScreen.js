import { useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const ORANGE = '#F28C28';
const PLACEHOLDER_GRAY = '#E0E0E0';
const FEATURE_CARD_HEIGHT = 224;
const CANDIDATE_CARD_WIDTH = Dimensions.get('window').width * 0.75;

const discoveryTags = ['방문자 +31%', '소비강도 낮음', '다양성 하위 22%'];

const candidateRegions = [
  {
    id: 'hongseong',
    icon: '◇',
    name: '충남 홍성군',
    rank: '후보 2위',
  },
  {
    id: 'gochang',
    icon: '○',
    name: '전북 고창군',
    rank: '후보 3위',
  },
];

const statusItems = [
  {
    label: '채택 명소',
    value: '247',
  },
  {
    label: '활성 지역',
    value: '38',
  },
  {
    label: '거주자',
    value: '1.2K',
  },
];

const adoptedPlaces = [
  {
    id: 'science-road',
    icon: '⌖',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    name: '유성 과학 산책길',
    region: '대전 유성구',
    generation: '2030 추천',
  },
  {
    id: 'market',
    icon: '□',
    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9',
    name: '봉명 로컬마켓',
    region: '대전 유성구',
    generation: '가족 추천',
  },
];

export default function MainScreen() {
  const navigation = useNavigation();
  const cardAnimation = useSharedValue(0);
  const refreshTimeoutRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);

      cardAnimation.value = 0;
      cardAnimation.value = withTiming(1, { duration: 400 });
    }, 1000);

    return () => {
      clearTimeout(loadingTimer);

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [cardAnimation]);

  const handleNavigateHotLocal = () => {
    navigation.navigate('HotLocalScreen');
  };

  const handleShowAllPlaces = () => {
    Alert.alert('준비 중', '곧 오픈 예정이에요!');
  };

  const handleShowNotifications = () => {
    setHasNotification(false);
    Alert.alert('알림', '새로운 알림이 없어요');
  };

  const handleGoToChatRoom = () => {
    navigation.navigate('ChatRoom');
  };

  const handleRefresh = () => {
    setRefreshing(true);

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshing(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardAnimation.value,
    transform: [
      {
        translateY: (1 - cardAnimation.value) * 18,
      },
    ],
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={MAIN_GREEN}
            colors={[MAIN_GREEN]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.logoGroup}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>L</Text>
            </View>
            <Text style={styles.logoText}>로컬픽</Text>
          </View>
          <TouchableOpacity
            style={styles.bellButton}
            activeOpacity={0.7}
            onPress={handleShowNotifications}
          >
            <View style={styles.notificationIconWrap}>
              <Ionicons name="notifications-outline" size={26} color={MAIN_GREEN} />
              {hasNotification && <View style={styles.notificationBadge} />}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>이 주의 발굴 지역</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={handleNavigateHotLocal}>
            <Text style={styles.sectionLink}>TOP 3 보기 &gt;</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.featurePlaceholder} />
        ) : (
          <Animated.View style={cardAnimatedStyle}>
            <View style={styles.featureCard}>
              <Text style={styles.featureRegion}>대전 유성구</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>지금 보기 직전</Text>
              </View>
              <View style={styles.tagRow}>
                {discoveryTags.map((tag) => (
                  <View key={tag} style={styles.featureTag}>
                    <Text style={styles.featureTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.detailButton}
                activeOpacity={0.7}
                onPress={handleNavigateHotLocal}
              >
                <Text style={styles.detailButtonText}>자세히 보기 →</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <View style={styles.sectionBlock}>
          <Text style={styles.blockTitle}>다음 발굴 후보 지역</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.candidateList}
          >
            {candidateRegions.map((region) => (
              <View key={region.id} style={styles.candidateCard}>
                <View style={styles.candidateIcon}>
                  <Text style={styles.candidateIconText}>{region.icon}</Text>
                </View>
                <View>
                  <Text style={styles.candidateName}>{region.name}</Text>
                  <Text style={styles.candidateRank}>{region.rank}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.blockTitle}>로컬픽 현황</Text>
          <View style={styles.statusRow}>
            {statusItems.map((item) => (
              <View key={item.label} style={styles.statusItem}>
                <Text style={styles.statusValue}>{item.value}</Text>
                <Text style={styles.statusLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.blockTitle}>최근 채택된 명소</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={handleShowAllPlaces}>
            <Text style={styles.sectionLink}>전체보기 &gt;</Text>
          </TouchableOpacity>
        </View>

        {adoptedPlaces.length === 0 ? (
          <View style={styles.emptyPlaces}>
            <Text style={styles.emptyPlacesText}>아직 채택된 명소가 없어요</Text>
            <TouchableOpacity
              style={styles.emptyPlacesButton}
              activeOpacity={0.7}
              onPress={handleGoToChatRoom}
            >
              <Text style={styles.emptyPlacesButtonText}>소통방에서 첫 명소를 공유해보세요 →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeList}>
            {adoptedPlaces.map((place) => (
              <View key={place.id} style={styles.placeItem}>
                <Image
                  source={{ uri: place.imageUrl }}
                  style={styles.placeImage}
                  contentFit="cover"
                  transition={300}
                />
                <View style={styles.placeInfo}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeRegion}>{place.region}</Text>
                </View>
                <View style={styles.generationTag}>
                  <Text style={styles.generationTagText}>{place.generation}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  logoGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  logoIcon: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  logoIconText: {
    color: CARD,
    fontSize: 18,
    fontWeight: '900',
  },
  logoText: {
    color: MAIN_GREEN,
    fontSize: 22,
    fontWeight: '900',
  },
  bellButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  notificationIconWrap: {
    alignItems: 'center',
    height: 26,
    justifyContent: 'center',
    position: 'relative',
    width: 26,
  },
  notificationBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    color: MAIN_GREEN,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionLink: {
    color: MAIN_GREEN,
    fontSize: 13,
    fontWeight: '700',
  },
  featureCard: {
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    minHeight: FEATURE_CARD_HEIGHT,
    padding: 20,
  },
  featurePlaceholder: {
    backgroundColor: PLACEHOLDER_GRAY,
    borderRadius: 8,
    height: FEATURE_CARD_HEIGHT,
  },
  featureRegion: {
    color: CARD,
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: ORANGE,
    borderRadius: 999,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: CARD,
    fontSize: 12,
    fontWeight: '800',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 18,
  },
  featureTag: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  featureTagText: {
    color: CARD,
    fontSize: 12,
    fontWeight: '700',
  },
  detailButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: CARD,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  detailButtonText: {
    color: MAIN_GREEN,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionBlock: {
    marginTop: 26,
  },
  blockTitle: {
    color: '#17251D',
    fontSize: 18,
    fontWeight: '900',
  },
  candidateList: {
    gap: 12,
    paddingTop: 12,
  },
  candidateCard: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    width: CANDIDATE_CARD_WIDTH,
  },
  candidateIcon: {
    alignItems: 'center',
    backgroundColor: '#E7EFE9',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  candidateIconText: {
    color: MAIN_GREEN,
    fontSize: 21,
    fontWeight: '900',
  },
  candidateName: {
    color: '#17251D',
    fontSize: 15,
    fontWeight: '800',
  },
  candidateRank: {
    color: '#7B8179',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    marginBottom: 28,
    marginTop: 26,
    padding: 18,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusValue: {
    color: MAIN_GREEN,
    fontSize: 23,
    fontWeight: '900',
  },
  statusLabel: {
    color: '#7B8179',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  placeList: {
    gap: 10,
  },
  emptyPlaces: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 20,
  },
  emptyPlacesText: {
    color: '#7B8179',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyPlacesButton: {
    alignItems: 'center',
    backgroundColor: '#E7EFE9',
    borderRadius: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  emptyPlacesButtonText: {
    color: MAIN_GREEN,
    fontSize: 13,
    fontWeight: '900',
  },
  placeItem: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  placeImage: {
    backgroundColor: '#E8F0EB',
    borderRadius: 8,
    height: 40,
    width: 40,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    color: '#17251D',
    fontSize: 15,
    fontWeight: '800',
  },
  placeRegion: {
    color: '#7B8179',
    fontSize: 12,
    marginTop: 4,
  },
  generationTag: {
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  generationTagText: {
    color: MAIN_GREEN,
    fontSize: 11,
    fontWeight: '800',
  },
});
