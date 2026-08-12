import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { kakaoConfig } from './kakaoConfig';

WebBrowser.maybeCompleteAuthSession();

const KAKAO_TOKEN_KEY = 'localpick.kakaoAccessToken';
const KAKAO_DISCOVERY = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
};

export async function signInWithKakao() {
  if (!kakaoConfig.restApiKey) {
    throw new Error('Kakao REST API key is not configured.');
  }

  const request = new AuthSession.AuthRequest({
    clientId: kakaoConfig.restApiKey,
    redirectUri: kakaoConfig.redirectUri,
    responseType: AuthSession.ResponseType.Code,
  });

  const result = await request.promptAsync(KAKAO_DISCOVERY);

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
      redirect_uri: kakaoConfig.redirectUri,
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
