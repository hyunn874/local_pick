import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { fetchDevVisitorHotLocals, fetchWeeklyHotLocals } from '../api/predictionApi';
import { useAuth } from '../contexts/AuthContext';
import { hotLocalData } from '../mocks/hotLocalMockData';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const ORANGE = '#F28C28';
const RED = '#D94848';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';

const metricColors = {
  green: MAIN_GREEN,
  orange: ORANGE,
  red: RED,
};
const shouldUseDevVisitorApi = process.env.EXPO_PUBLIC_APP_ENV !== 'production';

function getDaysUntilNextMonday() {
  const today = new Date();
  const day = today.getDay();

  return (8 - day) % 7 || 7;
}

function MetricRow({ metric, animatedProgressStyle }) {
  const metricColor = metricColors[metric.colorKey] || MAIN_GREEN;

  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{metric.label}</Text>
        <Text style={[styles.metricValue, { color: metricColor }]}>{metric.value}</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { backgroundColor: metricColor }, animatedProgressStyle]}
        />
      </View>
    </View>
  );
}

function getPercentFromText(value, fallback) {
  const match = String(value).match(/\d+/);

  return match ? Number(match[0]) : fallback;
}

function SmallRankCard({ item, isExpanded, onChatPress, onPress }) {
  const expandAnimation = useSharedValue(0);
  const visitorProgress = item.visitorProgress ?? getPercentFromText(item.visitor, 0);
  const diversityProgress = item.diversityProgress ?? getPercentFromText(item.diversity, 0);

  useEffect(() => {
    expandAnimation.value = withTiming(isExpanded ? 1 : 0, { duration: 300 });
  }, [expandAnimation, isExpanded]);

  const detailAnimatedStyle = useAnimatedStyle(() => ({
    maxHeight: expandAnimation.value * 170,
    opacity: expandAnimation.value,
  }));

  return (
    <View style={styles.smallRankCard}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <Text style={styles.smallRankBadge}>{item.rank}</Text>
        <Text style={styles.smallRegion}>{item.region}</Text>
        <Text style={styles.smallMetric}>{item.visitor}</Text>
        <Text style={styles.smallMetric}>{item.diversity}</Text>
      </TouchableOpacity>
      <Animated.View style={[styles.smallRankDetail, detailAnimatedStyle]}>
        <View style={styles.smallDetailMetric}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>방문자 증가율</Text>
            <Text style={[styles.metricValue, { color: MAIN_GREEN }]}>{visitorProgress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: MAIN_GREEN, width: `${visitorProgress}%` },
              ]}
            />
          </View>
        </View>
        <View style={styles.smallDetailMetric}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>다양성 지수</Text>
            <Text style={[styles.metricValue, { color: RED }]}>{diversityProgress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: RED, width: `${diversityProgress}%` },
              ]}
            />
          </View>
        </View>
        <TouchableOpacity style={styles.smallChatButton} activeOpacity={0.7} onPress={onChatPress}>
          <Text style={styles.smallChatButtonText}>이 지역 소통방 보러가기 →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function HotLocalScreen() {
  const navigation = useNavigation();
  const { exitGuestMode, isGuest } = useAuth();
  const fadeAnimation = useSharedValue(0);
  const progressAnimation = useSharedValue(0);
  const [weeklyHotLocalData, setWeeklyHotLocalData] = useState(hotLocalData);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRank, setExpandedRank] = useState(null);
  const nextUpdateDays = getDaysUntilNextMonday();
  const rankOne = weeklyHotLocalData.rankOne;
  const visitorProgress = rankOne?.metrics.find((metric) => metric.id === 'visitor')?.progress ?? 0;
  const spendingProgress = rankOne?.metrics.find((metric) => metric.id === 'spending')?.progress ?? 0;
  const diversityProgress =
    rankOne?.metrics.find((metric) => metric.id === 'diversity')?.progress ?? 0;

  useEffect(() => {
    let isMounted = true;

    async function loadWeeklyHotLocals() {
      setIsLoading(true);
      fadeAnimation.value = 0;
      progressAnimation.value = 0;

      try {
        const data = shouldUseDevVisitorApi
          ? await fetchDevVisitorHotLocals()
          : await fetchWeeklyHotLocals();

        if (isMounted && data?.rankOne) {
          setWeeklyHotLocalData(data);
          return;
        }

        throw new Error('Hot local API returned empty data.');
      } catch (devApiError) {
        try {
          if (!shouldUseDevVisitorApi) {
            throw devApiError;
          }

          const data = await fetchWeeklyHotLocals();

          if (isMounted && data?.rankOne) {
            setWeeklyHotLocalData(data);
            return;
          }

          throw new Error('Weekly hot local API returned empty hot local data.');
        } catch {
          if (!isMounted) {
            return;
          }

          console.warn('Hot local API fallback to mock data.', devApiError?.message);
          setWeeklyHotLocalData(hotLocalData);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          fadeAnimation.value = withTiming(1, { duration: 400 });
          progressAnimation.value = withTiming(1, { duration: 800 });
        }
      }
    }

    void loadWeeklyHotLocals();

    return () => {
      isMounted = false;
    };
  }, [fadeAnimation, progressAnimation]);

  const handleSmallRankPress = (item) => {
    setExpandedRank((currentRank) => (currentRank === item.rank ? null : item.rank));
  };

  const handleChatPress = () => {
    if (isGuest) {
      Alert.alert(
        '로그인이 필요해요',
        '소통방은 로그인 후 이용할 수 있어요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '로그인하기',
            style: 'default',
            onPress: exitGuestMode,
          },
        ],
      );
      return;
    }

    navigation.navigate('ChatRoom');
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnimation.value,
  }));

  const visitorProgressStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value * visitorProgress}%`,
  }));

  const spendingProgressStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value * spendingProgress}%`,
  }));

  const diversityProgressStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value * diversityProgress}%`,
  }));

  const progressStylesByMetricId = {
    visitor: visitorProgressStyle,
    spending: spendingProgressStyle,
    diversity: diversityProgressStyle,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>이번 주 핫 로컬 TOP 3</Text>
            <Text style={styles.subtitle}>
              한국관광공사 API 3개 조합 · 매주 월요일 업데이트 · 다음 업데이트까지{' '}
              {nextUpdateDays}일 남음
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.rankOnePlaceholder} />
        ) : !rankOne ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={MAIN_GREEN} />
            <Text style={styles.emptyText}>이번 주 발굴 지역을 분석 중이에요</Text>
          </View>
        ) : (
          <Animated.View style={[styles.rankOneCard, cardAnimatedStyle]}>
            <View style={styles.badgeRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>RANK 1</Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{rankOne.status}</Text>
              </View>
            </View>

            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>{rankOne.region}</Text>
            </View>

            <Text style={styles.regionName}>{rankOne.region}</Text>

            {rankOne.metrics.map((metric) => (
              <MetricRow
                key={metric.id}
                metric={metric}
                animatedProgressStyle={progressStylesByMetricId[metric.id]}
              />
            ))}

            <TouchableOpacity
              style={styles.chatButton}
              activeOpacity={0.7}
              onPress={handleChatPress}
            >
              <Text style={styles.chatButtonText}>이 지역 소통방 바로가기 →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.smallRanksRow}>
          {weeklyHotLocalData.ranking.map((item) => (
            <SmallRankCard
              key={item.rank}
              item={item}
              isExpanded={expandedRank === item.rank}
              onChatPress={handleChatPress}
              onPress={() => handleSmallRankPress(item)}
            />
          ))}
        </View>
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
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backIcon: {
    color: MAIN_GREEN,
    fontSize: 22,
    fontWeight: '900',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  subtitle: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  rankOneCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 18,
  },
  rankOnePlaceholder: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    minHeight: 456,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 8,
    gap: 12,
    minHeight: 220,
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  rankBadge: {
    backgroundColor: '#17251D',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rankBadgeText: {
    color: CARD,
    fontSize: 12,
    fontWeight: '900',
  },
  activeBadge: {
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeBadgeText: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    height: 164,
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: CARD,
    fontSize: 24,
    fontWeight: '900',
  },
  regionName: {
    color: TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 18,
  },
  metricRow: {
    marginTop: 16,
  },
  metricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },
  metricValue: {
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
    borderRadius: 999,
    height: '100%',
  },
  chatButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    marginTop: 22,
    paddingVertical: 14,
  },
  chatButtonText: {
    color: CARD,
    fontSize: 15,
    fontWeight: '900',
  },
  smallRanksRow: {
    gap: 12,
    marginTop: 16,
  },
  smallRankCard: {
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  smallRankDetail: {
    overflow: 'hidden',
  },
  smallDetailMetric: {
    marginTop: 14,
  },
  smallChatButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    marginTop: 14,
    paddingVertical: 12,
  },
  smallChatButtonText: {
    color: CARD,
    fontSize: 13,
    fontWeight: '900',
  },
  smallRankBadge: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: '900',
  },
  smallRegion: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
    marginTop: 10,
  },
  smallMetric: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
});
