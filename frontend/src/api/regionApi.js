import { requestApi } from './apiClient';

/**
 * 지역(행정구역) 관련 백엔드 API.
 *
 * 거주자 인증의 GPS 좌표 변환은 인증 API에서 처리하고,
 * 이 모듈은 행정구역 목록/검색 조회만 담당한다.
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
