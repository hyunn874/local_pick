import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import apiClient from '../api/apiClient';
import LocalPickModal from '../components/LocalPickModal';
import { useAuth } from '../contexts/AuthContext';
import { useRegions } from '../hooks/useRegions';
import { earningMethods, localPassSummary } from '../mocks/localPassMockData';
import { getMyPostProgress } from '../state/myPostProgress';
import { getBalance, syncBalanceFromServer, useBalance } from '../state/localPassStore';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const RED = '#D94848';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const CATEGORY_KEYWORDS = [
  { name: '맛집', words: ['맛집', '식당', '분식', '국밥', '빵', '시장', '순두부'] },
  { name: '카페', words: ['카페', '커피', '디저트'] },
  { name: '산책로', words: ['산책', '길', '공원', '둘레길', '노을'] },
  { name: '전망대', words: ['전망', '야경', '팔각정'] },
  { name: '문화공간', words: ['전시', '문화', '골목', '서점', '공방'] },
  { name: '체험', words: ['체험', '공방', '클래스'] },
  { name: '자연', words: ['강', '천', '숲', '산', '호수'] },
];

function sortKo(a, b) {
  return String(a).localeCompare(String(b), 'ko-KR');
}

function inferCategory(place) {
  const text = `${place.title || ''} ${place.content || ''} ${place.placeName || ''}`;
  const matched = CATEGORY_KEYWORDS.find((category) =>
    category.words.some((word) => text.includes(word)),
  );

  return matched?.name || '기타';
}

function normalizeAdoptedPost(post) {
  const likes = Number(post.likeCount ?? post.likes ?? 0);
  const comments = Number(post.commentCount ?? post.comments ?? 0);
  const shares = Number(post.shareCount ?? post.shares ?? 0);

  return {
    id: post.id ?? post.postId,
    postId: post.postId ?? post.id,
    title: post.title || post.placeName || '채택 명소',
    placeName: post.placeName || post.title || '채택 명소',
    regionName: post.regionName || '지역 정보 없음',
    regionCode: post.regionCode || '',
    category: post.category || inferCategory(post),
    address: post.address || post.location || '',
    content: post.content || '',
    latitude: post.latitude,
    longitude: post.longitude,
    likes,
    comments,
    shares,
    adoptedAt: post.adoptedAt || post.createdAt,
    imageUrl: post.imageUrl || post.imageUrls?.[0] || null,
    reactionSummary: `좋아요 ${likes}개, 댓글 ${comments}개, 공유 ${shares}회 반응으로 채택된 장소예요.`,
  };
}

function formatDateTime(value) {
  if (!value) {
    return '방금 전';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getHistoryIcon(reason) {
  if (reason === 'SIGNUP_BONUS') return '🎉';
  if (reason === 'ACTIVITY_THRESHOLD') return '⭐';
  if (reason === 'PLACE_VIEWED' || reason === 'REWARD_EXCHANGED') return '📍';
  if (reason === 'POST_ADOPTED') return '🏆';
  return '📋';
}

function normalizePassBalance(payload) {
  return Number(
    payload?.balance ?? payload?.balanceAfter ?? payload?.localPassBalance ?? payload ?? 0,
  );
}

function normalizeHistoryItem(item) {
  const amount = Number(item.amount ?? 0);

  return {
    id: item.id ?? item.historyId ?? `${item.referenceId || item.placeId || item.placeName}-${item.createdAt || Date.now()}`,
    reason: item.reason,
    icon: getHistoryIcon(item.reason),
    place: item.place || item.placeName || item.reasonLabel || '로컬패스 내역',
    date: formatDateTime(item.date || item.usedAt || item.createdAt),
    amount: `${amount > 0 ? '+' : ''}${amount}개`,
  };
}

function normalizeHistoryResponse(payload) {
  const source = Array.isArray(payload) ? payload : payload?.history;

  return Array.isArray(source) ? source.map(normalizeHistoryItem) : [];
}

function EarningMethodItem({ method, isCompleted, isExpanded, onToggle }) {
  const handlePress = () => {
    if (isCompleted) {
      return;
    }

    void Haptics.selectionAsync();
    onToggle(method.id);
  };

  return (
    <View style={styles.methodItemContainer}>
      <TouchableOpacity
        style={[styles.methodItem, isCompleted && styles.completedMethodItem]}
        activeOpacity={0.7}
        disabled={isCompleted}
        onPress={handlePress}
      >
        <View style={styles.methodIcon}>
          <Text style={styles.methodIconText}>{method.icon}</Text>
        </View>
        <View style={styles.methodTextGroup}>
          <Text style={styles.methodTitle}>{method.title}</Text>
          <Text style={styles.methodDescription}>{method.description}</Text>
        </View>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardBadgeText}>{method.reward}</Text>
        </View>
      </TouchableOpacity>
      {isExpanded && method.detail ? (
        <Text style={styles.methodDetailText}>{method.detail}</Text>
      ) : null}
    </View>
  );
}

function UsageHistoryItem({ item }) {
  return (
    <View style={styles.historyItem}>
      <Text style={styles.historyIcon}>{item.icon}</Text>
      <View style={styles.historyTextGroup}>
        <Text style={styles.historyPlace}>{item.place}</Text>
        <Text style={styles.historyDate}>{item.date}</Text>
      </View>
      <Text style={styles.historyAmount}>{item.amount}</Text>
    </View>
  );
}

export default function LocalPassScreen() {
  const { isGuest } = useAuth();

  if (isGuest) {
    return <GuestLocalPassScreen />;
  }

  return <AuthenticatedLocalPassScreen />;
}

function GuestLocalPassScreen() {
  const { exitGuestMode } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.guestEmptyState}>
        <Text style={styles.guestLockIcon}>🔒</Text>
        <Text style={styles.guestEmptyTitle}>로그인이 필요한 서비스예요</Text>
        <TouchableOpacity
          style={styles.guestLoginButton}
          activeOpacity={0.7}
          onPress={exitGuestMode}
        >
          <Text style={styles.guestLoginButtonText}>로그인하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function AuthenticatedLocalPassScreen() {
  const { accessToken, logout, user } = useAuth();
  const navigation = useNavigation();
  const { regions } = useRegions();
  const passCountAnimation = useSharedValue(0);
  const progressAnimation = useSharedValue(0);
  const refreshTimeoutRef = useRef(null);
  const [localPassBalance, setLocalPassBalance] = useBalance(
    user?.localPassBalance ?? getBalance(),
  );
  const [displayPassCount, setDisplayPassCount] = useState(0);
  const [ongoingPick, setOngoingPick] = useState(null);
  const [isPlaceModalVisible, setIsPlaceModalVisible] = useState(false);
  const [passModalStep, setPassModalStep] = useState('region');
  const [selectedPassRegionCode, setSelectedPassRegionCode] = useState(user?.region?.regionCode || user?.region?.code || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [passPlaces, setPassPlaces] = useState([]);
  const [revealedPlace, setRevealedPlace] = useState(null);
  const [isLoadingPassPlaces, setIsLoadingPassPlaces] = useState(false);
  const [usageHistoryItems, setUsageHistoryItems] = useState([]);
  const [viewedPlaces, setViewedPlaces] = useState([]);
  const [allAdoptedPlaces, setAllAdoptedPlaces] = useState([]);
  const [passConfirmModal, setPassConfirmModal] = useState({
    visible: false,
    place: null,
  });
  const [feedbackModal, setFeedbackModal] = useState({
    visible: false,
    tone: 'info',
    title: '',
    message: '',
  });
  const [expandedMethodId, setExpandedMethodId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingPassData, setIsLoadingPassData] = useState(false);
  const regionName = user?.region?.fullName || '거주 지역 미설정';
  const profileName = user?.nickname || '로컬픽 사용자';
  const profileInitial = profileName.slice(0, 1);
  const isResidentVerified = Boolean(user?.isResidentVerified || user?.badgeStatus === 'active');
  const verificationLabel = isResidentVerified ? '거주자 인증 완료 ✓' : '거주자 미인증';
  const hasPass = localPassBalance > 0;
  const regionOptions = useMemo(
    () => [...regions].sort((a, b) => sortKo(a.fullName, b.fullName)),
    [regions],
  );
  const adoptedCountByRegion = useMemo(() => {
    const counts = new Map();
    allAdoptedPlaces.forEach((place) => {
      const code = place.regionCode;
      if (code) {
        counts.set(code, (counts.get(code) || 0) + 1);
      }
    });
    return counts;
  }, [allAdoptedPlaces]);
  const viewedPlacesByRegion = useMemo(() => {
    const groups = new Map();
    viewedPlaces.forEach((place) => {
      const key = place.regionName || '지역 정보 없음';
      groups.set(key, [...(groups.get(key) || []), place]);
    });
    return Array.from(groups.entries());
  }, [viewedPlaces]);
  const completedMethodIds = useMemo(() => {
    const ids = new Set(['signup']);
    usageHistoryItems.forEach((item) => {
      if (item.reason === 'ACTIVITY_THRESHOLD') {
        ids.add('activity');
      }
      if (item.reason === 'POST_ADOPTED') {
        ids.add('picked');
      }
    });
    return ids;
  }, [usageHistoryItems]);
  const selectedPassRegion = useMemo(
    () => regionOptions.find((region) =>
      (region.regionCode || region.code) === selectedPassRegionCode,
    ) || regionOptions[0] || null,
    [regionOptions, selectedPassRegionCode],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map();
    passPlaces.forEach((place) => {
      counts.set(place.category, (counts.get(place.category) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => sortKo(a.name, b.name));
  }, [passPlaces]);
  const filteredPassPlaces = useMemo(
    () => passPlaces.filter((place) => place.category === selectedCategory),
    [passPlaces, selectedCategory],
  );

  useAnimatedReaction(
    () => passCountAnimation.value,
    (value) => {
      runOnJS(setDisplayPassCount)(Math.round(value));
    },
  );

  useEffect(() => {
    passCountAnimation.value = withTiming(localPassBalance, { duration: 600 });
    progressAnimation.value = withTiming(
      ongoingPick?.progress ?? localPassSummary.ongoingProgress,
      { duration: 800 },
    );

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [localPassBalance, ongoingPick?.progress, passCountAnimation, progressAnimation]);

  const loadLocalPassData = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) {
      setIsLoadingPassData(true);
    }

    try {
      const [balanceData, historyData, viewedData, adoptedData] = await Promise.all([
        apiClient.get('/api/local-pass/balance'),
        apiClient.get('/api/local-pass/history'),
        apiClient.get('/api/localpass/viewed-places'),
        apiClient.get('/api/places/adopted', { skipAuth: true }),
      ]);
      const nextBalance = normalizePassBalance(balanceData);
      const nextHistory = normalizeHistoryResponse(historyData);
      const nextViewedPlaces = Array.isArray(viewedData)
        ? viewedData.map((item) => normalizeAdoptedPost(item.place || item))
        : [];
      const nextAdoptedPlaces = Array.isArray(adoptedData)
        ? adoptedData.map(normalizeAdoptedPost)
        : [];

      setLocalPassBalance(nextBalance);
      setUsageHistoryItems(nextHistory);
      setViewedPlaces(nextViewedPlaces);
      setAllAdoptedPlaces(nextAdoptedPlaces);
    } catch (error) {
      setUsageHistoryItems([]);
    } finally {
      setIsLoadingPassData(false);
      setRefreshing(false);
    }
  }, [accessToken, setLocalPassBalance]);

  useFocusEffect(
    useCallback(() => {
      if (accessToken) {
        void syncBalanceFromServer(accessToken);
      }

      setOngoingPick(getMyPostProgress());
      void loadLocalPassData({ showLoading: true });
    }, [
      accessToken,
      loadLocalPassData,
      user?.badgeStatus,
      user?.isResidentVerified,
    ]),
  );

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value}%`,
  }));

  const handleRefresh = () => {
    setRefreshing(true);
    void loadLocalPassData();
  };

  const handleUsePass = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPassModalStep('region');
    setRevealedPlace(null);
    setSelectedCategory('');
    setPassPlaces([]);
    setSelectedPassRegionCode(user?.region?.regionCode || user?.region?.code || regionOptions[0]?.regionCode || '');
    setIsPlaceModalVisible(true);
  };

  const loadPassPlaces = async () => {
    const regionCode = selectedPassRegion?.regionCode || selectedPassRegion?.code;

    if (!regionCode) {
      Alert.alert('지역 선택', '열람할 지역을 선택해주세요.');
      return;
    }

    setIsLoadingPassPlaces(true);

    try {
      const data = await apiClient.get('/api/places/adopted', {
        params: { regionCode },
        skipAuth: true,
      });
      const source = Array.isArray(data) ? data : data?.posts;
      const nextPlaces = Array.isArray(source)
        ? source.map(normalizeAdoptedPost)
        : [];

      setPassPlaces(nextPlaces);
      setSelectedCategory('');
      setPassModalStep('category');
    } catch {
      setPassPlaces([]);
      setSelectedCategory('');
      setPassModalStep('category');
    } finally {
      setIsLoadingPassPlaces(false);
    }
  };

  const handleSelectPassPlace = async (place) => {
    const userRegionCode = user?.region?.regionCode || user?.region?.code;
    const isOwnRegion = userRegionCode && place.regionCode === userRegionCode;

    if (isOwnRegion) {
      setRevealedPlace(place);
      setPassModalStep('detail');
      return;
    }

    try {
      const viewedData = await apiClient.get('/api/localpass/viewed', {
        params: { placeId: Number(place.postId ?? place.id) },
      });
      if (viewedData?.viewed) {
        setRevealedPlace(place);
        setPassModalStep('detail');
        return;
      }
    } catch {
      // 차감 단계에서 한 번 더 확인한다.
    }

    if (localPassBalance <= 0) {
      setFeedbackModal({
        visible: true,
        tone: 'warning',
        title: '로컬패스가 부족합니다',
        message: '타지역 명소를 열람하려면 로컬패스가 1개 이상 필요해요.',
      });
      return;
    }

    setPassConfirmModal({ visible: true, place });
  };

  const confirmUsePassForPlace = async () => {
    const place = passConfirmModal.place;
    if (!place) {
      return;
    }

    try {
      const data = await apiClient.post('/api/localpass/use', {
        placeId: Number(place.postId ?? place.id),
      });

      if (Number.isFinite(Number(data?.balance))) {
        setLocalPassBalance(Number(data.balance));
      }
      setRevealedPlace(place);
      setPassModalStep('detail');
      setPassConfirmModal({ visible: false, place: null });
      void loadLocalPassData();
    } catch (error) {
      setPassConfirmModal({ visible: false, place: null });
      setFeedbackModal({
        visible: true,
        tone: error?.code === 'L001' ? 'warning' : 'error',
        title: error?.code === 'L001' ? '로컬패스가 부족합니다' : '열람 실패',
        message: error?.message || '로컬패스 사용에 실패했어요.',
      });
    }
  };

  const handleOpenSettings = () => {
    navigation.navigate('Settings');
  };

  const handleShowPassHistory = () => {
    navigation.navigate('PassHistory');
  };

  const handleToggleEarningMethod = (methodId) => {
    setExpandedMethodId((currentId) => (currentId === methodId ? null : methodId));
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '현재 계정에서 로그아웃할까요?', [
      {
        text: '취소',
        style: 'cancel',
      },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

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
          <Text style={styles.title}>내 로컬패스</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="설정"
            onPress={handleOpenSettings}
          >
            <Ionicons name="settings-outline" size={24} color={MAIN_GREEN} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileLeft}>
              <View style={styles.profileIcon}>
                <Text style={styles.profileInitial}>{profileInitial}</Text>
              </View>
              <View style={styles.profileTextGroup}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {profileName}
                </Text>
                <Text style={styles.profileRegion} numberOfLines={1}>
                  {regionName}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.verifiedBadge,
                    isResidentVerified ? styles.activeVerifiedBadge : styles.inactiveVerifiedBadge,
                  ]}
                  activeOpacity={isResidentVerified ? 1 : 0.7}
                  disabled={isResidentVerified}
                  onPress={() => navigation.navigate('ResidentVerification')}
                >
                  <Text style={styles.verifiedBadgeText}>{verificationLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.passCountGroup}>
              <Text style={styles.passCount}>{displayPassCount}개</Text>
              <Text style={styles.passCountLabel}>보유 로컬패스</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.usePassButton, !hasPass && styles.disabledUsePassButton]}
            activeOpacity={0.7}
            onPress={handleUsePass}
          >
            <Text style={styles.usePassButtonText}>로컬패스 사용하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>로컬패스 획득 방법</Text>
          <View style={styles.methodList}>
            {earningMethods.map((method) => (
              <EarningMethodItem
                key={method.id}
                method={method}
                isCompleted={completedMethodIds.has(method.id)}
                isExpanded={expandedMethodId === method.id}
                onToggle={handleToggleEarningMethod}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>채택까지 현황</Text>
          <View style={styles.ongoingCard}>
            <Text style={styles.ongoingLabel}>진행 중인 명소</Text>
          <Text style={styles.ongoingTitle}>
              {ongoingPick?.title || '진행 중인 명소가 없어요'}
            </Text>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                채택 조건: 좋아요 30 + 댓글 10 + 공유 5
              </Text>
              <Text style={styles.progressPercent}>
                {ongoingPick?.progress ?? localPassSummary.ongoingProgress}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
            </View>
            <View style={styles.expectedRewardLabel}>
              <Text style={styles.expectedRewardText}>채택되면 5개 지급</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>사용 내역</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleShowPassHistory}
          >
            <Text style={styles.sectionLink}>전체보기 &gt;</Text>
          </TouchableOpacity>
        </View>

        {isLoadingPassData ? (
          <View style={styles.emptyHistory}>
            <ActivityIndicator color={MAIN_GREEN} />
          </View>
        ) : usageHistoryItems.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryIcon}>📋</Text>
            <Text style={styles.emptyHistoryTitle}>아직 사용한 내역이 없어요</Text>
            <Text style={styles.emptyHistoryDescription}>지도에서 타지역 명소를 둘러보세요!</Text>
            <TouchableOpacity
              style={styles.mapButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Map')}
            >
              <Text style={styles.mapButtonText}>지도 보러가기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.historyList}>
            {usageHistoryItems.map((item) => (
              <UsageHistoryItem key={item.id} item={item} />
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>열람한 명소</Text>
        </View>
        {viewedPlacesByRegion.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryIcon}>📍</Text>
            <Text style={styles.emptyHistoryTitle}>아직 열람한 명소가 없어요</Text>
          </View>
        ) : (
          <View style={styles.viewedGroupList}>
            {viewedPlacesByRegion.map(([region, places]) => (
              <View key={region} style={styles.viewedGroup}>
                <Text style={styles.viewedGroupTitle}>{region} ({places.length})</Text>
                {places.map((place) => (
                  <TouchableOpacity
                    key={`${region}-${place.id}`}
                    style={styles.viewedPlaceItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setRevealedPlace(place);
                      setPassModalStep('detail');
                      setIsPlaceModalVisible(true);
                    }}
                  >
                    <Text style={styles.viewedPlaceName}>{place.placeName}</Text>
                    <Text style={styles.viewedPlaceMeta}>{place.category} · 좋아요 {place.likes}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <Modal
        animationType="fade"
        transparent
        visible={isPlaceModalVisible}
        onRequestClose={() => setIsPlaceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.placeModal}>
            {passModalStep === 'region' && (
              <>
                <Text style={styles.placeModalTitle}>어떤 지역을 열람할까요?</Text>
                <View style={styles.regionPickerPanel}>
                  <ScrollView style={styles.regionPickerList} showsVerticalScrollIndicator={false}>
                    {regionOptions.map((region) => {
                      const regionCode = region.regionCode || region.code;
                      const isSelected = regionCode === (selectedPassRegion?.regionCode || selectedPassRegion?.code);
                      const isMyRegion = regionCode === (user?.region?.regionCode || user?.region?.code);
                      const adoptedCount = adoptedCountByRegion.get(regionCode) || 0;

                      return (
                        <TouchableOpacity
                          key={regionCode}
                          style={[styles.regionPickerItem, isSelected && styles.selectedRegionPickerItem]}
                          activeOpacity={0.7}
                          onPress={() => setSelectedPassRegionCode(regionCode)}
                        >
                          <Text style={[styles.regionPickerText, isSelected && styles.selectedRegionPickerText]}>
                            {region.fullName} ({adoptedCount})
                            {isMyRegion ? ' · 내 지역 — 무료 열람' : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  activeOpacity={0.7}
                  onPress={loadPassPlaces}
                >
                  {isLoadingPassPlaces ? (
                    <ActivityIndicator color={CARD} />
                  ) : (
                    <Text style={styles.modalPrimaryButtonText}>카테고리 선택하기</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {passModalStep === 'category' && (
              <>
                <Text style={styles.placeModalTitle}>어떤 장소를 열람할까요?</Text>
                <Text style={styles.placeModalDescription}>
                  {selectedPassRegion?.fullName || '선택 지역'}의 채택 명소 카테고리예요.
                </Text>
                <View style={styles.placeList}>
                  {categoryCounts.length === 0 ? (
                    <View style={styles.emptyPassList}>
                      <Text style={styles.emptyPassListText}>아직 채택된 장소가 없어요</Text>
                    </View>
                  ) : (
                    categoryCounts.map((category) => (
                      <TouchableOpacity
                        key={category.name}
                        style={styles.placeCard}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedCategory(category.name);
                          setPassModalStep('place');
                        }}
                      >
                        <View style={styles.placeCardTextGroup}>
                          <Text style={styles.placeCardName}>{category.name}</Text>
                          <Text style={styles.placeCardRegion}>채택 장소 {category.count}곳</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={MAIN_GREEN} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </>
            )}

            {passModalStep === 'place' && (
              <>
                <Text style={styles.placeModalTitle}>{selectedCategory} 채택 명소</Text>
                <Text style={styles.placeModalDescription}>내 지역과 이미 열람한 명소는 차감 없이 열려요.</Text>
                <View style={styles.placeList}>
                  {filteredPassPlaces.map((place) => (
                    <TouchableOpacity
                      key={place.id}
                      style={styles.placeCard}
                      activeOpacity={0.7}
                      onPress={() => handleSelectPassPlace(place)}
                    >
                      <View style={styles.placeCardTextGroup}>
                        <Text style={styles.placeCardName}>{place.title}</Text>
                        <Text style={styles.placeCardRegion}>
                          {place.category} · 좋아요 {place.likes} · 댓글 {place.comments} · 공유 {place.shares}
                        </Text>
                      </View>
                      <View style={styles.placeCategoryTag}>
                        <Text style={styles.placeCategoryTagText}>
                          {place.regionCode === (user?.region?.regionCode || user?.region?.code) ? '무료' : '1개 사용'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {passModalStep === 'detail' && revealedPlace && (
              <>
                <Text style={styles.placeModalTitle}>{revealedPlace.placeName}</Text>
                <View style={styles.placeDetailBox}>
                  <Text style={styles.placeDetailLabel}>위치</Text>
                  <Text style={styles.placeDetailText}>{revealedPlace.address || revealedPlace.regionName}</Text>
                  <Text style={styles.placeDetailLabel}>주민 반응 요약</Text>
                  <Text style={styles.placeDetailText}>{revealedPlace.reactionSummary}</Text>
                  <Text style={styles.placeDetailLabel}>소개</Text>
                  <Text style={styles.placeDetailText}>
                    {revealedPlace.content || '소통방에서 주민들이 채택한 장소입니다.'}
                  </Text>
                  <Text style={styles.placeDetailSource}>출처: ⓒ한국관광공사</Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              activeOpacity={0.7}
              onPress={() => setIsPlaceModalVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <LocalPickModal
        visible={passConfirmModal.visible}
        tone="info"
        title="명소 열람"
        message="이 명소를 열람하시겠습니까? 로컬패스 1개가 차감됩니다."
        primaryText="예"
        secondaryText="아니오"
        onPrimaryPress={confirmUsePassForPlace}
        onSecondaryPress={() => setPassConfirmModal({ visible: false, place: null })}
        onRequestClose={() => setPassConfirmModal({ visible: false, place: null })}
      />
      <LocalPickModal
        visible={feedbackModal.visible}
        tone={feedbackModal.tone}
        title={feedbackModal.title}
        message={feedbackModal.message}
        onRequestClose={() => setFeedbackModal((current) => ({ ...current, visible: false }))}
      />
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
    marginBottom: 18,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: '900',
  },
  guestEmptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  guestLockIcon: {
    fontSize: 44,
    marginBottom: 16,
  },
  guestEmptyTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 18,
  },
  guestLoginButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  guestLoginButtonText: {
    color: CARD,
    fontSize: 15,
    fontWeight: '900',
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  profileCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 18,
  },
  profileTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  profileIcon: {
    alignItems: 'center',
    backgroundColor: '#E7EFE9',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  profileInitial: {
    color: MAIN_GREEN,
    fontSize: 20,
    fontWeight: '900',
  },
  profileName: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '900',
  },
  profileTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  profileRegion: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  activeVerifiedBadge: {
    backgroundColor: '#4A8C6A',
  },
  inactiveVerifiedBadge: {
    backgroundColor: '#AEB4AE',
  },
  verifiedBadgeText: {
    color: CARD,
    fontSize: 11,
    fontWeight: '800',
  },
  passCountGroup: {
    alignItems: 'flex-end',
  },
  passCount: {
    color: MAIN_GREEN,
    fontSize: 34,
    fontWeight: '900',
  },
  passCountLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  usePassButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    marginTop: 18,
    paddingVertical: 13,
  },
  disabledUsePassButton: {
    backgroundColor: '#B9B9B9',
  },
  usePassButtonText: {
    color: CARD,
    fontSize: 14,
    fontWeight: '900',
  },
  logoutButton: {
    alignItems: 'center',
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 12,
  },
  logoutButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '900',
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 19,
    fontWeight: '900',
  },
  methodList: {
    backgroundColor: CARD,
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 14,
  },
  methodItemContainer: {
    borderBottomColor: BORDER,
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  methodItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  completedMethodItem: {
    opacity: 0.5,
  },
  methodIcon: {
    alignItems: 'center',
    backgroundColor: '#F1E7D7',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  methodIconText: {
    fontSize: 20,
  },
  methodTextGroup: {
    flex: 1,
  },
  methodTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '900',
  },
  methodDescription: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 3,
  },
  methodDetailText: {
    color: '#7A9B8A',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginLeft: 54,
    marginTop: 10,
  },
  rewardBadge: {
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rewardBadgeText: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  ongoingCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    marginTop: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  ongoingLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '900',
  },
  ongoingTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 8,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  progressText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },
  progressPercent: {
    color: MAIN_GREEN,
    fontSize: 13,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: '#ECE8E0',
    borderRadius: 999,
    height: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: MAIN_GREEN,
    borderRadius: 999,
    height: '100%',
  },
  expectedRewardLabel: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#EEF5F1',
    borderRadius: 20,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  expectedRewardText: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  sectionLink: {
    color: MAIN_GREEN,
    fontSize: 13,
    fontWeight: '800',
  },
  historyList: {
    backgroundColor: CARD,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  historyItem: {
    alignItems: 'center',
    borderBottomColor: BORDER,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  historyIcon: {
    fontSize: 20,
    width: 26,
  },
  historyTextGroup: {
    flex: 1,
  },
  historyPlace: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '900',
  },
  historyDate: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  historyAmount: {
    color: RED,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyHistory: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 24,
  },
  emptyHistoryIcon: {
    fontSize: 32,
  },
  viewedGroupList: {
    gap: 12,
  },
  viewedGroup: {
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 14,
  },
  viewedGroupTitle: {
    color: MAIN_GREEN,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  viewedPlaceItem: {
    borderTopColor: BORDER,
    borderTopWidth: 1,
    paddingVertical: 11,
  },
  viewedPlaceName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '900',
  },
  viewedPlaceMeta: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyHistoryTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyHistoryDescription: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  mapButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  mapButtonText: {
    color: CARD,
    fontSize: 14,
    fontWeight: '900',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  placeModal: {
    backgroundColor: CARD,
    borderRadius: 8,
    maxHeight: '82%',
    padding: 18,
    width: '100%',
  },
  placeModalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '900',
  },
  placeModalDescription: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 7,
  },
  regionPickerPanel: {
    backgroundColor: BACKGROUND,
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    maxHeight: 220,
    overflow: 'hidden',
  },
  regionPickerList: {
    maxHeight: 220,
  },
  regionPickerItem: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedRegionPickerItem: {
    backgroundColor: CARD,
    borderColor: MAIN_GREEN,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  regionPickerText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectedRegionPickerText: {
    color: TEXT_PRIMARY,
    fontWeight: '900',
  },
  modalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    marginTop: 16,
  },
  modalPrimaryButtonText: {
    color: CARD,
    fontSize: 14,
    fontWeight: '900',
  },
  placeList: {
    gap: 10,
    marginTop: 16,
  },
  emptyPassList: {
    alignItems: 'center',
    backgroundColor: BACKGROUND,
    borderRadius: 8,
    padding: 18,
  },
  emptyPassListText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '800',
  },
  placeCard: {
    alignItems: 'center',
    backgroundColor: BACKGROUND,
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 14,
  },
  placeCardTextGroup: {
    flex: 1,
  },
  placeCardName: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '900',
  },
  placeCardRegion: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  placeCategoryTag: {
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  placeCategoryTagText: {
    color: MAIN_GREEN,
    fontSize: 11,
    fontWeight: '900',
  },
  placeDetailBox: {
    backgroundColor: BACKGROUND,
    borderRadius: 8,
    gap: 7,
    marginTop: 16,
    padding: 14,
  },
  placeDetailLabel: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
  },
  placeDetailText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  placeDetailSource: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
  modalCancelButton: {
    alignItems: 'center',
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    paddingVertical: 13,
  },
  modalCancelButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '900',
  },
});
