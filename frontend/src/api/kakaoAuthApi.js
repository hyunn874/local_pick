import * as AuthSession from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { kakaoConfig } from './kakaoConfig';

WebBrowser.maybeCompleteAuthSession();

const KAKAO_TOKEN_KEY = 'localpick.kakaoAccessToken';
const KAKAO_DISCOVERY = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
};

function getKakaoRedirectUri() {
  const hasExplicitRedirectUri = Boolean(process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI);

  if (!hasExplicitRedirectUri && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return AuthSession.makeRedirectUri({
      path: 'auth/kakao',
      preferLocalhost: true,
    });
  }

  return kakaoConfig.redirectUri;
}

export async function signInWithKakao() {
  if (!kakaoConfig.restApiKey) {
    throw new Error('Kakao REST API key is not configured.');
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

  if (result.type !== 'success' || !result.params.code) {
    return null;
  }

  const response = await fetch(KAKAO_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: kakaoConfig.restApiKey,
      redirect_uri: redirectUri,
      code: result.params.code,
    }).toString(),
  });

  const token = await response.json();

  if (!response.ok || !token.access_token) {
    throw new Error(token.error_description || token.error || 'Kakao login failed.');
  }

  await SecureStore.setItemAsync(KAKAO_TOKEN_KEY, token.access_token);

  return token;
}

export function getStoredKakaoAccessToken() {
  return SecureStore.getItemAsync(KAKAO_TOKEN_KEY);
}

export function signOutFromKakao() {
  return SecureStore.deleteItemAsync(KAKAO_TOKEN_KEY);
}
