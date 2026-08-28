import { useCallback, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import apiClient from '../api/apiClient';
import { recommendedPlaces } from '../mocks/mapMockData';

const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const MAIN_GREEN = '#2D5C44';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';

function normalizeAdoptedPlace(item, regionName) {
  const postId = item.postId ?? item.id;
  const placeName = item.placeName || item.name || item.title || '채택 명소';

  return {
    id: String(postId ?? `${placeName}-${item.adoptedAt || Date.now()}`),
    postId,
    icon: item.icon || '📍',
    title: item.title || placeName,
    placeName,
    category: item.category || item.categoryTag || '채택 명소',
    generation: item.generation || item.ageTag || item.generationTag || '전체',
    passCount: item.passCount || `좋아요 ${item.adoptionCount ?? item.likes ?? 0}`,
    adoptedAt: item.adoptedAt,
    imageUrl: item.imageUrl || item.imageUrls?.[0] || null,
    latitude: item.latitude,
    longitude: item.longitude,
    region: item.region || item.regionName || regionName,
    likes: Number(item.likes ?? item.likeCount ?? item.adoptionCount ?? 0),
  };
}

function createPostFromPlace(place, regionName) {
  return {
    id: place.postId ?? place.id,
    author: place.region || regionName || '지역 거주자',
    isResident: true,
    time: place.adoptedAt || '최근',
    image: place.imageUrl,
    imageUrl: place.imageUrl,
    ageTag: place.generation,
    generationTag: place.generation,
    categoryTag: place.category,
    title: place.title || place.placeName,
    content: `${place.placeName || place.title}의 채택된 명소 정보예요.`,
    progress: 100,
    likes: place.likes ?? 0,
    comments: 0,
    location: place.region || regionName,
  };
}

export default function AllRecommendScreen({ navigation, route }) {
  const selectedRegion = route.params?.region || null;
  const regionCode = selectedRegion?.regionCode || selectedRegion?.code;
  const regionName = selectedRegion?.fullName || selectedRegion?.name || '선택한 지역';
  const [places, setPlaces] = useState(recommendedPlaces);
  const [isLoading, setIsLoading] = useState(Boolean(regionCode));
  const [loadError, setLoadError] = useState(null);

  const loadAdoptedPlaces = useCallback(async () => {
    let isMounted = true;

    if (!regionCode) {
      setPlaces([]);
      setIsLoading(false);
      setLoadError(null);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await apiClient.get('/api/places/adopted', {
        params: { regionCode },
        skipAuth: true,
      });
      const nextPlaces = Array.isArray(data)
        ? data.map((item) => normalizeAdoptedPlace(item, regionName))
        : [];

      if (isMounted) {
        setPlaces(nextPlaces);
      }
    } catch (error) {
      console.warn('All recommend adopted places API fallback to mock data.', error?.message);
      setLoadError('데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
      setPlaces(recommendedPlaces);
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [regionCode, regionName]);

  useEffect(() => {
    let cleanup;

    async function runLoadAdoptedPlaces() {
      cleanup = await loadAdoptedPlaces();
    }

    void runLoadAdoptedPlaces();

    return () => {
      cleanup?.();
    };
  }, [loadAdoptedPlaces]);

  const handlePressPlace = (place) => {
    navigation.navigate('PostDetail', {
      post: createPostFromPlace(place, regionName),
    });
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
        <Text style={styles.headerTitle}>로컬 추천 전체보기</Text>
        <View style={styles.headerSpacer} />
      </View>
      {!regionCode ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗺</Text>
          <Text style={styles.emptyText}>지역을 선택해주세요</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={MAIN_GREEN} />
        </View>
      ) : (
        <>
          {!!loadError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.7}
                onPress={loadAdoptedPlaces}
              >
                <Text style={styles.retryButtonText}>재시도</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={places}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[
              styles.listContent,
              places.length === 0 && styles.emptyListContent,
            ]}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recommendCard}
                activeOpacity={0.75}
                onPress={() => handlePressPlace(item)}
              >
                <Text style={styles.placeIcon}>{item.icon}</Text>
                <View style={styles.placeInfo}>
                  <Text style={styles.placeTitle}>{item.title}</Text>
                  <Text style={styles.placeMeta}>
                    {item.category} · {item.generation} · {item.passCount}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🗺</Text>
                <Text style={styles.emptyText}>이 지역에 채택된 명소가 없어요</Text>
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
  recommendCard: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  placeIcon: {
    fontSize: 28,
    width: 38,
  },
  placeInfo: {
    flex: 1,
  },
  placeTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '900',
  },
  placeMeta: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
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
