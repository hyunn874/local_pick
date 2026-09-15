import { forwardRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  NaverMapMarkerOverlay,
  NaverMapView as NativeNaverMapView,
} from '@mj-studio/react-native-naver-map';

import { getNaverMapClientId, maskNaverMapClientId } from '../config/naverMapConfig';

const NaverMapView = forwardRef(function NaverMapView({
  clientId,
  latitude = 36.3504,
  longitude = 127.3845,
  zoom = 10,
  markers = [],
  onCameraIdle,
  onMarkerPress,
  style,
}, ref) {
  const configuredClientId = clientId || getNaverMapClientId();
  const visibleMarkers = markers.filter(
    (marker) => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude),
  );

  useEffect(() => {
    console.log('[NaverMap] clientId:', maskNaverMapClientId(configuredClientId));
  }, [configuredClientId]);

  return (
    <View style={[styles.container, style]}>
      <NativeNaverMapView
        key={configuredClientId || 'naver-map-client-id-missing'}
        ref={ref}
        style={styles.map}
        initialCamera={{
          latitude,
          longitude,
          zoom,
        }}
        mapType="Basic"
        isShowCompass={false}
        isShowScaleBar={false}
        isShowZoomControls
        logoAlign="BottomRight"
        onCameraIdle={(params) => {
          const latitudeValue = Number(params?.latitude);
          const longitudeValue = Number(params?.longitude);

          if (Number.isFinite(latitudeValue) && Number.isFinite(longitudeValue)) {
            onCameraIdle?.({
              latitude: latitudeValue,
              longitude: longitudeValue,
              zoom: params?.zoom,
            });
          }
        }}
      >
        {visibleMarkers.map((marker) => (
          <NaverMapMarkerOverlay
            key={String(marker.id)}
            latitude={marker.latitude}
            longitude={marker.longitude}
            caption={{
              text: marker.title || '',
            }}
            subCaption={{
              text: marker.description || '',
            }}
            image={{
              symbol: marker.markerSymbol || 'green',
            }}
            tintColor={marker.markerTintColor}
            onTap={() => onMarkerPress?.(marker)}
          />
        ))}
      </NativeNaverMapView>
    </View>
  );
});

export default NaverMapView;

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
