import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';

const generationFilters = ['전체', '20대', '30-40대', '50대+'];

const mapPins = [
  {
    id: 'bongmyeong-cafe',
    name: '봉명동 카페',
    icon: '☕',
    category: '카페',
    generation: '20대',
    position: {
      top: '28%',
      left: '18%',
    },
  },
  {
    id: 'noeun-food',
    name: '노은 맛집',
    icon: '🍽',
    category: '맛집',
    generation: '30-40대',
    position: {
      top: '44%',
      left: '61%',
    },
  },
  {
    id: 'gapcheon-walk',
    name: '갑천 산책로',
    icon: '🚶',
    category: '산책',
    generation: '30-40대',
    position: {
      top: '64%',
      left: '35%',
    },
  },
];

const recommendedPlaces = [
  {
    id: 'hidden-cafe',
    icon: '☕',
    title: '봉명동 숨은 골목 카페',
    category: '카페',
    generation: '20대',
    passCount: '로컬패스 1개',
  },
  {
    id: 'sunset-walk',
    icon: '🚶',
    title: '갑천 노을 산책로',
    category: '산책',
    generation: '30-40대',
    passCount: '로컬패스 1개',
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
      <Text style={[styles.filterText, isSelected && styles.selectedFilterText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MapPin({ pin, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.mapPin, pin.position]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.mapPinIcon}>{pin.icon}</Text>
      <View style={styles.mapPinLabelWrap}>
        <Text style={styles.mapPinLabel}>{pin.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

function RecommendationCard({ place, onPress, onAlternativePress }) {
  return (
    <TouchableOpacity style={styles.recommendationCard} activeOpacity={0.7} onPress={onPress}>
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

function PlaceBottomSheet({ place, animatedStyle, onClose }) {
  return (
    <Animated.View style={[styles.bottomSheet, animatedStyle]}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{place.name}</Text>
        <TouchableOpacity style={styles.sheetCloseButton} activeOpacity={0.7} onPress={onClose}>
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
      <View style={styles.sheetActions}>
        <TouchableOpacity
          style={styles.sheetPrimaryButton}
          activeOpacity={0.7}
          onPress={() => Alert.alert('소통방', '소통방 상세 연결은 준비 중이에요!')}
        >
          <Text style={styles.sheetPrimaryButtonText}>소통방에서 보기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sheetSecondaryButton}
          activeOpacity={0.7}
          onPress={() => Alert.alert('로컬패스', '로컬패스 사용은 준비 중이에요!')}
        >
          <Text style={styles.sheetSecondaryButtonText}>로컬패스 사용하기</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function MapScreen() {
  const sheetAnimation = useSharedValue(0);
  const [selectedFilter, setSelectedFilter] = useState('전체');
  const [searchText, setSearchText] = useState('');
  const [selectedPin, setSelectedPin] = useState(null);

  const normalizedSearchText = searchText.trim().toLowerCase();

  const filteredPins = useMemo(
    () =>
      mapPins.filter((pin) => {
        const matchesFilter = selectedFilter === '전체' || pin.generation === selectedFilter;
        const matchesSearch =
          !normalizedSearchText ||
          pin.name.toLowerCase().includes(normalizedSearchText) ||
          pin.category.toLowerCase().includes(normalizedSearchText);

        return matchesFilter && matchesSearch;
      }),
    [normalizedSearchText, selectedFilter],
  );

  const filteredRecommendations = useMemo(
    () =>
      recommendedPlaces.filter((place) => {
        const matchesFilter = selectedFilter === '전체' || place.generation === selectedFilter;
        const matchesSearch =
          !normalizedSearchText ||
          place.title.toLowerCase().includes(normalizedSearchText) ||
          place.category.toLowerCase().includes(normalizedSearchText);

        return matchesFilter && matchesSearch;
      }),
    [normalizedSearchText, selectedFilter],
  );

  const hasSearchResults = filteredPins.length > 0 || filteredRecommendations.length > 0;

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

  const handleSelectPin = (pin) => {
    setSelectedPin(pin);
  };

  const handleRecommendationPress = (place) => {
    Alert.alert('장소 정보', `${place.title} 상세 화면은 준비 중이에요!`);
  };

  const handleAlternativePress = () => {
    Alert.alert('대안 추천', '유사한 장소를 찾고 있어요!');
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
        <View style={styles.mapGridLineHorizontal} />
        <View style={styles.mapGridLineVertical} />
        <Text style={styles.mapPlaceholderText}>카카오맵 영역</Text>
        {hasSearchResults ? (
          filteredPins.map((pin) => (
            <MapPin key={pin.id} pin={pin} onPress={() => handleSelectPin(pin)} />
          ))
        ) : (
          <View style={styles.noSearchResults}>
            <Text style={styles.noSearchResultsText}>검색 결과가 없어요</Text>
          </View>
        )}
      </View>

      <View style={styles.recommendationSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>이 구역의 로컬 추천</Text>
          <TouchableOpacity activeOpacity={0.7}>
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
                onAlternativePress={handleAlternativePress}
              />
            ))
          ) : (
            <View style={styles.emptyRecommendationCard}>
              <Text style={styles.emptyRecommendationText}>검색 결과가 없어요</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {selectedPin && (
        <PlaceBottomSheet
          place={selectedPin}
          animatedStyle={sheetAnimatedStyle}
          onClose={() => setSelectedPin(null)}
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
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  mapGridLineHorizontal: {
    backgroundColor: 'rgba(255,255,255,0.32)',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  mapGridLineVertical: {
    backgroundColor: 'rgba(255,255,255,0.32)',
    bottom: 0,
    left: '50%',
    position: 'absolute',
    top: 0,
    width: 1,
  },
  mapPlaceholderText: {
    alignSelf: 'center',
    color: '#777777',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 18,
  },
  mapPin: {
    alignItems: 'center',
    position: 'absolute',
    transform: [{ translateX: -30 }],
    width: 92,
  },
  mapPinIcon: {
    backgroundColor: CARD,
    borderColor: MAIN_GREEN,
    borderRadius: 18,
    borderWidth: 2,
    color: MAIN_GREEN,
    fontSize: 18,
    height: 36,
    lineHeight: 32,
    overflow: 'hidden',
    textAlign: 'center',
    width: 36,
  },
  mapPinLabelWrap: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 4,
    marginTop: 5,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  mapPinLabel: {
    backgroundColor: 'rgba(45,92,68,0.92)',
    borderRadius: 999,
    color: CARD,
    fontSize: 13,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
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
  sheetPrimaryButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    paddingVertical: 13,
  },
  sheetPrimaryButtonText: {
    color: CARD,
    fontSize: 14,
    fontWeight: '900',
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
});
