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
const DEFAULT_TIMEOUT_MS = 10000;

function resolveDevBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEV_PORT}`;
  }

  return `http://localhost:${DEV_PORT}`;
}

export const API_BASE_URL = resolveDevBaseUrl();

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
      throw new ApiError(`서버 응답이 지연되고 있습니다. (${url})`);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(`서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요. (${url})`);
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
