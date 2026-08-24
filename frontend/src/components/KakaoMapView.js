import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { height } = Dimensions.get('window');

const KakaoMapView = ({
  latitude = 36.3504,
  longitude = 127.3845,
  markers = [],
  onMarkerPress,
  style,
}) => {
  const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY;

  const generateMarkerJS = (nextMarkers) => {
    return nextMarkers.map((marker, index) => `
      var marker${index} = new kakao.maps.Marker({
        map: map,
        position: new kakao.maps.LatLng(${marker.latitude}, ${marker.longitude}),
        title: '${marker.title}'
      });
      kakao.maps.event.addListener(marker${index}, 'click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id: ${marker.id},
          title: '${marker.title}',
          category: '${marker.category}',
          latitude: ${marker.latitude},
          longitude: ${marker.longitude}
        }));
      });
    `).join('\n');
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport"
        content="width=device-width, initial-scale=1.0, user-scalable=no"/>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        #map { width: 100%; height: 100%; }
        #error {
          display: none;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          font-family: sans-serif;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="error">
        <p style="font-size:16px;font-weight:bold;color:#333">
          카카오맵을 표시할 수 없어요
        </p>
        <p style="font-size:13px;margin-top:8px">
          네트워크 연결을 확인해주세요
        </p>
      </div>
      <script>
        function onKakaoMapError() {
          document.getElementById('map').style.display = 'none';
          document.getElementById('error').style.display = 'block';
        }

        function initMap() {
          try {
            var container = document.getElementById('map');
            var options = {
              center: new kakao.maps.LatLng(${latitude}, ${longitude}),
              level: 5
            };
            var map = new kakao.maps.Map(container, options);

            ${generateMarkerJS(markers)}

          } catch(e) {
            onKakaoMapError();
          }
        }
      </script>
      <script
        src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"
        onload="kakao.maps.load(initMap)"
        onerror="onKakaoMapError()">
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (onMarkerPress) onMarkerPress(data);
    } catch (e) {}
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: height * 0.45,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
});

export default KakaoMapView;
