import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { kakaoConfig } from '../api/kakaoConfig';
import { createKakaoMapHtml } from '../api/kakaoMapApi';
import { colors } from '../constants/colors';

const DEFAULT_LATITUDE = 37.5665;
const DEFAULT_LONGITUDE = 126.978;

export default function KakaoMapView({
  latitude = DEFAULT_LATITUDE,
  longitude = DEFAULT_LONGITUDE,
  markers = [],
  onMarkerPress = null,
}) {
  if (!kakaoConfig.javascriptKey) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>카카오맵 JavaScript 키가 필요합니다.</Text>
        <Text style={styles.emptyDescription}>
          app.json의 expo.extra.kakao.javascriptKey에 키를 설정하면 지도 WebView가 표시됩니다.
        </Text>
      </View>
    );
  }

  const handleMessage = (event) => {
    if (!onMarkerPress) {
      return;
    }

    try {
      onMarkerPress(JSON.parse(event.nativeEvent.data));
    } catch {
      // Ignore malformed WebView messages from non-map sources.
    }
  };

  return (
    <WebView
      onMessage={handleMessage}
      originWhitelist={['*']}
      source={{
        html: createKakaoMapHtml({
          javascriptKey: kakaoConfig.javascriptKey,
          latitude,
          longitude,
          markers,
        }),
      }}
      style={styles.webView}
    />
  );
}

const styles = StyleSheet.create({
  webView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
