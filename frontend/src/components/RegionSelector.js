import { useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useRegions } from '../hooks/useRegions';

const MAIN_GREEN = '#2D5C44';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const BACKGROUND = '#F8F6F1';

export default function RegionSelector({
  selectedRegion = null,
  onSelectRegion = null,
  placeholder = '지역을 선택하세요',
  style = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const { regions, count, isLoading, error, refetch } = useRegions();
  const normalizedSearchText = searchText.trim().toLowerCase();

  const filteredRegions = useMemo(() => {
    if (!normalizedSearchText) {
      return regions;
    }

    return regions.filter((region) => {
      const label = `${region.fullName} ${region.regionCode}`.toLowerCase();

      return label.includes(normalizedSearchText);
    });
  }, [normalizedSearchText, regions]);

  const selectedLabel = selectedRegion?.fullName || placeholder;
  const metaLabel = selectedRegion?.fullName
    ? `${selectedRegion.fullName}의 명소`
    : isLoading
      ? '지역 목록 불러오는 중'
      : `${count}개 지역`;

  const handleSelectRegion = (region) => {
    onSelectRegion?.(region);
    setIsOpen(false);
    setSearchText('');
  };

  const handleRetry = () => {
    void refetch();
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.selectorButton}
        activeOpacity={0.7}
        onPress={() => setIsOpen((current) => !current)}
      >
        <View style={styles.selectorLeft}>
          <Ionicons name="location-outline" size={20} color={MAIN_GREEN} />
          <View style={styles.selectorTextGroup}>
            <Text
              style={[
                styles.selectorLabel,
                !selectedRegion && styles.placeholderLabel,
              ]}
              numberOfLines={1}
            >
              {selectedLabel}
            </Text>
            <Text style={styles.selectorMeta}>
              {metaLabel}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={TEXT_SECONDARY}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdown}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={17} color={TEXT_SECONDARY} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="시군구 검색"
              placeholderTextColor="#9B9F98"
            />
            {!!searchText && (
              <TouchableOpacity
                style={styles.clearButton}
                activeOpacity={0.7}
                onPress={() => setSearchText('')}
              >
                <Ionicons name="close" size={18} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={MAIN_GREEN} />
              <Text style={styles.stateText}>지역 목록을 불러오고 있어요</Text>
            </View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Ionicons name="alert-circle-outline" size={24} color={TEXT_SECONDARY} />
              <Text style={styles.stateText}>지역 목록을 불러오지 못했어요</Text>
              <TouchableOpacity style={styles.retryButton} activeOpacity={0.7} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>다시 불러오기</Text>
              </TouchableOpacity>
            </View>
          ) : filteredRegions.length === 0 ? (
            <View style={styles.stateBox}>
              <Ionicons name="map-outline" size={24} color={TEXT_SECONDARY} />
              <Text style={styles.stateText}>검색 결과가 없어요</Text>
            </View>
          ) : (
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={styles.regionList}
            >
              {filteredRegions.map((region) => {
                const isSelected = selectedRegion?.id === region.id;

                return (
                  <TouchableOpacity
                    key={region.id}
                    style={[styles.regionItem, isSelected && styles.selectedRegionItem]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectRegion(region)}
                  >
                    <View style={styles.regionTextGroup}>
                      <Text
                        style={[
                          styles.regionName,
                          isSelected && styles.selectedRegionName,
                        ]}
                        numberOfLines={1}
                      >
                        {region.fullName}
                      </Text>
                      {!!region.regionCode && (
                        <Text style={styles.regionCode}>{region.regionCode}</Text>
                      )}
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={18} color={MAIN_GREEN} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  selectorButton: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  selectorLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  selectorTextGroup: {
    flex: 1,
  },
  selectorLabel: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '900',
  },
  placeholderLabel: {
    color: TEXT_SECONDARY,
  },
  selectorMeta: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  dropdown: {
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    padding: 10,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: BACKGROUND,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  searchInput: {
    color: TEXT_PRIMARY,
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  clearButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  stateBox: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minHeight: 132,
    paddingVertical: 20,
  },
  stateText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  retryButtonText: {
    color: CARD,
    fontSize: 13,
    fontWeight: '900',
  },
  regionList: {
    marginTop: 8,
    maxHeight: 224,
  },
  regionItem: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedRegionItem: {
    backgroundColor: '#E7EFE9',
  },
  regionTextGroup: {
    flex: 1,
  },
  regionName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '800',
  },
  selectedRegionName: {
    color: MAIN_GREEN,
  },
  regionCode: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
});
