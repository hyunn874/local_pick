import { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import apiClient from '../api/apiClient';
import { fetchWeeklyTopPredictions } from '../api/predictionApi';
import { useAuth } from '../contexts/AuthContext';

const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const MAIN_GREEN = '#2D5C44';
const ORANGE = '#D88A24';
const RED = '#D94848';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';

const notificationIcons = {
  adopt: {
    color: MAIN_GREEN,
    name: 'trophy-outline',
  },
  pass: {
    color: MAIN_GREEN,
    name: 'ticket-outline',
  },
  verify: {
    color: ORANGE,
    name: 'shield-checkmark-outline',
  },
  hot: {
    color: RED,
    name: 'flame-outline',
  },
};

function getUserRegionName(user) {
  if (typeof user?.region === 'string') {
    return user.region;
  }

  return user?.region?.fullName || user?.district || '내 지역';
}

function hasResidentAccess(user) {
  return Boolean(user?.isResidentVerified || user?.residentAccess || Number(user?.verifyCount ?? 0) > 0);
}

function formatRelativeTime(value) {
  if (!value) {
    return '최근';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '최근';
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function normalizeAdoptedPlace(place) {
  const likes = Number(place.likeCount ?? place.likes ?? place.adoptionCount ?? 0);
  const comments = Number(place.commentCount ?? place.comments ?? 0);
  const shares = Number(place.shareCount ?? place.shares ?? 0);

  return {
    id: place.postId ?? place.id,
    name: place.placeName || place.title || '채택 명소',
    regionName: place.regionName || '전국',
    score: likes + comments + shares,
    adoptedAt: place.adoptedAt,
  };
}

function normalizeHistoryItem(item) {
  const amount = Number(item.amount ?? 0);
  return {
    id: item.id ?? `${item.reason}-${item.referenceId || item.createdAt}`,
    amount,
    reason: item.reason,
    reasonLabel: item.reasonLabel || '로컬패스',
    createdAt: item.createdAt,
  };
}

function navigateFromNotification(navigation, target) {
  if (!target) {
    return;
  }

  if (['ResidentVerification', 'PassHistory', 'AllRecommend', 'AdoptedPlaces'].includes(target)) {
    navigation.navigate(target);
    return;
  }

  navigation.navigate('AuthGate', { screen: target });
}

function NotificationCard({ item, onPress }) {
  const icon = notificationIcons[item.type] || notificationIcons.hot;

  return (
    <TouchableOpacity
      style={[styles.notificationCard, item.isRead && styles.readNotificationCard]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.unreadDotSlot}>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
      <View style={[styles.iconBadge, item.isRead && styles.readIconBadge]}>
        <Ionicons
          name={icon.name}
          size={22}
          color={item.isRead ? TEXT_SECONDARY : icon.color}
        />
      </View>
      <View style={styles.notificationBody}>
        <View style={styles.notificationTitleRow}>
          <Text
            style={[styles.notificationTitle, item.isRead && styles.readNotificationText]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
        <Text
          style={[styles.notificationCopy, item.isRead && styles.readNotificationText]}
          numberOfLines={3}
        >
          {item.body}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationScreen({ navigation }) {
  const { accessToken, isGuest, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const userRegionName = useMemo(() => getUserRegionName(user), [user]);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      setIsLoading(true);

      try {
        const [weeklyRegions, adoptedPlaces, historyItems] = await Promise.all([
          fetchWeeklyTopPredictions().catch(() => []),
          apiClient.get('/api/places/adopted', { skipAuth: true }).catch(() => []),
          accessToken && !isGuest
            ? apiClient.get('/api/local-pass/history').catch(() => [])
            : Promise.resolve([]),
        ]);

        if (!isMounted) {
          return;
        }

        const nextNotifications = [];
        const normalizedPlaces = Array.isArray(adoptedPlaces)
          ? adoptedPlaces.map(normalizeAdoptedPlace)
          : [];
        const topPlace = normalizedPlaces
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

        if (topPlace) {
          nextNotifications.push({
            id: `adopt-${topPlace.id}`,
            type: 'adopt',
            title: '새 채택 명소가 업데이트됐어요',
            body: `${topPlace.regionName}의 ${topPlace.name}이 주민 반응을 모아 채택 명소로 등록됐어요.`,
            time: formatRelativeTime(topPlace.adoptedAt),
            isRead: false,
            target: 'AllRecommend',
          });
        }

        const normalizedHistory = Array.isArray(historyItems)
          ? historyItems.map(normalizeHistoryItem)
          : [];
        const latestPassHistory = normalizedHistory[0];

        if (latestPassHistory) {
          const used = latestPassHistory.amount < 0;
          nextNotifications.push({
            id: `pass-${latestPassHistory.id}`,
            type: 'pass',
            title: used ? '로컬패스를 사용했어요' : '로컬패스가 지급됐어요',
            body: used
              ? `${Math.abs(latestPassHistory.amount)}개를 사용해 타지역 채택 명소를 열람했어요.`
              : `${latestPassHistory.reasonLabel} 보상으로 ${latestPassHistory.amount}개가 지급됐어요.`,
            time: formatRelativeTime(latestPassHistory.createdAt),
            isRead: false,
            target: 'PassHistory',
          });
        }

        const topWeeklyRegion = Array.isArray(weeklyRegions) ? weeklyRegions[0] : null;
        if (topWeeklyRegion) {
          nextNotifications.push({
            id: `hot-${topWeeklyRegion.regionCode || topWeeklyRegion.regionName}`,
            type: 'hot',
            title: '이번 주 발굴 지역 TOP3가 공개됐어요',
            body: `${topWeeklyRegion.regionName}이 이번 주 발굴 지역 ${topWeeklyRegion.rank || 1}위로 선정됐어요.`,
            time: '오늘',
            isRead: true,
            target: 'HotLocalScreen',
          });
        }

        if (!isGuest && user && !hasResidentAccess(user)) {
          nextNotifications.unshift({
            id: 'verify-required',
            type: 'verify',
            title: '거주자 인증을 완료해주세요',
            body: `${userRegionName} 소통방 참여와 내 지역 무료 열람을 위해 거주자 인증이 필요해요.`,
            time: '오늘',
            isRead: false,
            target: 'ResidentVerification',
          });
        } else if (!isGuest && user?.verifyCount === 1 && user?.badgeStatus !== 'active') {
          nextNotifications.unshift({
            id: 'verify-second',
            type: 'verify',
            title: '2차 거주자 인증이 필요해요',
            body: '배지 활성화를 위해 같은 지역에서 2차 인증을 완료해주세요.',
            time: '오늘',
            isRead: false,
            target: 'ResidentVerification',
          });
        }

        setNotifications(nextNotifications);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [accessToken, isGuest, user, userRegionName]);

  const handlePressNotification = (notification) => {
    setReadIds((currentReadIds) => new Set([...currentReadIds, notification.id]));

    if (notification.target) {
      navigateFromNotification(navigation, notification.target);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={MAIN_GREEN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        <View style={styles.headerSpacer} />
      </View>
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={MAIN_GREEN} />
        </View>
      ) : (
        <FlatList
          data={notifications.map((notification) => ({
            ...notification,
            isRead: notification.isRead || readIds.has(notification.id),
          }))}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyListContent,
          ]}
          renderItem={({ item }) => (
            <NotificationCard
              item={item}
              onPress={() => handlePressNotification(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>아직 알림이 없어요</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BACKGROUND,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    color: MAIN_GREEN,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    gap: 12,
    padding: 20,
    paddingBottom: 40,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  notificationCard: {
    alignItems: 'flex-start',
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  readNotificationCard: {
    backgroundColor: '#F1F1EF',
    opacity: 0.82,
  },
  unreadDotSlot: {
    alignItems: 'center',
    paddingTop: 9,
    width: 8,
  },
  unreadDot: {
    backgroundColor: MAIN_GREEN,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: '#F8F6F1',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  readIconBadge: {
    backgroundColor: '#E2E2DF',
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  notificationTitle: {
    color: TEXT_PRIMARY,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  notificationTime: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  notificationCopy: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  readNotificationText: {
    color: '#8A918A',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '900',
  },
});
