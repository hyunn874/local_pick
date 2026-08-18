/**
 * 로컬픽 백엔드 API 설정.
 *
 * 기본값은 Render 배포 서버다. 로컬 백엔드로 붙이려면 .env 에 주소를 지정한다.
 *   iOS 시뮬레이터   : EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
 *   Android 에뮬레이터: EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080
 *   실기기(Expo Go)  : EXPO_PUBLIC_API_BASE_URL=http://<개발PC LAN IP>:8080
 *
 * 참고: Render 무료 플랜은 15분 무활동 시 서버가 잠든다.
 * 첫 요청이 30초~1분 걸릴 수 있으므로 production timeout을 넉넉히 잡는다.
 */
const PRODUCTION_BASE_URL = 'https://localpick-api.onrender.com';
const DEFAULT_TIMEOUT_MS = process.env.EXPO_PUBLIC_APP_ENV === 'production' ? 75000 : 60000;

function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }

  return PRODUCTION_BASE_URL;
}

export const API_BASE_URL = resolveBaseUrl();

/** 배포 서버를 바라보는 중인지 (콜드 스타트 안내 문구 등에 사용) */
export const IS_REMOTE_API = API_BASE_URL === PRODUCTION_BASE_URL;

export class ApiError extends Error {
  constructor(message, { status = null, data = null, code = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = code;
  }
}

function buildUrl(path, params) {
  const baseUrl = /^https?:\/\//i.test(path)
    ? path
    : `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();

  if (!queryString) {
    return baseUrl;
  }

  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}`;
}

function normalizeBody(body) {
  if (body === undefined || body === null || typeof body === 'string') {
    return body;
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return body;
  }

  return JSON.stringify(body);
}

async function parsePayload(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(`응답을 해석할 수 없습니다. (HTTP ${response.status})`, {
      status: response.status,
      data: text,
    });
  }
}

function unwrapPayload(payload, response) {
  if (!response.ok || payload?.success === false) {
    throw new ApiError(payload?.message ?? `요청에 실패했습니다. (HTTP ${response.status})`, {
      status: response.status,
      data: payload,
      code: payload?.code,
    });
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

/** 백엔드 공통 응답 래퍼를 벗겨낸다. { success, data, code, message } */
export async function requestApi(path, options = {}) {
  const {
    body,
    headers,
    params,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...fetchOptions
  } = options;
  const url = buildUrl(path, params);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: normalizeBody(body),
      signal: controller.signal,
      ...fetchOptions,
    });

    const payload = await parsePayload(response);

    return unwrapPayload(payload, response);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  request: requestApi,
  get: (path, options) => requestApi(path, { ...options, method: 'GET' }),
  post: (path, body, options) => requestApi(path, { ...options, body, method: 'POST' }),
  put: (path, body, options) => requestApi(path, { ...options, body, method: 'PUT' }),
  patch: (path, body, options) => requestApi(path, { ...options, body, method: 'PATCH' }),
  delete: (path, options) => requestApi(path, { ...options, method: 'DELETE' }),
};

export default apiClient;
