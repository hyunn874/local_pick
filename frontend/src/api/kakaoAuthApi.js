import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { kakaoConfig } from './kakaoConfig';

WebBrowser.maybeCompleteAuthSession();

const KAKAO_DISCOVERY = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
};
const CANCELLED_RESULT_TYPES = new Set(['cancel', 'dismiss', 'locked']);

function createAuthCancelledError() {
  const error = new Error('Kakao login was cancelled.');
  error.isAuthCancelled = true;

  return error;
}

function getKakaoRedirectUri() {
  return kakaoConfig.redirectUri;
}

export async function signInWithKakao() {
  if (!kakaoConfig.restApiKey) {
    throw new Error('Kakao REST API key is not configured.');
  }

  // 이전 인증 세션이 남아 있으면 promptAsync 가
  // "Another web browser is already open" 으로 실패한다.
  // dismissAuthSession 은 플랫폼에 따라 Promise 를 반환하지 않으므로
  // 반환값에 .catch() 를 걸지 않고 try/catch 로 감싼다.
  try {
    await WebBrowser.dismissAuthSession();
  } catch {
    // 닫을 세션이 없으면 무시한다
  }

  const redirectUri = getKakaoRedirectUri();

  const request = new AuthSession.AuthRequest({
    clientId: kakaoConfig.restApiKey,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: false,
  });

  const result = await request.promptAsync(KAKAO_DISCOVERY);

  if (result.type === 'error') {
    throw new Error(
      result.params?.error_description || result.params?.error || 'Kakao login failed.',
    );
  }

  if (CANCELLED_RESULT_TYPES.has(result.type)) {
    throw createAuthCancelledError();
  }

  if (result.type !== 'success') {
    throw new Error('Kakao login failed.');
  }

  if (!result.params.code) {
    throw new Error('Kakao authorization code was not returned.');
  }

  return {
    code: result.params.code,
    redirectUri,
  };
}
