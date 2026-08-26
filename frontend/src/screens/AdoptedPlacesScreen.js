import { useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const MAIN_GREEN = '#2D5C44';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const AGE_FILTERS = ['전체', '20대', '30-40대', '50대+'];

const adoptedPlaceItems = [
  {
    id: 'science-road',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    name: '유성 과학 산책길',
    region: '대전 유성구',
    category: '산책',
    ageTag: '20대',
    likes: 42,
  },
  {
    id: 'bongmyeong-market',
    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9',
    name: '봉명 로컬마켓',
    region: '대전 유성구',
    category: '시장',
    ageTag: '30-40대',
    likes: 38,
  },
  {
    id: 'gapcheon-sunset',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
    name: '갑천 노을 산책로',
    region: '대전 유성구',
    category: '산책',
    ageTag: '50대+',
    likes: 35,
  },
  {
    id: 'hidden-cafe',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085',
    name: '봉명동 숨은 골목 카페',
    region: '대전 유성구',
    category: '카페',
    ageTag: '20대',
    likes: 31,
  },
  {
    id: 'library-street',
    imageUrl: null,
    name: '궁동 책방 거리',
    region: '대전 유성구',
    category: '문화',
    ageTag: '30-40대',
    likes: 29,
  },
];

function Header({ navigation }) {
  return (
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
      <Text style={styles.headerTitle}>채택된 명소</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function PlaceCard({ item }) {
  return (
    <View style={styles.placeCard}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.placeImage} contentFit="cover" />
      ) : (
        <View style={styles.placeImagePlaceholder}>
          <Ionicons name="image-outline" size={26} color={TEXT_SECONDARY} />
        </View>
      )}
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{item.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.placeRegion}>{item.region}</Text>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{item.category}</Text>
          </View>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.ageTag}>
            <Text style={styles.ageTagText}>{item.ageTag}</Text>
          </View>
          <Text style={styles.likeText}>좋아요 {item.likes}</Text>
        </View>
      </View>
    </View>
  );
}

export default function AdoptedPlacesScreen({ navigation }) {
  const [selectedAgeFilter, setSelectedAgeFilter] = useState('전체');
  const filteredPlaces = useMemo(
    () =>
      selectedAgeFilter === '전체'
        ? adoptedPlaceItems
        : adoptedPlaceItems.filter((place) => place.ageTag === selectedAgeFilter),
    [selectedAgeFilter],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header navigation={navigation} />
      <View style={styles.filterTabs}>
        {AGE_FILTERS.map((filter) => {
          const isSelected = selectedAgeFilter === filter;

          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, isSelected && styles.selectedFilterTab]}
              activeOpacity={0.7}
              onPress={() => setSelectedAgeFilter(filter)}
            >
              <Text style={[styles.filterText, isSelected && styles.selectedFilterText]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <PlaceCard item={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyText}>조건에 맞는 명소가 없어요</Text>
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
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  filterTab: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    height: 36,
    justifyContent: 'center',
  },
  selectedFilterTab: {
    backgroundColor: MAIN_GREEN,
    borderColor: MAIN_GREEN,
  },
  filterText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedFilterText: {
    color: CARD,
  },
  listContent: {
    flexGrow: 1,
    gap: 12,
    padding: 20,
    paddingBottom: 40,
  },
  placeCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  placeImage: {
    backgroundColor: '#E8F0EB',
    borderRadius: 8,
    height: 88,
    width: 88,
  },
  placeImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#E8F0EB',
    borderRadius: 8,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  placeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  placeName: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  placeRegion: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '800',
  },
  categoryTag: {
    backgroundColor: '#F1E7D7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryTagText: {
    color: '#8B5E22',
    fontSize: 11,
    fontWeight: '900',
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  ageTag: {
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ageTagText: {
    color: MAIN_GREEN,
    fontSize: 11,
    fontWeight: '900',
  },
  likeText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
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
