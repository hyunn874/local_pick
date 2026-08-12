import { Platform } from 'react-native';

/**
 * 로컬픽 백엔드 API 설정.
 *
 * 개발 중에는 로컬 서버를 바라본다. 플랫폼마다 localhost 의미가 달라 분기가 필요하다.
 *  - iOS 시뮬레이터  : localhost 그대로 동작
 *  - Android 에뮬레이터: 10.0.2.2 가 호스트 PC를 가리킴
 *  - 실기기(Expo Go) : 같은 와이파이의 개발 PC LAN IP 필요
 *
 * 실기기로 테스트하려면 .env 에 EXPO_PUBLIC_API_BASE_URL 을 직접 지정한다.
 *   EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8080
 */
const DEV_PORT = 8080;

function resolveDevBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) {
    return fromEnv;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEV_PORT}`;
  }

  return `http://localhost:${DEV_PORT}`;
}

export const API_BASE_URL = resolveDevBaseUrl();

/** 백엔드 공통 응답 래퍼를 벗겨낸다. { success, data, code, message } */
export async function requestApi(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (error) {
    throw new Error(
      `서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요. (${url})`,
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`응답을 해석할 수 없습니다. (HTTP ${response.status})`);
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.message ?? `요청에 실패했습니다. (HTTP ${response.status})`;
    const error = new Error(message);
    error.code = payload?.code;
    throw error;
  }

  return payload?.data;
}
