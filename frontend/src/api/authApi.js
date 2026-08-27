import apiClient from './apiClient';

function normalizeLoginResponse(authData) {
  const member = authData?.member || authData?.user || {};
  const isNewMember = Boolean(authData?.isNewMember ?? authData?.isNewUser);

  return {
    accessToken: authData?.accessToken ?? null,
    refreshToken: authData?.refreshToken ?? null,
    isNewMember,
    isNewUser: isNewMember,
    isOnboarded: !isNewMember,
    user: {
      ...member,
      id: member.id ?? authData?.memberId ?? authData?.userId,
      memberId: authData?.memberId ?? member.memberId ?? member.id,
      nickname: member.nickname ?? authData?.nickname ?? '로컬픽 사용자',
      isResidentVerified: Boolean(member.isResidentVerified),
      localPassBalance: member.localPassBalance ?? 0,
    },
  };
}

export function loginWithKakaoCode({ code, redirectUri }) {
  return apiClient.post('/api/auth/kakao', { code, redirectUri }, { skipAuth: true });
}

export async function loginWithAppleIdentityToken(identityToken) {
  const authData = await apiClient.post(
    '/api/auth/apple',
    { identityToken },
    { skipAuth: true },
  );

  return normalizeLoginResponse(authData);
}

export function refreshTokens(refreshToken) {
  return apiClient.post('/api/auth/refresh', { refreshToken }, { skipAuth: true });
}

export async function completeOnboarding({ nickname, generationTag }) {
  console.log('[온보딩] endpoint:', '/api/users/me/onboarding');
  console.log('[온보딩] 요청 데이터:', {
    nickname,
    generationTag,
  });

  try {
    const data = await apiClient.post('/api/users/me/onboarding', {
      nickname,
      generationTag,
    });

    return data?.member ?? data;
  } catch (error) {
    console.error('[온보딩] 에러 상태:', error.status);
    console.error('[온보딩] 에러 메시지:', error.message);
    console.error('[온보딩] 에러 전체:', JSON.stringify(error));
    throw error;
  }
}

export function deleteMyAccount() {
  return apiClient.delete('/api/users/me');
}

export function verifyResident({ sidoName, sigunguName }) {
  return apiClient.post('/api/auth/resident-verify', { sidoName, sigunguName });
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
