import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
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

import apiClient from '../api/apiClient';
import { fetchWeeklyTopPredictions } from '../api/predictionApi';
import { useAuth } from '../contexts/AuthContext';
import { getRegionLogoSource } from '../data/regionLogoMap';
import { useRegions } from '../hooks/useRegions';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const ORANGE = '#F28C28';
const PLACEHOLDER_GRAY = '#E0E0E0';
const FEATURE_CARD_HEIGHT = 224;
const CANDIDATE_CARD_WIDTH = Dimensions.get('window').width * 0.75;

function getResidenceName(user) {
  if (typeof user?.region === 'string') {
    return user.region;
  }

  return user?.region?.fullName || user?.district || '내 동네';
}

function getAdoptedPlaceRegionName(user) {
  if (typeof user?.region === 'string') {
    return user.region;
  }

  return user?.region?.fullName || user?.district || '서울 은평구';
}

function getUserRegionCode(user) {
  return user?.regionCode || user?.region?.regionCode || user?.region?.code || '';
}

function hasResidentAccess(user) {
  return Boolean(user?.isResidentVerified || user?.residentAccess || Number(user?.verifyCount ?? 0) > 0);
}

function normalizeAdoptedPlace(place) {
  return {
    id: place.postId || place.id,
    imageUrl: place.imageUrl || place.imageUrls?.[0],
    name: place.placeName || place.title || '이름 없는 채택 명소',
    region: place.regionName || '',
    generation: '채택됨',
  };
}

const SIDO_NAMES = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
];

function getSidoName(regionName = '') {
  return SIDO_NAMES.find((sidoName) => regionName.startsWith(sidoName)) || regionName.split(' ')[0] || '';
}

export default function MainScreen() {
  const { exitGuestMode, isGuest, isLoggedIn, user } = useAuth();
  const navigation = useNavigation();
  const cardAnimation = useSharedValue(0);
  const refreshTimeoutRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recentAdoptedPlaces, setRecentAdoptedPlaces] = useState([]);
  const [weeklyPredictionRegions, setWeeklyPredictionRegions] = useState([]);
  const [hasNotification, setHasNotification] = useState(true);
  const { isLoading: isRegionsLoading, refetch: refetchRegions } = useRegions();
  const userRegionName = getResidenceName(user);
  const userRegionCode = getUserRegionCode(user);
  const canViewAdoptedPlaces = hasResidentAccess(user) && Boolean(userRegionCode);
  const shouldShowResidentVerificationBanner =
    isLoggedIn
    && !isGuest
    && !user?.isResidentVerified
    && Number(user?.verifyCount ?? 0) <= 0;
  const verifyCount = Number(user?.verifyCount ?? 0);
  const shouldShowSecondVerificationBanner =
    isLoggedIn
    && !isGuest
    && verifyCount === 1
    && user?.badgeStatus !== 'active';
  const residenceAdoptedPlaces = recentAdoptedPlaces;
  const featuredPredictionRegion = weeklyPredictionRegions[0] || null;
  const regionCandidateItems = useMemo(() => {
    if (!weeklyPredictionRegions.length) {
      return [];
    }

    return weeklyPredictionRegions
      .slice(1, 3)
      .map((region, index) => ({
        id: region.regionCode || String(region.id || index),
        logoSource: getRegionLogoSource(getSidoName(region.regionName)),
        name: region.regionName,
        rank: `RANK ${region.rank || index + 2}`,
        score: region.score,
      }));
  }, [weeklyPredictionRegions]);
  const liveStatusItems = useMemo(() => [
    { label: '채택 명소', value: String(recentAdoptedPlaces.length) },
    { label: '활성 지역', value: isRegionsLoading ? '...' : '0' },
    { label: '거주자', value: hasResidentAccess(user) ? '1' : '0' },
  ], [isRegionsLoading, recentAdoptedPlaces.length, user]);

  const loadRecentAdoptedPlaces = useCallback(async () => {
    if (!canViewAdoptedPlaces) {
      setRecentAdoptedPlaces([]);
      return;
    }

    try {
      const data = await apiClient.get('/api/places/adopted', {
        params: { regionCode: userRegionCode },
      });
      const nextPlaces = Array.isArray(data) ? data.map(normalizeAdoptedPlace).slice(0, 3) : [];
      setRecentAdoptedPlaces(nextPlaces);
    } catch {
      setRecentAdoptedPlaces([]);
    }
  }, [canViewAdoptedPlaces, userRegionCode]);

  const loadWeeklyPredictions = useCallback(async () => {
    try {
      const nextRegions = await fetchWeeklyTopPredictions();
      setWeeklyPredictionRegions(nextRegions.slice(0, 3));
    } catch {
      setWeeklyPredictionRegions([]);
    }
  }, []);

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

  useEffect(() => {
    void loadRecentAdoptedPlaces();
  }, [loadRecentAdoptedPlaces]);

  useEffect(() => {
    void loadWeeklyPredictions();
  }, [loadWeeklyPredictions]);

  const handleNavigateHotLocal = () => {
    navigation.navigate('HotLocalScreen');
  };

  const handleShowAllPlaces = () => {
    navigation.navigate('AdoptedPlaces');
  };

  const handleShowLocalPickStatus = () => {
    navigation.navigate('LocalPickStatus');
  };

  const handleShowNotifications = () => {
    setHasNotification(false);
    navigation.navigate('Notification');
  };

  const handleGoToChatRoom = () => {
    navigation.navigate('ChatRoom');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    void refetchRegions();
    void loadWeeklyPredictions();
    void loadRecentAdoptedPlaces();

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshing(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  };

  const handleLoginPress = () => {
    exitGuestMode();
  };

  const handleResidentVerificationPress = () => {
    navigation.navigate('ResidentVerification');
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
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoIcon}
              contentFit="contain"
            />
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

        {isGuest && (
          <View style={styles.guestBanner}>
            <Text style={styles.guestBannerText} numberOfLines={1}>
              로그인하면 소통방과 로컬패스를 이용할 수 있어요
            </Text>
            <TouchableOpacity
              style={styles.guestLoginButton}
              activeOpacity={0.7}
              onPress={handleLoginPress}
            >
              <Text style={styles.guestLoginButtonText}>로그인</Text>
            </TouchableOpacity>
          </View>
        )}

        {shouldShowResidentVerificationBanner && (
          <View style={styles.guestBanner}>
            <Text style={styles.guestBannerText} numberOfLines={1}>
              거주자 인증을 완료하면 소통방에 글을 올릴 수 있어요
            </Text>
            <TouchableOpacity
              style={styles.guestLoginButton}
              activeOpacity={0.7}
              onPress={handleResidentVerificationPress}
            >
              <Text style={styles.guestLoginButtonText}>인증하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {shouldShowSecondVerificationBanner && (
          <View style={[styles.guestBanner, styles.secondVerificationBanner]}>
            <Text style={styles.guestBannerText} numberOfLines={1}>
              1차 인증 완료. 배지 활성화를 위해 2차 인증을 진행해주세요
            </Text>
            <TouchableOpacity
              style={styles.guestLoginButton}
              activeOpacity={0.7}
              onPress={handleResidentVerificationPress}
            >
              <Text style={styles.guestLoginButtonText}>2차 인증하기</Text>
            </TouchableOpacity>
          </View>
        )}

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
              <Text style={styles.featureRegion}>
                {featuredPredictionRegion?.regionName || '발굴 지역 분석 중'}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {featuredPredictionRegion ? `RANK ${featuredPredictionRegion.rank}` : '예측 준비 중'}
                </Text>
              </View>
              <View style={styles.tagRow}>
                <View style={styles.featureTag}>
                  <Text style={styles.featureTagText}>
                    {featuredPredictionRegion
                      ? `소외도 ${Math.round(featuredPredictionRegion.score || 0)}점`
                      : '수요강도 분석 중'}
                  </Text>
                </View>
                <View style={styles.featureTag}>
                  <Text style={styles.featureTagText}>
                    {featuredPredictionRegion ? '관광 균등화 우선 지역' : '다양성 지표 분석 중'}
                  </Text>
                </View>
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

        {!user?.isResidentVerified && (
        <View style={styles.sectionBlock}>
          <Text style={styles.blockTitle}>다음 발굴 후보 지역</Text>
          {regionCandidateItems.length === 0 ? (
            <View style={styles.emptyPlaces}>
              <Text style={styles.emptyPlacesText}>예측 후보 지역을 준비 중이에요</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.candidateList}
            >
              {regionCandidateItems.map((region) => (
                <View key={region.id} style={styles.candidateCard}>
                  <View style={styles.candidateIcon}>
                    <Image
                      source={region.logoSource}
                      style={styles.candidateLogo}
                      contentFit="contain"
                    />
                  </View>
                  <View>
                    <Text style={styles.candidateName}>{region.name}</Text>
                    <Text style={styles.candidateRank}>
                      {region.rank} · {Math.round(region.score || 0)}점
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
        )}

        <TouchableOpacity
          style={styles.statusCard}
          activeOpacity={0.78}
          onPress={handleShowLocalPickStatus}
        >
          <View style={styles.statusHeaderRow}>
            <Text style={styles.blockTitle}>로컬픽 현황</Text>
            <Text style={styles.sectionLink}>자세히 보기 &gt;</Text>
          </View>
          <View style={styles.statusRow}>
            {liveStatusItems.map((item) => (
              <View key={item.label} style={styles.statusItem}>
                <Text style={styles.statusValue}>{item.value}</Text>
                <Text style={styles.statusLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.blockTitle}>최근 채택된 명소</Text>
            <Text style={styles.sectionDescription}>{userRegionName}의 채택 명소</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={handleShowAllPlaces}>
            <Text style={styles.sectionLink}>전체보기 &gt;</Text>
          </TouchableOpacity>
        </View>

        {!canViewAdoptedPlaces ? (
          <View style={styles.emptyPlaces}>
            <Text style={styles.emptyPlacesText}>거주자 인증 후 확인할 수 있어요</Text>
            <TouchableOpacity
              style={styles.emptyPlacesButton}
              activeOpacity={0.7}
              onPress={handleResidentVerificationPress}
            >
              <Text style={styles.emptyPlacesButtonText}>거주자 인증하기 →</Text>
            </TouchableOpacity>
          </View>
        ) : residenceAdoptedPlaces.length === 0 ? (
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
            {residenceAdoptedPlaces.map((place) => (
              <View key={place.id} style={styles.placeItem}>
                {place.imageUrl ? (
                  <Image
                    source={{ uri: place.imageUrl }}
                    style={styles.placeImage}
                    contentFit="cover"
                    transition={300}
                  />
                ) : (
                  <View style={styles.placeImagePlaceholder}>
                    <Ionicons name="image-outline" size={18} color="#7B8179" />
                  </View>
                )}
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
    borderRadius: 8,
    height: 32,
    width: 32,
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
  guestBanner: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    height: 44,
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  secondVerificationBanner: {
    backgroundColor: ORANGE,
  },
  guestBannerText: {
    color: CARD,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  guestLoginButton: {
    alignItems: 'center',
    borderColor: CARD,
    borderRadius: 8,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  guestLoginButtonText: {
    color: CARD,
    fontSize: 13,
    fontWeight: '900',
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
  sectionDescription: {
    color: '#7A9B8A',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
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
  candidateLogo: {
    height: 34,
    width: 34,
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
  statusHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  placeImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#E8F0EB',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
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
