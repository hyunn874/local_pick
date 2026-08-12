import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import KakaoMapView from '../components/KakaoMapView';
import RegionSelector from '../components/RegionSelector';
import { colors } from '../constants/colors';

export default function MapScreen() {
  const [selectedRegion, setSelectedRegion] = useState(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>지도</Text>
        <Text style={styles.subtitle}>
          {selectedRegion
            ? `${selectedRegion.fullName} · 인구 ${
                selectedRegion.population?.toLocaleString() ?? '미집계'
              }`
            : '탐색할 지역을 선택하세요'}
        </Text>
      </View>

      <RegionSelector
        onSelect={setSelectedRegion}
        selectedRegionCode={selectedRegion?.regionCode}
      />

      <View style={styles.mapArea}>
        <KakaoMapView />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  mapArea: {
    flex: 1,
    marginTop: 12,
  },
});
