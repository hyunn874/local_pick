import { StyleSheet, View } from 'react-native';
import {
  NaverMapMarkerOverlay,
  NaverMapView as NativeNaverMapView,
} from '@mj-studio/react-native-naver-map';

export default function NaverMapView({
  latitude = 36.3504,
  longitude = 127.3845,
  markers = [],
  onMarkerPress,
  style,
}) {
  const visibleMarkers = markers.filter(
    (marker) => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude),
  );

  return (
    <View style={[styles.container, style]}>
      <NativeNaverMapView
        style={styles.map}
        initialCamera={{
          latitude,
          longitude,
          zoom: 13,
        }}
        mapType="Basic"
        isShowCompass={false}
        isShowScaleBar={false}
        isShowZoomControls
        logoAlign="BottomRight"
      >
        {visibleMarkers.map((marker) => (
          <NaverMapMarkerOverlay
            key={String(marker.id)}
            latitude={marker.latitude}
            longitude={marker.longitude}
            caption={{
              text: marker.title || '',
            }}
            image={{
              symbol: 'green',
            }}
            onTap={() => onMarkerPress?.(marker)}
          />
        ))}
      </NativeNaverMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  map: {
    flex: 1,
  },
});
