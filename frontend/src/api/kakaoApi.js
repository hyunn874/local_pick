import { kakaoConfig } from './kakaoConfig';

const KAKAO_REVERSE_GEOCODING_URL = 'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json';

function assertValidCoordinate(latitude, longitude) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude.');
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude.');
  }
}

function formatAdministrativeRegion(document) {
  if (!document?.region_1depth_name || !document?.region_2depth_name) {
    return '';
  }

  return `${document.region_1depth_name} ${document.region_2depth_name}`;
}

export async function getAdministrativeRegionByCoords(latitude, longitude) {
  assertValidCoordinate(latitude, longitude);

  if (!kakaoConfig.restApiKey) {
    throw new Error('EXPO_PUBLIC_KAKAO_REST_API_KEY is not configured.');
  }

  const query = new URLSearchParams({
    x: String(longitude),
    y: String(latitude),
  });

  const response = await fetch(`${KAKAO_REVERSE_GEOCODING_URL}?${query.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${kakaoConfig.restApiKey}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Kakao reverse geocoding request failed.');
  }

  const administrativeRegion =
    data.documents?.find((document) => document.region_type === 'H') || data.documents?.[0];

  return formatAdministrativeRegion(administrativeRegion);
}

export const reverseGeocodeToRegion = getAdministrativeRegionByCoords;
