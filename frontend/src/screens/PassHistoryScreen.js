import { useCallback, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import apiClient from '../api/apiClient';
import { usageHistory } from '../mocks/localPassMockData';

const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const MAIN_GREEN = '#2D5C44';
const RED = '#D94848';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';

function normalizeHistoryItem(item) {
  return {
    id: item.id ?? item.historyId ?? `${item.placeId || item.placeName}-${item.usedAt || Date.now()}`,
    place: item.place || `${item.region || ''}${item.region ? '·' : ''}${item.placeName || '사용처'}`,
    date: item.date || item.usedAt || item.createdAt || '방금 전',
    amount: item.amount ? `${item.amount > 0 ? '+' : ''}${item.amount}개` : '-1개',
  };
}

function normalizeHistoryResponse(payload) {
  const source = Array.isArray(payload) ? payload : payload?.history;

  return Array.isArray(source) ? source.map(normalizeHistoryItem) : [];
}

export default function PassHistoryScreen({ navigation }) {
  const [historyItems, setHistoryItems] = useState(usageHistory);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadHistory = useCallback(async () => {
    let isMounted = true;

    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await apiClient.get('/api/local-pass/history');
      const nextHistory = normalizeHistoryResponse(data);

      if (isMounted) {
        setHistoryItems(nextHistory);
      }
    } catch (error) {
      console.warn('Local pass history API fallback to mock data.', error?.message);
      setLoadError('데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let cleanup;

    async function runLoadHistory() {
      cleanup = await loadHistory();
    }

    void runLoadHistory();

    return () => {
      cleanup?.();
    };
  }, [loadHistory]);

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
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={MAIN_GREEN} />
        </View>
      ) : (
        <>
          {!!loadError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity style={styles.retryButton} activeOpacity={0.7} onPress={loadHistory}>
                <Text style={styles.retryButtonText}>재시도</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={historyItems}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[
              styles.listContent,
              historyItems.length === 0 && styles.emptyListContent,
            ]}
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
        </>
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
  listContent: {
    flexGrow: 1,
    gap: 12,
    padding: 20,
    paddingBottom: 40,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: '#FFF5F0',
    borderColor: '#F2C7B5',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 14,
  },
  errorText: {
    color: '#A84A24',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  retryButtonText: {
    color: CARD,
    fontSize: 13,
    fontWeight: '900',
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
