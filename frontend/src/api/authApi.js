import apiClient from './apiClient';

export function loginWithKakaoCode({ code, redirectUri }) {
  return apiClient.post('/api/auth/kakao', { code, redirectUri }, { skipAuth: true });
}

export function refreshTokens(refreshToken) {
  return apiClient.post('/api/auth/refresh', { refreshToken }, { skipAuth: true });
}

export function completeOnboarding({ nickname, generationTag }) {
  return apiClient.post('/api/users/me/onboarding', { nickname, generationTag });
}

export async function checkNicknameAvailability(nickname) {
  const response = await apiClient.get('/api/users/nickname-check', {
    params: { nickname },
    skipAuth: true,
  });

  if (typeof response === 'boolean') {
    return response;
  }

  if (typeof response?.available === 'boolean') {
    return response.available;
  }

  if (typeof response?.isAvailable === 'boolean') {
    return response.isAvailable;
  }

  return Boolean(response);
}

export function fetchMe() {
  return apiClient.get('/api/users/me');
}
