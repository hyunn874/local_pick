import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import apiClient from '../api/apiClient';
import { fetchNearbyAttractions } from '../api/attractionApi';
import { fetchRegionByCode } from '../api/regionApi';
import NaverMapView from '../components/NaverMapView';
import LocalPickModal from '../components/LocalPickModal';
import RegionSelector from '../components/RegionSelector';
import { getNaverMapClientId } from '../config/naverMapConfig';
import { useAuth } from '../contexts/AuthContext';
import { findRegionSearchMatch } from '../data/regionSearchMap';
import { useRegions } from '../hooks/useRegions';
import { generationFilters } from '../mocks/mapMockData';
import { getBalance, setBalance, useBalance } from '../state/localPassStore';
import REGION_COORDINATES from '../data/regionCoordinates';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const { height } = Dimensions.get('window');

const GENERATION_MARKER_STYLES = {
  '20대': { markerSymbol: 'blue', markerTintColor: '#2F80ED' },
  '30-40대': { markerSymbol: 'green', markerTintColor: MAIN_GREEN },
  '50대+': { markerSymbol: 'yellow', markerTintColor: '#F28C28' },
  전체: { markerSymbol: 'gray', markerTintColor: '#7B8179' },
};

const YUSEONG_CENTER = {
  latitude: 36.3504,
  longitude: 127.3845,
};

const KOREA_CENTER = {
  latitude: 36.5,
  longitude: 127.8,
};

const SIDO_COORDINATES = {
  '서울특별시': { lat: 37.5665, lng: 126.9780 },
  '부산광역시': { lat: 35.1796, lng: 129.0756 },
  '대구광역시': { lat: 35.8714, lng: 128.6014 },
  '인천광역시': { lat: 37.4563, lng: 126.7052 },
  '광주광역시': { lat: 35.1595, lng: 126.8526 },
  '대전광역시': { lat: 36.3504, lng: 127.3845 },
  '울산광역시': { lat: 35.5384, lng: 129.3114 },
  '세종특별자치시': { lat: 36.4801, lng: 127.2890 },
  '경기도': { lat: 37.4138, lng: 127.5183 },
  '강원특별자치도': { lat: 37.8228, lng: 128.1555 },
  '충청북도': { lat: 36.6357, lng: 127.4912 },
  '충청남도': { lat: 36.5184, lng: 126.8000 },
  '전북특별자치도': { lat: 35.7175, lng: 127.1530 },
  '전라남도': { lat: 34.8679, lng: 126.9910 },
  '경상북도': { lat: 36.4919, lng: 128.8889 },
  '경상남도': { lat: 35.4606, lng: 128.2132 },
  '제주특별자치도': { lat: 33.4996, lng: 126.5312 },
};

const SIGUNGU_COORDINATES = {
  종로구: { lat: 37.5735, lng: 126.9788 },
  용산구: { lat: 37.5326, lng: 126.9906 },
  성동구: { lat: 37.5633, lng: 127.0365 },
  동대문구: { lat: 37.5744, lng: 127.0396 },
  중랑구: { lat: 37.6063, lng: 127.0927 },
};

function resolveRegionCenter(region) {
  const centerLatitude = Number(region?.centerLatitude);
  const centerLongitude = Number(region?.centerLongitude);

  if (Number.isFinite(centerLatitude) && Number.isFinite(centerLongitude)) {
    return {
      latitude: centerLatitude,
      longitude: centerLongitude,
    };
  }

  const regionCenter = REGION_COORDINATES[region?.regionCode];

  if (regionCenter) {
    return regionCenter;
  }

  const sigunguCenter = SIGUNGU_COORDINATES[region?.sigunguName];

  if (sigunguCenter) {
    return {
      latitude: sigunguCenter.lat,
      longitude: sigunguCenter.lng,
    };
  }

  const fallbackCenter = SIDO_COORDINATES[region?.sidoName];

  if (fallbackCenter) {
    return {
      latitude: fallbackCenter.lat,
      longitude: fallbackCenter.lng,
    };
  }

  return YUSEONG_CENTER;
}

function normalizeAdoptedPlace(item, region) {
  const postId = item.postId ?? item.id;
  const placeName = item.placeName || item.name || item.title || '채택 명소';
  const regionCenter = resolveRegionCenter(region);
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  const adoptionCount = Number(item.adoptionCount ?? item.likes ?? item.likeCount ?? 0);
  const likeCount = Number(item.likeCount ?? item.likes ?? adoptionCount);
  const commentCount = Number(item.commentCount ?? item.comments ?? 0);
  const shareCount = Number(item.shareCount ?? item.shares ?? 0);
  const generation = normalizeGenerationLabel(item.generation || item.ageTag || item.generationTag);

  return {
    id: String(postId ?? `${placeName}-${item.adoptedAt || Date.now()}`),
    postId,
    icon: item.icon || '📍',
    title: placeName,
    name: placeName,
    category: item.category || item.categoryTag || '채택 명소',
    content: item.content || '',
    address: item.address || item.location || '',
    regionCode: item.regionCode || region?.regionCode || region?.code || '',
    generation,
    passCount: item.passCount || `좋아요 ${likeCount} · 댓글 ${commentCount} · 공유 ${shareCount}`,
    latitude: Number.isFinite(latitude) ? latitude : regionCenter.latitude,
    longitude: Number.isFinite(longitude) ? longitude : regionCenter.longitude,
    hasCoordinates: Number.isFinite(latitude) && Number.isFinite(longitude),
    region: item.region || item.regionName || region?.fullName || '전국',
    likes: likeCount,
    comments: commentCount,
    shares: shareCount,
    engagementScore: likeCount + commentCount + shareCount,
    adoptionCount,
    adoptedAt: item.adoptedAt,
    imageUrl: item.imageUrl || item.imageUrls?.[0] || null,
  };
}

function normalizeGenerationLabel(value) {
  if (value === 'TWENTIES' || value === '20대') {
    return '20대';
  }

  if (value === 'THIRTIES_FORTIES' || value === '30·40대' || value === '30-40대') {
    return '30-40대';
  }

  if (value === 'FIFTIES_PLUS' || value === '50대 이상' || value === '50대+') {
    return '50대+';
  }

  return '전체';
}

function getGenerationMarkerStyle(generation) {
  return GENERATION_MARKER_STYLES[generation] || GENERATION_MARKER_STYLES.전체;
}

function getDistanceScore(center, place) {
  if (!center || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
    return Number.MAX_SAFE_INTEGER;
  }

  const latitudeGap = center.latitude - place.latitude;
  const longitudeGap = center.longitude - place.longitude;

  return latitudeGap * latitudeGap + longitudeGap * longitudeGap;
}

function buildRegionFromSearchMatch(match) {
  if (!match) {
    return null;
  }

  return {
    regionCode: match.regionCode,
    sidoName: match.sidoName,
    sigunguName: match.sigunguName,
    fullName: match.fullName || `${match.sidoName} ${match.sigunguName}`,
    centerLatitude: match.latitude,
    centerLongitude: match.longitude,
  };
}

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

function PlaceBottomSheet({
  animatedStyle,
  attractionError,
  isLoadingAttractions,
  onClose,
  onShowAlternatives,
  onUsePass,
  place,
  relatedAttractions,
  showAlternatives,
}) {
  return (
    <Animated.View style={[styles.bottomSheet, animatedStyle]}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{place?.name || place?.title}</Text>
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
          <Text style={styles.sheetTagText}>{place?.category}</Text>
        </View>
        <View style={styles.sheetTag}>
          <Text style={styles.sheetTagText}>{place?.generation}</Text>
        </View>
        <View style={styles.sheetTag}>
          <Text style={styles.sheetTagText}>채택 {place?.adoptionCount ?? place?.likes ?? 0}</Text>
        </View>
      </View>
      {showAlternatives && (
        <View style={styles.similarList}>
          {isLoadingAttractions ? (
            <View style={styles.similarStatusItem}>
              <ActivityIndicator color={MAIN_GREEN} />
              <Text style={styles.similarStatusText}>연관 관광지를 불러오는 중이에요</Text>
            </View>
          ) : attractionError ? (
            <View style={styles.similarStatusItem}>
              <Text style={styles.similarStatusText}>{attractionError}</Text>
            </View>
          ) : relatedAttractions.length > 0 ? (
            relatedAttractions.map((attraction) => (
              <View key={attraction.id} style={styles.similarItem}>
                <Text style={styles.similarTitle}>{attraction.title}</Text>
                <Text style={styles.similarMeta}>
                  {attraction.category} · {attraction.meta}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.similarStatusItem}>
              <Text style={styles.similarStatusText}>근처 연관 관광지가 아직 없어요</Text>
            </View>
          )}
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
  const mapRef = useRef(null);
  const { regions } = useRegions();
  const [selectedFilter, setSelectedFilter] = useState('전체');
  const [searchText, setSearchText] = useState('');
  const [selectedPin, setSelectedPin] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [regionRecommendations, setRegionRecommendations] = useState([]);
  const [regionCenterOverride, setRegionCenterOverride] = useState(null);
  const [mapCenter, setMapCenter] = useState(KOREA_CENTER);
  const [relatedAttractions, setRelatedAttractions] = useState([]);
  const [isLoadingAttractions, setIsLoadingAttractions] = useState(false);
  const [attractionError, setAttractionError] = useState(null);
  const [passModal, setPassModal] = useState({
    visible: false,
    tone: 'info',
    title: '',
    message: '',
    place: null,
    confirm: false,
  });
  useBalance();
  const naverMapClientId = getNaverMapClientId();

  const rawSearchText = searchText.trim().toLowerCase();
  const selectedRegionSearchText = (
    selectedRegion?.fullName ||
    `${selectedRegion?.sidoName || ''} ${selectedRegion?.sigunguName || ''}`
  ).trim().toLowerCase();
  const normalizedSearchText =
    rawSearchText && rawSearchText === selectedRegionSearchText ? '' : rawSearchText;
  const selectedRegionCenter = useMemo(() => {
    if (!selectedRegion) {
      return KOREA_CENTER;
    }

    const firstPlace = regionRecommendations[0];

    if (firstPlace?.hasCoordinates) {
      return {
        latitude: firstPlace.latitude,
        longitude: firstPlace.longitude,
      };
    }

    return regionCenterOverride || resolveRegionCenter(selectedRegion);
  }, [regionCenterOverride, regionRecommendations, selectedRegion]);

  const selectedMapZoom = useMemo(() => {
    if (!selectedRegion) {
      return 6;
    }

    if (regionRecommendations.some((place) => place.hasCoordinates)) {
      return 14;
    }

    if (selectedRegion?.sigunguName) {
      return 13;
    }

    return 10;
  }, [regionRecommendations, selectedRegion]);

  const filteredRecommendations = useMemo(
    () =>
      regionRecommendations
        .filter((place) => {
        const matchesFilter =
          selectedFilter === '전체' || place.generation === selectedFilter;
        const matchesSearch =
          !normalizedSearchText ||
          place.title.toLowerCase().includes(normalizedSearchText) ||
          place.category.toLowerCase().includes(normalizedSearchText);

        return matchesFilter && matchesSearch;
      })
        .sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))
        .slice(0, 3),
    [mapCenter, normalizedSearchText, regionRecommendations, selectedFilter],
  );

  const filteredMarkers = useMemo(
    () =>
      regionRecommendations
        .filter((place) => {
          const matchesFilter =
            selectedFilter === '전체' || place.generation === selectedFilter;
          const matchesSearch =
            !normalizedSearchText ||
            place.title.toLowerCase().includes(normalizedSearchText) ||
            place.category.toLowerCase().includes(normalizedSearchText);

          return matchesFilter && matchesSearch;
        })
        .map((place) => ({
          ...place,
          ...getGenerationMarkerStyle(place.generation),
          id: place.id,
          latitude: place.latitude,
          longitude: place.longitude,
          title: place.title,
          description: `${place.title} · 채택 ${place.adoptionCount ?? 0}`,
        })),
    [normalizedSearchText, regionRecommendations, selectedFilter],
  );

  const hasSearchResults =
    filteredMarkers.length > 0 || filteredRecommendations.length > 0;

  useEffect(() => {
    let isMounted = true;
    const regionCode = selectedRegion?.regionCode;
    const existingLatitude = Number(selectedRegion?.centerLatitude);
    const existingLongitude = Number(selectedRegion?.centerLongitude);

    setRegionCenterOverride(null);

    if (
      !regionCode ||
      (Number.isFinite(existingLatitude) && Number.isFinite(existingLongitude))
    ) {
      return () => {
        isMounted = false;
      };
    }

    async function loadRegionCenter() {
      try {
        const regionDetail = await fetchRegionByCode(regionCode);
        const latitude = Number(regionDetail?.centerLatitude);
        const longitude = Number(regionDetail?.centerLongitude);

        if (isMounted && Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setRegionCenterOverride({ latitude, longitude });
        }
      } catch (error) {
      }
    }

    void loadRegionCenter();

    return () => {
      isMounted = false;
    };
  }, [selectedRegion?.centerLatitude, selectedRegion?.centerLongitude, selectedRegion?.regionCode]);

  useEffect(() => {
    let isMounted = true;

    async function loadRegionRecommendations() {
      const regionCode = selectedRegion?.regionCode;

      try {
        const data = await apiClient.get('/api/places/adopted', {
          params: regionCode ? { regionCode } : undefined,
          skipAuth: true,
        });
        const nextRecommendations = Array.isArray(data)
          ? data.map((item) => normalizeAdoptedPlace(item, selectedRegion))
          : [];

        if (isMounted) {
          setRegionRecommendations(nextRecommendations);
        }
      } catch (error) {
        if (isMounted) {
          setRegionRecommendations([]);
        }
      }
    }

    void loadRegionRecommendations();

    return () => {
      isMounted = false;
    };
  }, [selectedRegion]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!mapRef.current) {
        return;
      }

      mapRef.current.animateCameraTo({
        latitude: selectedRegionCenter.latitude,
        longitude: selectedRegionCenter.longitude,
        zoom: selectedMapZoom,
        duration: 500,
      });
      setMapCenter(selectedRegionCenter);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedMapZoom, selectedRegionCenter]);

  const handleSelectRegion = (region) => {
    setSelectedRegion(region);
    setSearchText(region?.fullName || `${region?.sidoName || ''} ${region?.sigunguName || ''}`.trim());
    setMapCenter(resolveRegionCenter(region));
    setRegionRecommendations([]);
    setRegionCenterOverride(null);
    setSelectedPin(null);
    setShowAlternatives(false);
    setRelatedAttractions([]);
    setAttractionError(null);
  };

  const handleSearchTextChange = (value) => {
    setSearchText(value);

    const matchedRegion = buildRegionFromSearchMatch(
      findRegionSearchMatch(value, regions),
    );

    if (!matchedRegion || matchedRegion.regionCode === selectedRegion?.regionCode) {
      return;
    }

    setSearchText(matchedRegion.fullName);
    setSelectedRegion(matchedRegion);
    setMapCenter(resolveRegionCenter(matchedRegion));
    setRegionRecommendations([]);
    setRegionCenterOverride(null);
    setSelectedPin(null);
    setShowAlternatives(false);
    setRelatedAttractions([]);
    setAttractionError(null);
  };

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
    setRelatedAttractions([]);
    setAttractionError(null);
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
    setRelatedAttractions([]);
    setAttractionError(null);
    setSelectedPin({
      ...place,
      name: place.title,
    });
  };

  const loadRelatedAttractions = async (place) => {
    const latitude = Number(place?.latitude);
    const longitude = Number(place?.longitude);

    setRelatedAttractions([]);
    setAttractionError(null);

    if (!place?.hasCoordinates || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setIsLoadingAttractions(false);
      setAttractionError('정확한 좌표가 있는 채택 명소에서 연관 관광지를 볼 수 있어요');
      return;
    }

    setIsLoadingAttractions(true);

    try {
      const attractions = await fetchNearbyAttractions({
        latitude,
        longitude,
        radius: 5000,
        limit: 5,
      });

      setRelatedAttractions(attractions);
    } catch (error) {
      setAttractionError('연관 관광지를 불러오지 못했어요. 잠시 후 다시 시도해주세요');
    } finally {
      setIsLoadingAttractions(false);
    }
  };

  const handleAlternativePress = (place) => {
    setShowAlternatives(true);
    setSelectedPin({
      ...place,
      name: place.title,
    });
    void loadRelatedAttractions(place);
  };

  const handleShowAlternatives = () => {
    if (!selectedPin) {
      return;
    }

    setShowAlternatives(true);
    void loadRelatedAttractions(selectedPin);
  };

  const handleShowAllRecommendations = () => {
    navigation.navigate('AllRecommend', {
      region: selectedRegion,
    });
  };

  const navigateToPlaceDetail = (place) => {
    const selectedPlaceName = place?.title || place?.name || '선택한 장소';

    setSelectedPin(null);
    navigation.navigate('PostDetail', {
      post: {
        id: place?.postId ?? place?.id,
        author: place?.region || '지역 거주자',
        isResident: true,
        time: place?.adoptedAt || '최근',
        image: place?.imageUrl || null,
        imageUrl: place?.imageUrl || null,
        ageTag: place?.generation || '전체',
        generationTag: place?.generation || '전체',
        categoryTag: place?.category || '명소',
        title: selectedPlaceName,
        content:
          place?.content ||
          `${place?.address ? `${place.address}\n\n` : ''}로컬 거주자가 추천한 채택 명소예요.`,
        progress: 100,
        likes: place?.likes || 0,
        comments: place?.comments || 0,
        shares: place?.shares || 0,
        location: place?.address || place?.region || '위치 정보 없음',
        regionCode: place?.regionCode,
        regionName: place?.region,
      },
    });
  };

  const usePassAndOpenPlace = async (place) => {
    try {
      const data = await apiClient.post('/api/localpass/use', {
        placeId: Number(place?.postId ?? place?.id),
      });
      if (Number.isFinite(Number(data?.balance))) {
        setBalance(Number(data.balance));
      }
      setPassModal((current) => ({ ...current, visible: false, place: null }));
      navigateToPlaceDetail(place);
    } catch (error) {
      setPassModal({
        visible: true,
        tone: error?.code === 'L001' ? 'warning' : 'error',
        title: error?.code === 'L001' ? '로컬패스가 부족합니다' : '열람 실패',
        message: error?.message || '명소 정보를 열람하지 못했어요.',
        place: null,
        confirm: false,
      });
    }
  };

  const handleUsePass = async () => {
    if (isGuest) {
      setPassModal({
        visible: true,
        tone: 'warning',
        title: '로그인이 필요해요',
        message: '로컬패스는 로그인 후 이용할 수 있어요.',
        place: null,
        confirm: true,
      });
      return;
    }

    const selectedMarker = selectedPin;

    if (!selectedMarker) {
      setPassModal({
        visible: true,
        tone: 'info',
        title: '명소를 선택해주세요',
        message: '지도에서 명소를 먼저 선택해주세요.',
        place: null,
        confirm: false,
      });
      return;
    }

    const selectedPlaceName = selectedMarker?.title || selectedMarker?.name || '선택한 장소';
    const userRegionCode = user?.region?.regionCode || user?.region?.code;
    const isOwnRegion = userRegionCode && selectedMarker?.regionCode === userRegionCode;

    if (isOwnRegion) {
      await usePassAndOpenPlace(selectedMarker);
      return;
    }

    try {
      const viewedData = await apiClient.get('/api/localpass/viewed', {
        params: { placeId: Number(selectedMarker?.postId ?? selectedMarker?.id) },
      });

      if (viewedData?.viewed) {
        navigateToPlaceDetail(selectedMarker);
        return;
      }
    } catch {
      // 조회 실패 시에도 사용 확인 단계에서 최종 검증한다.
    }

    if (getBalance() <= 0) {
      setPassModal({
        visible: true,
        tone: 'warning',
        title: '로컬패스가 부족합니다',
        message: '소통방 활동이나 채택 보상으로 로컬패스를 획득한 뒤 다시 시도해주세요.',
        place: null,
        confirm: false,
      });
      return;
    }

    setPassModal({
      visible: true,
      tone: 'info',
      title: '로컬패스 사용',
      message: `로컬패스 1개를 사용하여\n${selectedPlaceName} 정보를 열람하시겠습니까?`,
      place: selectedMarker,
      confirm: true,
    });
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
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoIcon}
                contentFit="contain"
              />
              <Text style={styles.logoText}>로컬픽</Text>
            </View>

            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={handleSearchTextChange}
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
              onSelectRegion={handleSelectRegion}
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
          <NaverMapView
            ref={mapRef}
            clientId={naverMapClientId}
            latitude={selectedRegionCenter.latitude}
            longitude={selectedRegionCenter.longitude}
            zoom={selectedMapZoom}
            markers={filteredMarkers}
            onCameraIdle={setMapCenter}
            onMarkerPress={handleSelectMarker}
            style={styles.naverMap}
          />
        </View>

        <View style={styles.recommendationSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedRegion?.fullName ? `${selectedRegion.fullName}의 명소` : '이 구역의 로컬 추천'}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={handleShowAllRecommendations}>
              <Text style={styles.sectionLink}>전체보기 &gt;</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendationList}
          >
            {!selectedRegion ? (
              <View style={styles.emptyRecommendationCard}>
                <Text style={styles.emptyRecommendationText}>
                  지역을 선택하면 채택 명소를 볼 수 있어요
                </Text>
              </View>
            ) : hasSearchResults ? (
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
          attractionError={attractionError}
          isLoadingAttractions={isLoadingAttractions}
          showAlternatives={showAlternatives}
          relatedAttractions={relatedAttractions}
          onClose={() => setSelectedPin(null)}
          onShowAlternatives={handleShowAlternatives}
          onUsePass={handleUsePass}
        />
      )}
      <LocalPickModal
        visible={passModal.visible}
        tone={passModal.tone}
        title={passModal.title}
        message={passModal.message}
        primaryText={passModal.confirm ? '예' : '확인'}
        secondaryText={passModal.confirm ? '아니오' : undefined}
        onPrimaryPress={() => {
          if (passModal.place) {
            void usePassAndOpenPlace(passModal.place);
            return;
          }
          if (passModal.title === '로그인이 필요해요') {
            setPassModal((current) => ({ ...current, visible: false }));
            exitGuestMode();
            return;
          }
          setPassModal((current) => ({ ...current, visible: false }));
        }}
        onSecondaryPress={() => setPassModal((current) => ({ ...current, visible: false }))}
        onRequestClose={() => setPassModal((current) => ({ ...current, visible: false }))}
      />
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
    borderRadius: 8,
    height: 32,
    width: 32,
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
  naverMap: {
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
  similarStatusItem: {
    alignItems: 'center',
    backgroundColor: '#F8F6F1',
    borderRadius: 8,
    gap: 8,
    padding: 14,
  },
  similarStatusText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
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
