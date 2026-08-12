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

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const ORANGE = '#F28C28';
const RED = '#D94848';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const LOCAL_PASS_COUNT = 3;
const ONGOING_PROGRESS = 83;

const earningMethods = [
  {
    id: 'signup',
    icon: '🎁',
    title: '가입 즉시 지급',
    description: '회원가입 완료',
    reward: '+5개',
    alertTitle: '가입 보상',
    alertMessage: '회원가입 완료 시 즉시 5개 지급돼요!',
  },
  {
    id: 'activity',
    icon: '❤️',
    title: '활동 기준 충족',
    description: '좋아요 10 + 댓글 3 + 공유 2',
    reward: '+2개',
    alertTitle: '활동 보상',
    alertMessage: '좋아요 10 + 댓글 3 + 공유 2 달성 시 2개 지급!',
  },
  {
    id: 'picked',
    icon: '📍',
    title: '로컬픽 장소 채택',
    description: '좋아요 30 + 댓글 10 + 공유 5',
    reward: '+5개',
    alertTitle: '채택 보상',
    alertMessage: '좋아요 30 + 댓글 10 + 공유 5 달성 시 5개 지급!',
  },
];

const usageHistory = [
  {
    id: 'cafe',
    place: '대전 유성구·봉명동 골목 카페',
    date: '04.18',
    amount: '-1개',
  },
  {
    id: 'gapcheon',
    place: '대전 유성구·갑천 산책로',
    date: '04.15',
    amount: '-1개',
  },
];

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
  const navigation = useNavigation();
  const passCountAnimation = useSharedValue(0);
  const progressAnimation = useSharedValue(0);
  const refreshTimeoutRef = useRef(null);
  const [displayPassCount, setDisplayPassCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const hasPass = LOCAL_PASS_COUNT > 0;

  useAnimatedReaction(
    () => passCountAnimation.value,
    (value) => {
      runOnJS(setDisplayPassCount)(Math.round(value));
    },
  );

  useEffect(() => {
    passCountAnimation.value = withTiming(LOCAL_PASS_COUNT, { duration: 600 });
    progressAnimation.value = withTiming(ONGOING_PROGRESS, { duration: 800 });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [passCountAnimation, progressAnimation]);

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
            onPress={() => Alert.alert('내 위치', '현재 거주 지역: 대전 유성구')}
          >
            <Text style={styles.locationIcon}>📍</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileLeft}>
              <View style={styles.profileIcon}>
                <Text style={styles.profileInitial}>유</Text>
              </View>
              <View>
                <Text style={styles.profileName}>유성구주민1</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>거주자 인증 완료 ✓</Text>
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
              <Text style={styles.progressPercent}>{ONGOING_PROGRESS}%</Text>
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
