import {
  login as kakaoSdkLogin,
  logout as kakaoSdkLogout,
} from '@react-native-seoul/kakao-login';
import { NativeModules } from 'react-native';

import { signInWithKakao, signOutFromKakao } from './kakaoAuthApi';

const KAKAO_REVERSE_GEOCODING_URL = 'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json';

const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY || '';
const kakaoRestApiKey = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '';

function hasNativeKakaoLoginModule() {
  return Boolean(NativeModules.RNKakaoLogins?.login);
}

function isMissingNativeKakaoModuleError(error) {
  return String(error?.message || error).includes("Cannot read property 'login' of null");
}

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

export async function kakaoLogin() {
  try {
    if (!hasNativeKakaoLoginModule()) {
      return await signInWithKakao();
    }

    if (!kakaoNativeAppKey) {
      throw new Error('EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY is not configured.');
    }

    return await kakaoSdkLogin();
  } catch (error) {
    if (isMissingNativeKakaoModuleError(error)) {
      return await signInWithKakao();
    }

    console.error('Kakao login failed.', error);
    throw error;
  }
}

export async function kakaoLogout() {
  try {
    if (!hasNativeKakaoLoginModule()) {
      return await signOutFromKakao();
    }

    return await kakaoSdkLogout();
  } catch (error) {
    console.error('Kakao logout failed.', error);
    throw error;
  }
}

export async function getReverseGeocoding(latitude, longitude) {
  assertValidCoordinate(latitude, longitude);

  if (!kakaoRestApiKey) {
    throw new Error('EXPO_PUBLIC_KAKAO_REST_API_KEY is not configured.');
  }

  const query = new URLSearchParams({
    x: String(longitude),
    y: String(latitude),
  });

  const response = await fetch(`${KAKAO_REVERSE_GEOCODING_URL}?${query.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${kakaoRestApiKey}`,
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

export const getAdministrativeRegionByCoords = getReverseGeocoding;
export const reverseGeocodeToRegion = getReverseGeocoding;
