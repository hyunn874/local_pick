import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const MAIN_GREEN = '#2D5C44';
const ORANGE = '#D88A24';
const RED = '#D94848';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';

const initialNotifications = [
  {
    id: 1,
    type: 'adopt',
    title: '내 명소가 채택됐어요! 🎉',
    body: '봉명동 숨은 골목 카페가 채택됐어요. 로컬패스 5개가 지급됐어요.',
    time: '방금 전',
    isRead: false,
  },
  {
    id: 2,
    type: 'verify',
    title: '거주자 인증 기간이에요',
    body: '이번 달 거주자 인증을 완료해주세요. 배지가 비활성화될 수 있어요.',
    time: '1시간 전',
    isRead: false,
  },
  {
    id: 3,
    type: 'hot',
    title: '내 동네가 이번 주 핫로컬에 선정됐어요!',
    body: '대전 유성구가 이번 주 핫로컬 TOP3에 선정됐어요.',
    time: '어제',
    isRead: true,
  },
];

const notificationIcons = {
  adopt: {
    color: MAIN_GREEN,
    name: 'trophy-outline',
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
  const [notifications, setNotifications] = useState(initialNotifications);

  const handlePressNotification = (notificationId) => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
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
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyListContent,
        ]}
        renderItem={({ item }) => (
          <NotificationCard
            item={item}
            onPress={() => handlePressNotification(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>아직 알림이 없어요</Text>
          </View>
        }
      />
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
