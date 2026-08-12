import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8080',
  default: 'http://localhost:8080',
});

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

const DEFAULT_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor(message, { status = null, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function isAbsoluteUrl(path) {
  return /^https?:\/\//i.test(path);
}

function buildUrl(path, params) {
  const baseUrl = isAbsoluteUrl(path) ? path : `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
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

function isFormDataBody(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function unwrapApiResponse(payload) {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    if (payload.success === false) {
      throw new ApiError(payload.message || 'API request failed.', {
        data: payload,
      });
    }

    return payload.data ?? null;
  }

  return payload;
}

async function request(path, options = {}) {
  const {
    body,
    headers,
    params,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    unwrap = true,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const formDataBody = isFormDataBody(body);
  const requestHeaders = {
    Accept: 'application/json',
    ...(formDataBody ? {} : { 'Content-Type': 'application/json' }),
    ...headers,
  };

  const requestBody =
    body === undefined || body === null || formDataBody || typeof body === 'string'
      ? body
      : JSON.stringify(body);

  try {
    const response = await fetch(buildUrl(path, params), {
      ...fetchOptions,
      body: requestBody,
      headers: requestHeaders,
      signal: controller.signal,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      throw new ApiError(payload?.message || `API request failed with status ${response.status}.`, {
        status: response.status,
        data: payload,
      });
    }

    return unwrap ? unwrapApiResponse(payload) : payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('API request timed out.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  request,
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, body, method: 'POST' }),
  put: (path, body, options) => request(path, { ...options, body, method: 'PUT' }),
  patch: (path, body, options) => request(path, { ...options, body, method: 'PATCH' }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export default apiClient;
