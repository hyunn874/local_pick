import * as WebBrowser from 'expo-web-browser';

import { API_BASE_URL } from './apiClient';

WebBrowser.maybeCompleteAuthSession();

// 서버가 로그인 처리 후 앱으로 되돌아올 때 쓰는 딥링크.
// 카카오 콘솔에 등록하는 리다이렉트 URI 가 아니다.
// 카카오는 http(s) 만 허용하므로 앱 스킴은 등록할 수 없고,
// 서버가 콜백을 받아 처리한 뒤 이 스킴으로 결과를 넘겨준다.
const APP_REDIRECT_URI = 'localpick://auth/kakao';

function createAuthCancelledError() {
  const error = new Error('Kakao login was cancelled.');
  error.isAuthCancelled = true;
  return error;
}

/**
 * 딥링크의 쿼리스트링을 직접 파싱한다.
 * localpick:// 는 표준 URL 파서가 제대로 다루지 못하는 경우가 있고,
 * expo-linking 을 따로 받지 않기 위해 ? 뒤만 잘라서 읽는다.
 */
function parseQueryParams(url) {
  const queryStart = url.indexOf('?');

  if (queryStart === -1) {
    return {};
  }

  const params = new URLSearchParams(url.slice(queryStart + 1));
  const result = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

/**
 * 카카오 로그인.
 *
 * 앱은 카카오와 직접 통신하지 않는다. 서버의 authorize 주소만 열면
 * 서버가 카카오 인증 → 토큰 교환 → 가입/로그인 → JWT 발급까지 처리하고
 * localpick://auth/kakao?accessToken=...&refreshToken=... 로 돌려준다.
 * 덕분에 REST API 키와 클라이언트 시크릿이 앱 번들에 들어가지 않는다.
 */
export async function signInWithKakao() {
  // 이전 인증 세션이 남아 있으면 "Another web browser is already open" 으로 실패한다.
  // dismissAuthSession 은 플랫폼에 따라 Promise 를 반환하지 않으므로 try/catch 로 감싼다.
  try {
    await WebBrowser.dismissAuthSession();
  } catch {
    // 닫을 세션이 없으면 무시한다
  }

  const result = await WebBrowser.openAuthSessionAsync(
    `${API_BASE_URL}/api/auth/kakao/authorize`,
    APP_REDIRECT_URI,
  );

  if (result.type !== 'success' || !result.url) {
    throw createAuthCancelledError();
  }

  const queryParams = parseQueryParams(result.url);

  if (queryParams?.error) {
    throw new Error(queryParams.message || queryParams.error);
  }

  if (!queryParams?.accessToken || !queryParams?.refreshToken) {
    throw new Error('로그인 토큰을 받지 못했습니다.');
  }

  return {
    accessToken: queryParams.accessToken,
    refreshToken: queryParams.refreshToken,
    // 쿼리스트링이라 모두 문자열로 들어온다.
    isNewUser: queryParams.isNewUser === 'true',
    isOnboarded: queryParams.isOnboarded === 'true',
  };
}
