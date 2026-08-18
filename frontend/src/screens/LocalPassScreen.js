import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '../contexts/AuthContext';
import { earningMethods, localPassSummary, usageHistory } from '../mocks/localPassMockData';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const ORANGE = '#F28C28';
const RED = '#D94848';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';

function EarningMethodItem({ method }) {
  const handlePress = () => {
    void Haptics.selectionAsync();
    Alert.alert(method.alertTitle, method.alertMessage);
  };

  return (
    <TouchableOpacity
      style={styles.methodItem}
      activeOpacity={0.7}
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
  const { logout, user } = useAuth();
  const navigation = useNavigation();
  const passCountAnimation = useSharedValue(0);
  const progressAnimation = useSharedValue(0);
  const refreshTimeoutRef = useRef(null);
  const [displayPassCount, setDisplayPassCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const passCount = user?.localPassBalance ?? localPassSummary.count;
  const regionName = user?.region?.fullName || '거주 지역 미설정';
  const profileName = user?.nickname || '로컬픽 사용자';
  const profileInitial = profileName.slice(0, 1);
  const verificationLabel = user?.isResidentVerified ? '거주자 인증 완료 ✓' : '거주자 인증 필요';
  const hasPass = passCount > 0;

  useAnimatedReaction(
    () => passCountAnimation.value,
    (value) => {
      runOnJS(setDisplayPassCount)(Math.round(value));
    },
  );

  useEffect(() => {
    passCountAnimation.value = withTiming(passCount, { duration: 600 });
    progressAnimation.value = withTiming(localPassSummary.ongoingProgress, { duration: 800 });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [passCount, passCountAnimation, progressAnimation]);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value}%`,
  }));

  const handleRefresh = () => {
    setRefreshing(true);

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const handleUsePass = () => {
    if (!hasPass) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('패스 사용', '지도에서 타지역 명소를 열람할 수 있어요!');
  };

  const handleShowRegion = () => {
    Alert.alert('내 지역', `현재 거주 지역: ${regionName}`);
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
            style={styles.locationButton}
            activeOpacity={0.7}
            onPress={handleShowRegion}
          >
            <Text style={styles.locationIcon}>📍</Text>
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
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>{verificationLabel}</Text>
                </View>
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
            disabled={!hasPass}
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
              <EarningMethodItem key={method.id} method={method} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>채택까지 현황</Text>
          <View style={styles.ongoingCard}>
            <Text style={styles.ongoingLabel}>ONGOING PICK</Text>
            <Text style={styles.ongoingTitle}>아는 사람만 가는 봉명동 골목 카페</Text>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>채택까지 좋아요 17개 남음</Text>
              <Text style={styles.progressPercent}>{localPassSummary.ongoingProgress}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
            </View>
            <TouchableOpacity
              style={styles.expectedRewardButton}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert('채택 보상', '명소가 채택되면 로컬패스 5개가 자동 지급돼요!')
              }
            >
              <Text style={styles.expectedRewardText}>채택 시 +5개 지급 예정</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>사용 내역</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Alert.alert('사용 내역', '전체 내역 화면은 준비 중이에요!')}
          >
            <Text style={styles.sectionLink}>전체보기 &gt;</Text>
          </TouchableOpacity>
        </View>

        {usageHistory.length === 0 ? (
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
            {usageHistory.map((item) => (
              <UsageHistoryItem key={item.id} item={item} />
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
    marginBottom: 18,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: '900',
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  locationIcon: {
    fontSize: 19,
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
    backgroundColor: '#4A8C6A',
    borderRadius: 999,
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
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
  methodItem: {
    alignItems: 'center',
    borderBottomColor: BORDER,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
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
  },
  ongoingLabel: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: '900',
  },
  ongoingTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 25,
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
  expectedRewardButton: {
    alignItems: 'center',
    backgroundColor: '#E7EFE9',
    borderRadius: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  expectedRewardText: {
    color: MAIN_GREEN,
    fontSize: 14,
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
});
