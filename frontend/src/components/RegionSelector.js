import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRegions } from '../hooks/useRegions';
import { colors } from '../constants/colors';

/**
 * 지역 선택기 — 시도를 고르면 해당 시군구 목록을 보여준다.
 *
 * "내 주변" 방식이 아니라 직접 선택 방식이다.
 * GPS 좌표를 서버로 보내지 않기 위한 설계다.
 */
export default function RegionSelector({ onSelect, selectedRegionCode }) {
  const { regions, sidoList, isLoading, error, reload } = useRegions();
  const [selectedSido, setSelectedSido] = useState(null);

  const sigunguList = useMemo(
    () => regions.filter((region) => region.sidoName === selectedSido),
    [regions, selectedSido],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.hint}>지역 정보를 불러오는 중…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => reload()}>
          <Text style={styles.retryLabel}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>시 · 도</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {sidoList.map((sido) => {
          const isActive = sido === selectedSido;
          return (
            <Pressable
              key={sido}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setSelectedSido(isActive ? null : sido)}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {sido}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedSido ? (
        <>
          <Text style={styles.label}>시 · 군 · 구</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {sigunguList.map((region) => {
              const isActive = region.regionCode === selectedRegionCode;
              return (
                <Pressable
                  key={region.regionCode}
                  style={[styles.item, isActive && styles.itemActive]}
                  onPress={() => onSelect?.(region)}
                >
                  <Text style={styles.itemName}>{region.sigunguName}</Text>
                  <Text style={styles.itemMeta}>
                    채택 기준 {region.adoptionThreshold}표
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <Text style={styles.hint}>시·도를 먼저 선택하세요.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingHorizontal: 20,
  },
  centered: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  chipRow: {
    gap: 8,
    paddingRight: 20,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.background,
  },
  list: {
    maxHeight: 260,
  },
  item: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  itemActive: {
    backgroundColor: colors.surface,
  },
  itemName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryLabel: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
});
