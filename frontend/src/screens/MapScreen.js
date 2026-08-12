import { StyleSheet, Text, View } from 'react-native';

import KakaoMapView from '../components/KakaoMapView';
import { colors } from '../constants/colors';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>지도</Text>
        <Text style={styles.subtitle}>카카오맵 API 연동 영역</Text>
      </View>
      <KakaoMapView />
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
});
