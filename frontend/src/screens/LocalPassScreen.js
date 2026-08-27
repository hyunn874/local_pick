import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { earningMethods, localPassSummary, usageHistory } from '../mocks/localPassMockData';
import { getMyPostProgress } from '../state/myPostProgress';
import { getBalance, useBalance } from '../state/localPassStore';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const RED = '#D94848';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const PASS_PLACES = [
  { id: 1, name: '봉명동 숨은 골목 카페', region: '대전 유성구', category: '카페' },
  { id: 2, name: '갑천 노을 산책로', region: '대전 유성구', category: '산책' },
  { id: 3, name: '유성 과학 산책길', region: '대전 유성구', category: '산책' },
];

function normalizePassBalance(payload) {
  return Number(payload?.balance ?? payload?.localPassBalance ?? payload ?? 0);
}

function normalizeHistoryItem(item) {
  return {
    id: item.id ?? item.historyId ?? `${item.placeId || item.placeName}-${item.usedAt || Date.now()}`,
    place: item.place || `${item.region || ''}${item.region ? '·' : ''}${item.placeName || '사용처'}`,
    date: item.date || item.usedAt || '방금 전',
    amount: item.amount ? `${item.amount > 0 ? '+' : ''}${item.amount}개` : '-1개',
  };
}

function normalizeHistoryResponse(payload) {
  const source = Array.isArray(payload) ? payload : payload?.history;

  return Array.isArray(source) ? source.map(normalizeHistoryItem) : [];
}

function EarningMethodItem({ method, isExpanded, onToggle }) {
  const isCompleted = method.id === 'signup';
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
  const passCountAnimation = useSharedValue(0);
  const progressAnimation = useSharedValue(0);
  const refreshTimeoutRef = useRef(null);
  const [localPassBalance, setLocalPassBalance] = useBalance(
    user?.localPassBalance ?? getBalance(),
  );
  const [displayPassCount, setDisplayPassCount] = useState(0);
  const [ongoingPick, setOngoingPick] = useState(null);
  const [isPlaceModalVisible, setIsPlaceModalVisible] = useState(false);
  const [usageHistoryItems, setUsageHistoryItems] = useState(usageHistory);
  const [expandedMethodId, setExpandedMethodId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingPassData, setIsLoadingPassData] = useState(false);
  const regionName = user?.region?.fullName || '거주 지역 미설정';
  const profileName = user?.nickname || '로컬픽 사용자';
  const profileInitial = profileName.slice(0, 1);
  const isResidentVerified = Boolean(user?.isResidentVerified);
  const verificationLabel = isResidentVerified ? '거주자 인증 완료 ✓' : '거주자 미인증';
  const hasPass = localPassBalance > 0;

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
      console.log('accessToken:', accessToken ? '있음' : '없음');
      const [balanceData, historyData] = await Promise.all([
        apiClient.get('/api/local-pass/balance'),
        apiClient.get('/api/local-pass/history'),
      ]);
      const nextBalance = normalizePassBalance(balanceData);
      const nextHistory = normalizeHistoryResponse(historyData);

      setLocalPassBalance(nextBalance);

      if (nextHistory.length > 0) {
        setUsageHistoryItems(nextHistory);
      }
    } catch (error) {
      console.warn('Local pass API fallback to mock data.', error?.message);
      setUsageHistoryItems((currentItems) => (currentItems.length > 0 ? currentItems : usageHistory));
    } finally {
      setIsLoadingPassData(false);
      setRefreshing(false);
    }
  }, [accessToken, setLocalPassBalance]);

  useFocusEffect(
    useCallback(() => {
      setOngoingPick(getMyPostProgress());
      void loadLocalPassData({ showLoading: usageHistoryItems.length === 0 });
    }, [loadLocalPassData, usageHistoryItems.length]),
  );

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value}%`,
  }));

  const handleRefresh = () => {
    setRefreshing(true);
    void loadLocalPassData();
  };

  const handleUsePass = () => {
    if (localPassBalance <= 0) {
      Alert.alert(
        '로컬패스 부족',
        '로컬패스가 없어요. 소통방에서 활동하면 획득할 수 있어요!'
      );
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPlaceModalVisible(true);
  };

  const handleSelectPassPlace = (place) => {
    Alert.alert(
      '장소 열람',
      `${place.name}을 열람하기 위해 로컬패스 1개를 사용해요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '사용하기',
          onPress: async () => {
            try {
              console.log('accessToken:', accessToken ? '있음' : '없음');
              const data = await apiClient.post('/api/local-pass/use', {
                placeId: place.id,
                placeName: place.name,
              });
              const nextBalance = normalizePassBalance(data);
              const nextHistoryItem = data?.history ? normalizeHistoryItem(data.history) : null;

              setLocalPassBalance(nextBalance);
              setIsPlaceModalVisible(false);

              if (nextHistoryItem) {
                setUsageHistoryItems((currentItems) => [nextHistoryItem, ...currentItems]);
              } else {
                await loadLocalPassData();
              }

              Alert.alert('열람 완료', '로컬패스 1개가 차감됐어요.');
            } catch (error) {
              console.warn('Use local pass API fallback to local state.', error?.message);
              setLocalPassBalance(getBalance() - 1);
              setIsPlaceModalVisible(false);
              setUsageHistoryItems((currentItems) => [
                {
                  id: `pass-${Date.now()}`,
                  place: `${place.region}·${place.name}`,
                  date: '방금 전',
                  amount: '-1개',
                },
                ...currentItems,
              ]);
              Alert.alert('열람 완료', '로컬패스 1개가 차감됐어요.');
            }
          },
        },
      ],
    );
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
              {ongoingPick?.title || '아는 사람만 가는 봉명동 골목 카페'}
            </Text>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                채택까지 좋아요{' '}
                {Math.max(
                  0,
                  (ongoingPick?.targetLikes ?? 30) - (ongoingPick?.likes ?? 13),
                )}
                개 남음
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
      </ScrollView>
      <Modal
        animationType="fade"
        transparent
        visible={isPlaceModalVisible}
        onRequestClose={() => setIsPlaceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.placeModal}>
            <Text style={styles.placeModalTitle}>어떤 장소를 열람할까요?</Text>
            <View style={styles.placeList}>
              {PASS_PLACES.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.placeCard}
                  activeOpacity={0.7}
                  onPress={() => handleSelectPassPlace(place)}
                >
                  <View style={styles.placeCardTextGroup}>
                    <Text style={styles.placeCardName}>{place.name}</Text>
                    <Text style={styles.placeCardRegion}>{place.region}</Text>
                  </View>
                  <View style={styles.placeCategoryTag}>
                    <Text style={styles.placeCategoryTagText}>{place.category}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
    padding: 18,
    width: '100%',
  },
  placeModalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '900',
  },
  placeList: {
    gap: 10,
    marginTop: 16,
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
