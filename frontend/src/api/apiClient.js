import { Platform } from 'react-native';

/**
 * 로컬픽 백엔드 API 설정.
 *
 * 기본값은 Render 배포 서버다. 팀원이 별도 설정 없이 실데이터를 확인할 수 있다.
 *
 * 로컬 백엔드로 붙이려면 .env 에 주소를 지정한다.
 *   iOS 시뮬레이터   : EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
 *   Android 에뮬레이터: EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080
 *   실기기(Expo Go)  : EXPO_PUBLIC_API_BASE_URL=http://<개발PC LAN IP>:8080
 *                      맥에서 IP 확인: ipconfig getifaddr en0
 *
 * 참고: Render 무료 플랜은 15분 무활동 시 서버가 잠든다.
 * 첫 요청이 30초~1분 걸릴 수 있으므로 타임아웃을 넉넉히 잡는다.
 */
const PRODUCTION_BASE_URL = 'https://localpick-api.onrender.com';
const COLD_START_TIMEOUT_MS = 60000;

function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return PRODUCTION_BASE_URL;
}

export const API_BASE_URL = resolveBaseUrl();

/** 배포 서버를 바라보는 중인지 (콜드 스타트 안내 문구 등에 사용) */
export const IS_REMOTE_API = API_BASE_URL === PRODUCTION_BASE_URL;

/** 백엔드 공통 응답 래퍼를 벗겨낸다. { success, data, code, message } */
export async function requestApi(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COLD_START_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
    throw new Error(`서버에 연결할 수 없습니다. (${url})`);
  } finally {
    clearTimeout(timer);
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
