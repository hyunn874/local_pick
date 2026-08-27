/**
 * 로컬픽 백엔드 API 설정.
 *
 * 기본값은 Fly.io 배포 서버다. 로컬 백엔드로 붙이려면 .env 에 주소를 지정한다.
 *   iOS 시뮬레이터   : EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
 *   Android 에뮬레이터: EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080
 *   실기기(Expo Go)  : EXPO_PUBLIC_API_BASE_URL=http://<개발PC LAN IP>:8080
 *
 * 참고: 무료 배포 환경은 무활동 시 서버가 잠들 수 있다.
 * 첫 요청이 30초~1분 걸릴 수 있으므로 timeout을 넉넉히 잡는다.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://localpick-api.fly.dev';
const PRODUCTION_BASE_URL = 'https://localpick-api.fly.dev';
const DEFAULT_TIMEOUT_MS = process.env.EXPO_PUBLIC_APP_ENV === 'production' ? 75000 : 60000;

function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }

  return BASE_URL.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveBaseUrl();

/** 배포 서버를 바라보는 중인지 (콜드 스타트 안내 문구 등에 사용) */
export const IS_REMOTE_API = API_BASE_URL === PRODUCTION_BASE_URL;

const authHandlers = {
  getAccessToken: null,
  onUnauthorized: null,
};

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
    const fallbackMessage =
      response.status === 401
        ? '로그인이 만료됐어요. 다시 로그인해주세요.'
        : response.status === 403
          ? '접근 권한이 없어요.'
          : `요청에 실패했습니다. (HTTP ${response.status})`;

    throw new ApiError(payload?.message ?? payload?.error?.message ?? fallbackMessage, {
      status: response.status,
      data: payload,
      code: payload?.code ?? payload?.error?.code,
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
    skipAuth = false,
    skipRefresh = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...fetchOptions
  } = options;
  const url = buildUrl(path, params);
  const endpoint = path;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  async function sendRequest() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const accessToken = skipAuth ? null : authHandlers.getAccessToken?.();
    const token = accessToken;
    console.log('[API] endpoint:', endpoint);
    console.log('[API] token 있음:', !!token);
    const requestHeaders = {
      Accept: 'application/json',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    };

    try {
      const response = await fetch(url, {
        headers: requestHeaders,
        body: normalizeBody(body),
        signal: controller.signal,
        ...fetchOptions,
      });
      const payload = await parsePayload(response);

      return { response, payload };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  try {
    let { response, payload } = await sendRequest();

    if (
      response.status === 401 &&
      !skipAuth &&
      !skipRefresh &&
      typeof authHandlers.onUnauthorized === 'function'
    ) {
      const didRefresh = await authHandlers.onUnauthorized();

      if (didRefresh) {
        ({ response, payload } = await sendRequest());
      }
    }

    return unwrapPayload(payload, response);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  }
}

export function setAuthHandlers(nextHandlers = {}) {
  authHandlers.getAccessToken =
    typeof nextHandlers.getAccessToken === 'function' ? nextHandlers.getAccessToken : null;
  authHandlers.onUnauthorized =
    typeof nextHandlers.onUnauthorized === 'function' ? nextHandlers.onUnauthorized : null;
}

export function clearAuthHandlers() {
  authHandlers.getAccessToken = null;
  authHandlers.onUnauthorized = null;
}

export const apiClient = {
  request: requestApi,
  setAuthHandlers,
  clearAuthHandlers,
  get: (path, options) => requestApi(path, { ...options, method: 'GET' }),
  post: (path, body, options) => requestApi(path, { ...options, body, method: 'POST' }),
  put: (path, body, options) => requestApi(path, { ...options, body, method: 'PUT' }),
  patch: (path, body, options) => requestApi(path, { ...options, body, method: 'PATCH' }),
  delete: (path, options) => requestApi(path, { ...options, method: 'DELETE' }),
};

export default apiClient;
