const DEFAULT_LATITUDE = 37.5665;
const DEFAULT_LONGITUDE = 126.978;

function serializeForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function normalizeCoordinate(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function createKakaoMapHtml({
  javascriptKey,
  latitude = DEFAULT_LATITUDE,
  longitude = DEFAULT_LONGITUDE,
  markers = [],
}) {
  const centerLatitude = normalizeCoordinate(latitude, DEFAULT_LATITUDE);
  const centerLongitude = normalizeCoordinate(longitude, DEFAULT_LONGITUDE);
  const markerData = markers
    .filter((marker) => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude))
    .map((marker) => ({
      id: marker.id,
      title: marker.title || '',
      address: marker.address || '',
      latitude: marker.latitude,
      longitude: marker.longitude,
    }));

  return `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    </style>
    <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${javascriptKey}&autoload=false"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      kakao.maps.load(function () {
        var center = new kakao.maps.LatLng(${centerLatitude}, ${centerLongitude});
        var map = new kakao.maps.Map(document.getElementById('map'), {
          center: center,
          level: 4
        });

        var currentLocationOverlay = new kakao.maps.CustomOverlay({
          position: center,
          content: '<div style="width:14px;height:14px;border-radius:50%;background:#1D6EFF;border:2px solid #fff;box-shadow:0 0 0 3px rgba(29,110,255,0.3)"></div>',
          yAnchor: 0.5,
          xAnchor: 0.5
        });
        currentLocationOverlay.setMap(map);

        var markers = ${serializeForScript(markerData)};

        markers.forEach(function (spot) {
          var position = new kakao.maps.LatLng(spot.latitude, spot.longitude);
          var marker = new kakao.maps.Marker({
            position: position,
            map: map,
            title: spot.title
          });

          kakao.maps.event.addListener(marker, 'click', function () {
            var payload = JSON.stringify({
              id: spot.id,
              title: spot.title,
              address: spot.address,
              latitude: spot.latitude,
              longitude: spot.longitude
            });

            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(payload);
            } else {
              console.log(payload);
            }
          });
        });
      });
    </script>
  </body>
</html>`;
}
