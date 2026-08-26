import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import KakaoMapView from '../components/KakaoMapView';
import RegionSelector from '../components/RegionSelector';
import { useAuth } from '../contexts/AuthContext';
import { useRegions } from '../hooks/useRegions';
import { generationFilters, recommendedPlaces } from '../mocks/mapMockData';
import { getBalance, setBalance, useBalance } from '../state/localPassStore';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const { height } = Dimensions.get('window');

const YUSEONG_CENTER = {
  latitude: 36.3504,
  longitude: 127.3845,
};

const mapMarkers = [
  {
    id: 1,
    latitude: 36.362,
    longitude: 127.356,
    title: '봉명동 숨은 골목 카페',
    category: '카페',
  },
  {
    id: 2,
    latitude: 36.345,
    longitude: 127.378,
    title: '갑천 노을 산책로',
    category: '산책',
  },
  {
    id: 3,
    latitude: 36.368,
    longitude: 127.389,
    title: '유성 과학 산책길',
    category: '산책',
  },
];

function GenerationFilter({ label, selectedFilter, onPress }) {
  const isSelected = selectedFilter === label;

  return (
    <TouchableOpacity
      style={[styles.filterButton, isSelected && styles.selectedFilterButton]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text
        style={[styles.filterText, isSelected && styles.selectedFilterText]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RecommendationCard({ place, onPress, onAlternativePress }) {
  return (
    <TouchableOpacity
      style={styles.recommendationCard}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.adoptedBadge}>
          <Text style={styles.adoptedBadgeText}>채택</Text>
        </View>
        <View style={styles.placeIcon}>
          <Text style={styles.placeIconText}>{place.icon}</Text>
        </View>
      </View>

      <Text style={styles.placeTitle}>{place.title}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{place.generation}</Text>
        <View style={styles.metaDot} />
        <Text style={styles.metaText}>{place.passCount}</Text>
      </View>

      <TouchableOpacity
        style={styles.alternativeButton}
        activeOpacity={0.7}
        onPress={onAlternativePress}
      >
        <Text style={styles.alternativeButtonText}>유사 대안 보기</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function createSimilarPlaces(place) {
  const baseName = place.title || place.name;

  return [
    {
      id: `${place.id}-alt-1`,
      title: `${baseName} 근처 산책 코스`,
      meta: '도보 8분 · 로컬패스 1개',
    },
    {
      id: `${place.id}-alt-2`,
      title: `${place.category} 인기 장소`,
      meta: `${place.generation} 추천 · 로컬패스 1개`,
    },
    {
      id: `${place.id}-alt-3`,
      title: '비슷한 분위기의 숨은 명소',
      meta: '주민 추천 · 채택 후보',
    },
  ];
}

function PlaceBottomSheet({
  animatedStyle,
  onClose,
  onShowAlternatives,
  onUsePass,
  place,
  showAlternatives,
}) {
  const similarPlaces = showAlternatives ? createSimilarPlaces(place) : [];

  return (
    <Animated.View style={[styles.bottomSheet, animatedStyle]}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{place.name || place.title}</Text>
        <TouchableOpacity
          style={styles.sheetCloseButton}
          activeOpacity={0.7}
          onPress={onClose}
        >
          <Text style={styles.sheetCloseText}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sheetTagRow}>
        <View style={styles.sheetTag}>
          <Text style={styles.sheetTagText}>{place.category}</Text>
        </View>
        <View style={styles.sheetTag}>
          <Text style={styles.sheetTagText}>{place.generation}</Text>
        </View>
      </View>
      {showAlternatives && (
        <View style={styles.similarList}>
          {similarPlaces.map((similarPlace) => (
            <View key={similarPlace.id} style={styles.similarItem}>
              <Text style={styles.similarTitle}>{similarPlace.title}</Text>
              <Text style={styles.similarMeta}>{similarPlace.meta}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.sheetActions}>
        <TouchableOpacity
          style={styles.sheetSecondaryButton}
          activeOpacity={0.7}
          onPress={onUsePass}
        >
          <Text style={styles.sheetSecondaryButtonText}>로컬패스 사용하기</Text>
        </TouchableOpacity>
        {!showAlternatives && (
          <TouchableOpacity
            style={styles.sheetGhostButton}
            activeOpacity={0.7}
            onPress={onShowAlternatives}
          >
            <Text style={styles.sheetGhostButtonText}>유사 대안 보기</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

export default function MapScreen() {
  const { exitGuestMode, isGuest, user } = useAuth();
  const navigation = useNavigation();
  const sheetAnimation = useSharedValue(0);
  const [selectedFilter, setSelectedFilter] = useState('전체');
  const [searchText, setSearchText] = useState('');
  const [selectedPin, setSelectedPin] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  useBalance();
  const { regions } = useRegions();

  const normalizedSearchText = searchText.trim().toLowerCase();

  const filteredRecommendations = useMemo(
    () =>
      recommendedPlaces.filter((place) => {
        const matchesFilter =
          selectedFilter === '전체' || place.generation === selectedFilter;
        const matchesSearch =
          !normalizedSearchText ||
          place.title.toLowerCase().includes(normalizedSearchText) ||
          place.category.toLowerCase().includes(normalizedSearchText);

        return matchesFilter && matchesSearch;
      }),
    [normalizedSearchText, selectedFilter]
  );

  const filteredMarkers = useMemo(
    () =>
      mapMarkers.filter((marker) => {
        const matchesSearch =
          !normalizedSearchText ||
          marker.title.toLowerCase().includes(normalizedSearchText) ||
          marker.category.toLowerCase().includes(normalizedSearchText);

        return matchesSearch;
      }),
    [normalizedSearchText],
  );

  const hasSearchResults =
    filteredMarkers.length > 0 || filteredRecommendations.length > 0;

  useEffect(() => {
    if (selectedRegion || regions.length === 0) {
      return;
    }

    const userRegionCode = user?.region?.code;
    const userRegion = regions.find((region) => region.regionCode === userRegionCode);

    if (userRegion) {
      setSelectedRegion(userRegion);
    }
  }, [regions, selectedRegion, user?.region?.code]);

  useEffect(() => {
    if (!selectedPin) {
      sheetAnimation.value = 0;
      return;
    }

    sheetAnimation.value = 0;
    sheetAnimation.value = withSpring(1, {
      damping: 18,
      stiffness: 180,
    });
  }, [selectedPin, sheetAnimation]);

  const handleClearSearch = () => {
    setSearchText('');
  };

  const handleSelectMarker = (marker) => {
    setShowAlternatives(false);
    setSelectedPin({
      ...marker,
      id: String(marker.id),
      generation: '로컬 추천',
      name: marker.title,
      passCount: '로컬패스 1개',
    });
  };

  const handleRecommendationPress = (place) => {
    setShowAlternatives(false);
    setSelectedPin({
      ...place,
      name: place.title,
    });
  };

  const handleAlternativePress = (place) => {
    setShowAlternatives(true);
    setSelectedPin({
      ...place,
      name: place.title,
    });
  };

  const handleShowAllRecommendations = () => {
    navigation.navigate('AllRecommend');
  };

  const handleUsePass = () => {
    if (isGuest) {
      Alert.alert(
        '로그인이 필요해요',
        '로컬패스는 로그인 후 이용할 수 있어요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '로그인하기', onPress: exitGuestMode },
        ],
      );
      return;
    }

    if (getBalance() <= 0) {
      Alert.alert(
        '로컬패스 부족',
        '로컬패스가 없어요. 소통방에서 활동하면 획득할 수 있어요!'
      );
      return;
    }

    const selectedMarker = selectedPin || {};
    const selectedPlaceName = selectedMarker.title || selectedMarker.name || '선택한 장소';

    Alert.alert(
      '로컬패스 사용',
      `${selectedPlaceName} 상세 정보를 열람하기 위해\n로컬패스 1개를 사용해요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '열람하기',
          onPress: () => {
            setBalance(getBalance() - 1);
            setSelectedPin(null);
            navigation.navigate('PostDetail', {
              post: {
                id: selectedMarker.id,
                author: selectedMarker.region || '지역 거주자',
                isResident: true,
                time: '최근',
                image: null,
                ageTag: selectedMarker.ageTag || '전체',
                categoryTag: selectedMarker.category || '명소',
                title: selectedPlaceName,
                content:
                  selectedMarker.description ||
                  '로컬 거주자가 추천한 명소예요. 직접 방문해서 확인해보세요!',
                progress: 83,
                likes: selectedMarker.likes || 24,
                comments: 2,
                location: selectedMarker.region || '대전 유성구',
              },
            });
          },
        },
      ],
    );
  };

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - sheetAnimation.value) * 180,
      },
    ],
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.screenContent}
      >
        <View style={styles.topContent}>
          <View style={styles.header}>
            <View style={styles.logoGroup}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoIconText}>L</Text>
              </View>
              <Text style={styles.logoText}>로컬픽</Text>
            </View>

            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="어디로 여행가세요?"
                placeholderTextColor="#9B9F98"
              />
              {!!searchText && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  activeOpacity={0.7}
                  onPress={handleClearSearch}
                >
                  <Text style={styles.clearSearchText}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            <RegionSelector
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
            />
          </View>

          <View style={styles.filterRow}>
            {generationFilters.map((filter) => (
              <GenerationFilter
                key={filter}
                label={filter}
                selectedFilter={selectedFilter}
                onPress={() => setSelectedFilter(filter)}
              />
            ))}
          </View>
        </View>

        <View style={styles.mapArea}>
          {filteredMarkers.length > 0 ? (
            <KakaoMapView
              latitude={YUSEONG_CENTER.latitude}
              longitude={YUSEONG_CENTER.longitude}
              markers={filteredMarkers}
              onMarkerPress={handleSelectMarker}
              style={styles.kakaoMap}
            />
          ) : (
            <View style={styles.noSearchResults}>
              <Text style={styles.noSearchResultsText}>검색 결과가 없어요</Text>
            </View>
          )}
        </View>

        <View style={styles.recommendationSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>이 구역의 로컬 추천</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={handleShowAllRecommendations}>
              <Text style={styles.sectionLink}>전체보기 &gt;</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendationList}
          >
            {hasSearchResults ? (
              filteredRecommendations.map((place) => (
                <RecommendationCard
                  key={place.id}
                  place={place}
                  onPress={() => handleRecommendationPress(place)}
                  onAlternativePress={() => handleAlternativePress(place)}
                />
              ))
            ) : (
              <View style={styles.emptyRecommendationCard}>
                <Text style={styles.emptyRecommendationText}>
                  검색 결과가 없어요
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {selectedPin && (
        <PlaceBottomSheet
          place={selectedPin}
          animatedStyle={sheetAnimatedStyle}
          showAlternatives={showAlternatives}
          onClose={() => setSelectedPin(null)}
          onShowAlternatives={() => setShowAlternatives(true)}
          onUsePass={handleUsePass}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screenContent: {
    paddingBottom: 120,
  },
  topContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  header: {
    gap: 14,
    marginBottom: 18,
  },
  logoGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  logoIcon: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  logoIconText: {
    color: CARD,
    fontSize: 18,
    fontWeight: '900',
  },
  logoText: {
    color: MAIN_GREEN,
    fontSize: 22,
    fontWeight: '900',
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },
  searchIcon: {
    color: MAIN_GREEN,
    fontSize: 20,
    fontWeight: '900',
  },
  searchInput: {
    color: TEXT_PRIMARY,
    flex: 1,
    fontSize: 15,
    paddingVertical: 13,
  },
  clearSearchButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  clearSearchText: {
    color: TEXT_SECONDARY,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  selectedFilterButton: {
    backgroundColor: MAIN_GREEN,
    borderColor: MAIN_GREEN,
  },
  filterText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },
  selectedFilterText: {
    color: CARD,
  },
  mapArea: {
    backgroundColor: '#D9D9D9',
    borderRadius: 8,
    height: height * 0.36,
    minHeight: 220,
    marginHorizontal: 20,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  kakaoMap: {
    flex: 1,
  },
  noSearchResults: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  noSearchResultsText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '900',
  },
  recommendationSection: {
    backgroundColor: BACKGROUND,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 19,
    fontWeight: '900',
  },
  sectionLink: {
    color: MAIN_GREEN,
    fontSize: 13,
    fontWeight: '800',
  },
  recommendationList: {
    gap: 12,
    paddingBottom: 4,
  },
  recommendationCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 16,
    width: 190,
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  adoptedBadge: {
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  adoptedBadgeText: {
    color: MAIN_GREEN,
    fontSize: 11,
    fontWeight: '900',
  },
  placeIcon: {
    alignItems: 'center',
    backgroundColor: '#F1E7D7',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  placeIconText: {
    fontSize: 20,
  },
  placeTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
    minHeight: 42,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  metaText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '800',
  },
  metaDot: {
    backgroundColor: '#B5B8B1',
    borderRadius: 2,
    height: 4,
    marginHorizontal: 7,
    width: 4,
  },
  alternativeButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    marginTop: 15,
    paddingVertical: 10,
  },
  alternativeButtonText: {
    color: CARD,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyRecommendationCard: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 8,
    justifyContent: 'center',
    padding: 18,
    width: 190,
  },
  emptyRecommendationText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '900',
  },
  bottomSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    bottom: 0,
    elevation: 18,
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    position: 'absolute',
    right: 0,
    shadowColor: '#101810',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#D8D8D8',
    borderRadius: 2,
    height: 4,
    marginBottom: 14,
    width: 42,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: TEXT_PRIMARY,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  sheetCloseButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sheetCloseText: {
    color: TEXT_SECONDARY,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 26,
  },
  sheetTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  sheetTag: {
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sheetTagText: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  sheetActions: {
    gap: 10,
    marginTop: 16,
  },
  similarList: {
    gap: 8,
    marginTop: 14,
  },
  similarItem: {
    backgroundColor: '#F8F6F1',
    borderRadius: 8,
    padding: 12,
  },
  similarTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '900',
  },
  similarMeta: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  sheetSecondaryButton: {
    alignItems: 'center',
    backgroundColor: '#E7EFE9',
    borderRadius: 8,
    paddingVertical: 13,
  },
  sheetSecondaryButtonText: {
    color: MAIN_GREEN,
    fontSize: 14,
    fontWeight: '900',
  },
  sheetGhostButton: {
    alignItems: 'center',
    borderColor: '#DDE4DD',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 13,
  },
  sheetGhostButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '900',
  },
});
