import { requestApi } from './apiClient';

/**
 * 지역(행정구역) 관련 백엔드 API.
 *
 * GPS 좌표는 서버로 보내지 않는다. 카카오 Reverse Geocoding 으로 앱에서
 * 행정구역 텍스트를 얻은 뒤, 그 이름으로만 서버에 조회한다.
 */

/** 전체 지역 목록. sido 를 주면 해당 시도만 필터링한다. */
export async function fetchRegions(sido) {
  const query = sido ? `?sido=${encodeURIComponent(sido)}` : '';
  return requestApi(`/api/regions${query}`);
}

/** 지역코드(법정동코드 5자리)로 단건 조회 */
export async function fetchRegionByCode(regionCode) {
  return requestApi(`/api/regions/${regionCode}`);
}

/** 행정구역명으로 조회 — 거주자 인증 시 사용 */
export async function searchRegionByName(sido, sigungu) {
  const query = `?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(sigungu)}`;
  return requestApi(`/api/regions/search${query}`);
}
