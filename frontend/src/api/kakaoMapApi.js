const DEFAULT_LATITUDE = 37.5665;
const DEFAULT_LONGITUDE = 126.978;

export function createKakaoMapHtml(javascriptKey) {
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
        var center = new kakao.maps.LatLng(${DEFAULT_LATITUDE}, ${DEFAULT_LONGITUDE});
        var map = new kakao.maps.Map(document.getElementById('map'), {
          center: center,
          level: 4
        });
        new kakao.maps.Marker({ position: center, map: map });
      });
    </script>
  </body>
</html>`;
}
