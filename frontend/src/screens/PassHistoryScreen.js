import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usageHistory } from '../mocks/localPassMockData';

const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const MAIN_GREEN = '#2D5C44';
const RED = '#D94848';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';

export default function PassHistoryScreen({ navigation }) {
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
        <Text style={styles.headerTitle}>사용 내역</Text>
        <View style={styles.headerSpacer} />
      </View>
      <FlatList
        data={usageHistory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyPlace}>{item.place}</Text>
              <Text style={styles.historyDate}>{item.date}</Text>
            </View>
            <Text style={styles.historyAmount}>{item.amount}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>아직 사용 내역이 없어요</Text>
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
    flexGrow: 1,
    gap: 12,
    padding: 20,
    paddingBottom: 40,
  },
  historyCard: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  historyInfo: {
    flex: 1,
  },
  historyPlace: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '900',
  },
  historyDate: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  historyAmount: {
    color: RED,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
