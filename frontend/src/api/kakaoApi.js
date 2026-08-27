import { kakaoConfig } from './kakaoConfig';

const KAKAO_COORD_TO_REGION_URL = 'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json';

export async function getReverseGeocoding(latitude, longitude) {
  if (!kakaoConfig.restApiKey) {
    throw new Error('카카오 REST API 키가 설정되지 않았어요.');
  }

  const query = new URLSearchParams({
    x: String(longitude),
    y: String(latitude),
  });
  const response = await fetch(`${KAKAO_COORD_TO_REGION_URL}?${query.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${kakaoConfig.restApiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error('현재 위치의 행정구역을 확인할 수 없어요.');
  }

  const payload = await response.json();
  const region = payload?.documents?.find((document) => document.region_type === 'B')
    || payload?.documents?.[0];
  const sidoName = region?.region_1depth_name;
  const sigunguName = region?.region_2depth_name;

  if (!sidoName || !sigunguName) {
    throw new Error('현재 위치의 시·군·구 정보를 찾을 수 없어요.');
  }

  return `${sidoName} ${sigunguName}`;
}
